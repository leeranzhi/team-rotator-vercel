import { Member, Task, TaskAssignment } from '@/types';
import { getMembers, getTasks, getTaskAssignments, updateTaskAssignment } from './db';
import { isWorkingDay } from './holiday';

export function getNextDayAfterTargetDay(start: Date, targetDay: number): Date {
  const daysToAdd = (targetDay - start.getDay() + 7) % 7;
  const daysToAddWithExtra = daysToAdd === 0 ? 7 : daysToAdd;
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + daysToAddWithExtra);
  return targetDate;
}

export function calculateNextRotationDates(rule: string, fromDate: Date, currentStartDate: string): { startDate: Date; endDate: Date } {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  if (rule === 'daily') {
    // 如果当前开始日期是未来日期，保持不变
    const currentStart = new Date(currentStartDate);
    currentStart.setHours(0, 0, 0, 0);
    
    if (currentStart >= today) {
      return { 
        startDate: currentStart,
        endDate: currentStart 
      };
    }
    
    // 否则，设置为今天
    const startDate = new Date(today);
    const endDate = new Date(startDate);
    return { startDate, endDate };
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

  // 找到下一个目标日期
  const nextTargetDay = getNextDayAfterTargetDay(today, targetDay);

  switch (frequency) {
    case 'weekly': {
      const startDate = nextTargetDay;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // 持续一周
      return { startDate, endDate };
    }
    case 'biweekly': {
      const startDate = nextTargetDay;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 13); // 持续两周
      return { startDate, endDate };
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

    const currentEndDate = new Date(assignment.endDate);
    currentEndDate.setHours(0, 0, 0, 0);

    // 如果当前分配还没结束，跳过
    if (today <= currentEndDate) continue;

    // 计算下一个轮转周期的日期
    const { startDate: newStartDate, endDate: newEndDate } = calculateNextRotationDates(
      task.rotationRule,
      today,
      assignment.startDate
    );

    // 对于每日任务，检查是否是工作日
    if (task.rotationRule === 'daily' && !(await isWorkingDay(newStartDate))) {
      console.log(`${newStartDate.toISOString().split('T')[0]} is not a working day. Skipping member rotation for AssignmentId ${assignment.id}`);
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