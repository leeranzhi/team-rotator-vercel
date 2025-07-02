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

export function calculateCurrentPeriodDates(rule: string, today: Date): { startDate: Date; endDate: Date } {
  // 确保使用当前年份
  const currentYear = new Date().getFullYear();
  
  if (rule === 'daily') {
    // 对于每日任务，直接使用今天的日期，但确保年份正确
    const todayStr = today.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);
    todayDate.setFullYear(currentYear);
    return { startDate: todayDate, endDate: todayDate };
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

  // 找到今天所在周的目标日期
  let periodStartDate = new Date(today);
  const todayDay = today.getDay();
  const daysToSubtract = (todayDay - targetDay + 7) % 7;
  periodStartDate.setDate(today.getDate() - daysToSubtract);

  // 对于双周任务，我们需要找到正确的双周开始日期
  if (frequency === 'biweekly') {
    // 获取一个已知的基准日期（比如2024-01-04，这是一个双周的开始日期）
    const referenceDate = new Date('2024-01-04');  // 这是一个周四，作为双周的开始
    
    // 计算当前日期和基准日期之间的天数差
    const diffTime = periodStartDate.getTime() - referenceDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // 计算当前日期是在哪个双周期内
    const weekNum = Math.floor(diffDays / 7);
    const isEvenWeek = weekNum % 2 === 0;
    
    // 如果是奇数周，需要往前推一周找到双周期的开始
    if (!isEvenWeek) {
      periodStartDate.setDate(periodStartDate.getDate() - 7);
    }
  }

  // 计算结束日期
  const endDate = new Date(periodStartDate);
  if (frequency === 'weekly') {
    endDate.setDate(endDate.getDate() + 6);
  } else if (frequency === 'biweekly') {
    endDate.setDate(endDate.getDate() + 13);
  }

  return { startDate: periodStartDate, endDate };
}

export async function updateTaskAssignments(): Promise<void> {
  const [tasks, members, assignments] = await Promise.all([
    getTasks(),
    getMembers(),
    getTaskAssignments(),
  ]);

  // 使用当前日期，确保年份正确
  const today = new Date();
  const currentYear = today.getFullYear();
  today.setHours(0, 0, 0, 0);
  
  console.log('Processing date:', today.toISOString());

  for (const assignment of assignments) {
    const task = tasks.find(t => t.id === assignment.taskId);
    if (!task) continue;

    console.log(`\nProcessing task: ${task.name} (${task.rotationRule})`);

    // 计算当前周期的正确日期范围
    const { startDate: correctStartDate, endDate: correctEndDate } = calculateCurrentPeriodDates(
      task.rotationRule,
      today
    );

    // 确保当前分配的日期使用正确的年份
    const currentStartDate = new Date(assignment.startDate);
    currentStartDate.setFullYear(currentYear);
    currentStartDate.setHours(0, 0, 0, 0);
    
    const currentEndDate = new Date(assignment.endDate);
    currentEndDate.setFullYear(currentYear);
    currentEndDate.setHours(0, 0, 0, 0);

    console.log('Dates comparison:', {
      today: today.toISOString(),
      currentStart: currentStartDate.toISOString(),
      currentEnd: currentEndDate.toISOString(),
      correctStart: correctStartDate.toISOString(),
      correctEnd: correctEndDate.toISOString()
    });

    // 对于每日任务，如果日期不是今天，就需要更新
    const needsUpdate = task.rotationRule === 'daily' ?
      currentStartDate.getTime() !== today.getTime() :  // 对于每日任务，直接和今天比较
      currentStartDate.getTime() !== correctStartDate.getTime() ||
      currentEndDate.getTime() !== correctEndDate.getTime() ||
      today.getTime() > currentEndDate.getTime();

    console.log('Needs update:', needsUpdate);

    if (needsUpdate) {
      // 如果是每日任务且日期不是今天，或者其他任务已过期，需要轮转到下一个成员
      const needsRotation = task.rotationRule === 'daily' ?
        currentStartDate.getTime() !== today.getTime() :  // 对于每日任务，直接和今天比较
        today.getTime() > currentEndDate.getTime();

      console.log('Needs rotation:', needsRotation);

      const newMemberId = needsRotation ?
        rotateMemberList(assignment.memberId, members) :
        assignment.memberId;

      console.log('Update details:', {
        oldMemberId: assignment.memberId,
        newMemberId,
        oldStartDate: assignment.startDate,
        newStartDate: correctStartDate.toISOString().split('T')[0],
        oldEndDate: assignment.endDate,
        newEndDate: correctEndDate.toISOString().split('T')[0]
      });

      await updateTaskAssignment({
        ...assignment,
        memberId: newMemberId,
        startDate: correctStartDate.toISOString().split('T')[0],
        endDate: correctEndDate.toISOString().split('T')[0],
      });
    }
  }
} 