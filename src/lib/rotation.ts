import { Member, Task, TaskAssignment } from '@/types';
import { getMembers, getTasks, getTaskAssignments, updateTaskAssignment } from './db';
import { isWorkingDay } from './holiday';

export function getNextDayAfterTargetDay(start: Date, targetDay: number): Date {
  const daysToAdd = (targetDay - start.getDay() + 7) % 7;
  const daysToAddWithExtra = daysToAdd === 0 ? 7 : daysToAdd;
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + daysToAddWithExtra);
  // 额外加一天，与原项目保持一致
  targetDate.setDate(targetDate.getDate() + 1);
  return targetDate;
}

export function calculateNextRotationDates(rule: string, fromDate: Date): { startDate: Date; endDate: Date } {
  if (rule === 'daily') {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 1);
    return { startDate: next, endDate: next };
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

function rotateMemberList(currentMemberId: number, members: Member[]): number {
  const sortedMembers = [...members].sort((a, b) => a.id - b.id);
  const currentIndex = sortedMembers.findIndex(m => m.id === currentMemberId);
  if (currentIndex === -1) {
    throw new Error('Current member not found');
  }
  return sortedMembers[(currentIndex + 1) % sortedMembers.length].id;
}

export async function updateTaskAssignments(): Promise<void> {
  const [tasks, members, assignments] = await Promise.all([
    getTasks(),
    getMembers(),
    getTaskAssignments(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const assignment of assignments) {
    const task = tasks.find(t => t.id === assignment.taskId);
    if (!task) continue;

    const startDate = new Date(assignment.startDate);
    const endDate = new Date(assignment.endDate);

    if (today <= endDate) continue;

    // 使用当前日期作为基准来计算下一个轮转周期
    const { startDate: newStartDate, endDate: newEndDate } = calculateNextRotationDates(
      task.rotationRule,
      today
    );

    // 对于每日任务，检查是否是工作日
    if (task.rotationRule === 'daily' && !(await isWorkingDay(today))) {
      console.log(`${today.toISOString().split('T')[0]} is not a working day. Skipping member rotation for AssignmentId ${assignment.id}`);
      continue;
    }

    const newMemberId = rotateMemberList(assignment.memberId, members);

    await updateTaskAssignment({
      ...assignment,
      memberId: newMemberId,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }
} 