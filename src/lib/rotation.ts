import { Member, Task, TaskAssignment } from '@/types';
import { getMembers, getTasks, getTaskAssignments, updateTaskAssignment } from './db';
import { isWorkingDay } from './holiday';
import { logger } from './logger';

export function getNextDayAfterTargetDay(start: Date, targetDay: number): Date {
  const daysToAdd = (targetDay - start.getDay() + 7) % 7;
  const daysToAddWithExtra = daysToAdd === 0 ? 7 : daysToAdd;
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + daysToAddWithExtra);
  // 额外加一天，与原项目保持一致
  targetDate.setDate(targetDate.getDate() + 1);
  return targetDate;
}

async function findNextWorkingDay(fromDate: Date): Promise<Date> {
  const next = new Date(fromDate);
  next.setDate(next.getDate() + 1);
  
  while (!(await isWorkingDay(next))) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

export async function calculateNextRotationDates(rule: string, fromDate: Date): Promise<{ startDate: Date; endDate: Date }> {
  if (rule === 'daily') {
    const nextWorkingDay = await findNextWorkingDay(fromDate);
    return { startDate: nextWorkingDay, endDate: nextWorkingDay };
  }

  const parts = rule?.split('_');
  if (!parts || parts.length !== 2) {
    throw new Error(`Invalid rotation rule: ${rule}`);
  }

  const [frequency, dayOfWeekStr] = parts;
  const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .indexOf(dayOfWeekStr.toLowerCase());

  if (targetDay === -1) {
    throw new Error(`Invalid day in rotation rule: ${dayOfWeekStr}`);
  }

  const firstTargetDayAfter = getNextDayAfterTargetDay(fromDate, targetDay);

  switch (frequency) {
    case 'weekly': {
      const endDate = new Date(firstTargetDayAfter);
      endDate.setDate(endDate.getDate() + 6);
      return { startDate: firstTargetDayAfter, endDate };
    }
    case 'biweekly': {
      const secondTargetDay = getNextDayAfterTargetDay(firstTargetDayAfter, targetDay);
      const endDate = new Date(secondTargetDay);
      endDate.setDate(endDate.getDate() + 13);
      return { startDate: secondTargetDay, endDate };
    }
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

function rotateMemberList(currentMemberId: number, members: Member[], rotations: number): number {
  const sortedMembers = [...members].sort((a, b) => a.id - b.id);
  const currentIndex = sortedMembers.findIndex(m => m.id === currentMemberId);
  if (currentIndex === -1) {
    throw new Error('Current member not found');
  }
  return sortedMembers[(currentIndex + rotations) % sortedMembers.length].id;
}

async function countWorkingDaysBetween(startDate: Date, endDate: Date): Promise<number> {
  let count = 0;
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start from the next day

  while (current <= endDate) {
    if (await isWorkingDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

async function calculateRotations(task: Task, startDate: Date, endDate: Date): Promise<number> {
  if (task.rotationRule === 'daily') {
    // 对于每日任务，计算工作日数量
    const workingDays = await countWorkingDaysBetween(startDate, endDate);
    logger.info(`Calculated ${workingDays} working days between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    return workingDays;
  }

  // 对于每周或每两周的任务，计算完整周期数
  const parts = task.rotationRule.split('_');
  if (parts.length !== 2) {
    throw new Error(`Invalid rotation rule: ${task.rotationRule}`);
  }

  const [frequency] = parts;
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let rotations = 0;
  switch (frequency) {
    case 'weekly':
      rotations = Math.floor(daysDiff / 7);
      break;
    case 'biweekly':
      rotations = Math.floor(daysDiff / 14);
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  logger.info(`Calculated ${rotations} rotations for ${task.rotationRule} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  return rotations;
}

export async function updateTaskAssignments(): Promise<void> {
  logger.info('Starting task assignments update');
  
  const [tasks, members, assignments] = await Promise.all([
    getTasks(),
    getMembers(),
    getTaskAssignments(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const assignment of assignments) {
    const task = tasks.find(t => t.id === assignment.taskId);
    if (!task) {
      logger.warn(`Task not found for assignment ${assignment.id}`);
      continue;
    }

    const startDate = new Date(assignment.startDate);
    const endDate = new Date(assignment.endDate);

    logger.info(`Checking assignment ${assignment.id}:
      Task: ${task.name} (${task.rotationRule})
      Current period: ${assignment.startDate} - ${assignment.endDate}
      Current member: ${assignment.memberId}
      Today: ${today.toISOString().split('T')[0]}`);

    if (today <= endDate) {
      logger.info(`Assignment ${assignment.id} is still current, skipping`);
      continue;
    }

    // 计算从上一个任务结束到今天之间需要轮换的次数
    const rotations = await calculateRotations(task, endDate, today);
    
    if (rotations <= 0) {
      logger.info(`No rotations needed for assignment ${assignment.id} (${task.name})`);
      continue;
    }

    // 使用当前 assignment 的 endDate 作为基准来计算下一个轮转周期
    const { startDate: newStartDate, endDate: newEndDate } = await calculateNextRotationDates(
      task.rotationRule,
      endDate
    );

    // 根据轮换次数计算新的成员
    const newMemberId = rotateMemberList(assignment.memberId, members, rotations);

    logger.info(`Updating assignment ${assignment.id}:
      Task: ${task.name}
      Current: ${assignment.startDate} - ${assignment.endDate} (Member: ${assignment.memberId})
      New: ${newStartDate.toISOString().split('T')[0]} - ${newEndDate.toISOString().split('T')[0]} (Member: ${newMemberId})
      Rotations: ${rotations}`);

    await updateTaskAssignment({
      ...assignment,
      memberId: newMemberId,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }
} 