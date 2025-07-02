import { NextResponse } from 'next/server';
import { updateAssignmentsOnly, sendNotificationOnly } from '@/services/assignments';

export async function GET() {
  try {
    // 先更新任务分配
    const updateResult = await updateAssignmentsOnly({ 
      checkWorkingDay: true
    });

    // 如果不是工作日，直接返回
    if (updateResult.message === 'Not a working day, skipping update') {
      return NextResponse.json({ message: updateResult.message });
    }

    // 再发送通知
    await sendNotificationOnly();
    
    return NextResponse.json({ message: 'Cron job completed successfully' });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to execute cron job' },
      { status: 500 }
    );
  }
} 