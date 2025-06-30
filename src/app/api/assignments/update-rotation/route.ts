import { NextResponse } from 'next/server';
import { updateTaskAssignments } from '@/lib/rotation';

export async function POST() {
  try {
    await updateTaskAssignments();
    return NextResponse.json({ message: 'Task assignments updated successfully' });
  } catch (error) {
    console.error('Error updating task assignments:', error);
    return NextResponse.json(
      { error: 'Failed to update task assignments' },
      { status: 500 }
    );
  }
} 