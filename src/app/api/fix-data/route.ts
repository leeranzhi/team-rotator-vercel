import { NextResponse } from 'next/server';
import { getMembers, getTasks, updateEdgeConfig } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('Starting data fix process...');
    
    // Fix members
    const members = await getMembers();
    let nextMemberId = 1;
    const fixedMembers = members.map(member => {
      if (member.id === null || member.id === undefined) {
        member.id = nextMemberId++;
      }
      return member;
    });
    
    // Fix tasks
    const tasks = await getTasks();
    let nextTaskId = 1;
    const fixedTasks = tasks.map(task => {
      if (task.id === null || task.id === undefined) {
        task.id = nextTaskId++;
      }
      return task;
    });
    
    // Update the data
    await Promise.all([
      updateEdgeConfig('members', fixedMembers),
      updateEdgeConfig('tasks', fixedTasks)
    ]);
    
    logger.info('Data fix completed successfully');
    return NextResponse.json({
      message: 'Data fix completed successfully',
      fixedMembers,
      fixedTasks
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fixing data: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 