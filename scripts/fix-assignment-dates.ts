import { getTaskAssignments, updateTaskAssignment } from '@/lib/db';
import { calculateNextRotationDates } from '@/lib/rotation';
import { getTasks } from '@/lib/db';

async function main() {
  try {
    console.log('Starting to fix assignment dates...');
    
    const [assignments, tasks] = await Promise.all([
      getTaskAssignments(),
      getTasks()
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const assignment of assignments) {
      const task = tasks.find(t => t.id === assignment.taskId);
      if (!task) {
        console.warn(`Task not found for assignment ${assignment.id}`);
        continue;
      }

      // Calculate new dates starting from today
      const { startDate, endDate } = await calculateNextRotationDates(task, today);

      console.log(`Updating assignment ${assignment.id}:
        Task: ${task.name}
        Current: ${assignment.startDate} - ${assignment.endDate}
        New: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

      await updateTaskAssignment({
        ...assignment,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    }

    console.log('Successfully fixed assignment dates');
  } catch (error) {
    console.error('Error fixing assignment dates:', error);
    process.exit(1);
  }
}

main(); 