import { Member, Task, TaskAssignment } from '@/types';
import { getMembers, getTasks, getTaskAssignments, updateTaskAssignment } from './db';
import { isWorkingDay } from './holiday';
import { logger } from './logger';

export function getNextDayAfterTargetDay(start: Date, targetDay: number): Date {
  const daysToAdd = (targetDay - start.getDay() + 7) % 7;
  const daysToAddWithExtra = daysToAdd === 0 ? 7 : daysToAdd;
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + daysToAddWithExtra);
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

// 获取指定日期所在周的周一
function getMondayOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - (monday.getDay() - 1 + 7) % 7);
  return monday;
}

export async function calculateNextRotationDates(task: Task, fromDate: Date): Promise<{ startDate: Date; endDate: Date }> {
  if (task.rotationRule === 'daily') {
    const nextWorkingDay = await findNextWorkingDay(fromDate);
    return { startDate: nextWorkingDay, endDate: nextWorkingDay };
  }

  const parts = task.rotationRule.split('_');
  if (!parts || parts.length !== 2) {
    throw new Error(`Invalid rotation rule: ${task.rotationRule}`);
  }

  const [frequency, dayOfWeekStr] = parts;
  const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .indexOf(dayOfWeekStr.toLowerCase());

  if (targetDay === -1) {
    throw new Error(`Invalid day in rotation rule: ${dayOfWeekStr}`);
  }

  let startDate: Date, endDate: Date;

  switch (frequency) {
    case 'weekly': {
      // 对于weekly任务（如Standup和Tech huddle），从当前结束日期的下一个工作日开始
      startDate = await findNextWorkingDay(fromDate);
      
      // 找到下一个目标日期（周五）作为结束日期
      endDate = getNextDayAfterTargetDay(startDate, targetDay);
      break;
    }
    case 'biweekly': {
      // 对于biweekly任务（如English corner和Retro），从当前结束日期的下一个工作日开始
      startDate = await findNextWorkingDay(fromDate);
      
      // 找到下一个目标日期（周四或周三）
      endDate = getNextDayAfterTargetDay(startDate, targetDay);
      
      // 如果下一个目标日期比开始日期早，说明需要再往后找一周
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 7);
      }
      
      // 再加一周，确保是两周的周期
      endDate.setDate(endDate.getDate() + 7);
      break;
    }
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
  
  return { startDate, endDate };
}

function rotateMemberList(currentMemberId: number, members: Member[], rotations: number): number {
  const sortedMembers = [...members].sort((a, b) => a.id - b.id);
  const currentIndex = sortedMembers.findIndex(m => m.id === currentMemberId);
  if (currentIndex === -1) {
    throw new Error('Current member not found');
  }
  return sortedMembers[(currentIndex + rotations) % sortedMembers.length].id;
}

async function shouldRotateToday(task: Task, today: Date): Promise<boolean> {
  // 首先检查是否是工作日
  if (!(await isWorkingDay(today))) {
    logger.info(`${today.toISOString().split('T')[0]} is not a working day, skipping rotation check`);
    return false;
  }

  // 只要是工作日就可以进行轮换检查
  return true;
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

    const endDate = new Date(assignment.endDate);

    logger.info(`Checking assignment ${assignment.id}:
      Task: ${task.name} (${task.rotationRule})
      Current period: ${assignment.startDate} - ${assignment.endDate}
      Current member: ${assignment.memberId}
      Today: ${today.toISOString().split('T')[0]}`);

    // 检查是否需要今天轮换
    if (!(await shouldRotateToday(task, today))) {
      logger.info(`Not rotation day for task ${task.name}, skipping`);
      continue;
    }

    // 如果当前分配还未结束，不需要轮换
    if (today <= endDate) {
      logger.info(`Assignment ${assignment.id} is still current, skipping`);
      continue;
    }

    // 计算新的轮换周期
    const { startDate: newStartDate, endDate: newEndDate } = await calculateNextRotationDates(task, endDate);

    // 计算新的成员（对于所有类型的任务都向前轮换一位）
    const newMemberId = rotateMemberList(assignment.memberId, members, 1);

    logger.info(`Updating assignment ${assignment.id}:
      Task: ${task.name}
      Current: ${assignment.startDate} - ${assignment.endDate} (Member: ${assignment.memberId})
      New: ${newStartDate.toISOString().split('T')[0]} - ${newEndDate.toISOString().split('T')[0]} (Member: ${newMemberId})`);

    await updateTaskAssignment({
      ...assignment,
      memberId: newMemberId,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }
} 