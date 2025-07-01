import { NextResponse } from 'next/server';
import { updateAndNotifyAssignments } from '@/services/assignments';

export async function POST() {
  try {
    const result = await updateAndNotifyAssignments();
    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Error updating task assignments:', error);
    return NextResponse.json(
      { error: 'Failed to update task assignments' },
      { status: 500 }
    );
  }
} 