import { NextResponse } from 'next/server';
import { getTaskAssignments, updateTaskAssignment, getTasks } from '@/lib/db';
import { calculateNextRotationDates } from '@/lib/rotation';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('Starting to fix assignment dates...');
    
    const [assignments, tasks] = await Promise.all([
      getTaskAssignments(),
      getTasks()
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];
    for (const assignment of assignments) {
      const task = tasks.find(t => t.id === assignment.taskId);
      if (!task) {
        logger.warn(`Task not found for assignment ${assignment.id}`);
        continue;
      }

      // Calculate new dates starting from today
      const { startDate, endDate } = await calculateNextRotationDates(task, today);

      logger.info(`Updating assignment ${assignment.id}:
        Task: ${task.name}
        Current: ${assignment.startDate} - ${assignment.endDate}
        New: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

      await updateTaskAssignment({
        ...assignment,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      results.push({
        id: assignment.id,
        taskName: task.name,
        oldStartDate: assignment.startDate,
        oldEndDate: assignment.endDate,
        newStartDate: startDate.toISOString().split('T')[0],
        newEndDate: endDate.toISOString().split('T')[0],
      });
    }

    logger.info('Successfully fixed assignment dates');
    return NextResponse.json({ 
      message: 'Successfully fixed assignment dates',
      results 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fixing assignment dates: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 