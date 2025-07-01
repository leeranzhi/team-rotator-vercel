import { NextResponse } from 'next/server';
import { updateAndNotifyAssignments } from '@/services/assignments';

export async function GET() {
  try {
    const result = await updateAndNotifyAssignments({ 
      checkWorkingDay: true
    });
    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to execute cron job' },
      { status: 500 }
    );
  }
} 