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

export function calculateEndDate(rule: string, startDate: Date): Date {
  if (rule === 'daily') {
    return new Date(startDate);
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

  switch (frequency) {
    case 'weekly': {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      return endDate;
    }
    case 'biweekly': {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      return endDate;
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
    startDate.setHours(0, 0, 0, 0);

    // 如果开始日期在今天之后，不需要更新
    if (startDate > today) continue;

    // 计算正确的结束日期
    const endDate = calculateEndDate(task.rotationRule, startDate);

    // 如果今天超过了结束日期，需要轮转到下一个人
    if (today > endDate) {
      const newMemberId = rotateMemberList(assignment.memberId, members);
      const newStartDate = new Date(today);
      const newEndDate = calculateEndDate(task.rotationRule, newStartDate);

      // 对于每日任务，检查是否是工作日
      if (task.rotationRule === 'daily' && !(await isWorkingDay(newStartDate))) {
        console.log(`${newStartDate.toISOString().split('T')[0]} is not a working day. Skipping member rotation for AssignmentId ${assignment.id}`);
        continue;
      }

      await updateTaskAssignment({
        ...assignment,
        memberId: newMemberId,
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0],
      });
    } else {
      // 只更新结束日期
      if (assignment.endDate !== endDate.toISOString().split('T')[0]) {
        await updateTaskAssignment({
          ...assignment,
          endDate: endDate.toISOString().split('T')[0],
        });
      }
    }
  }
} 