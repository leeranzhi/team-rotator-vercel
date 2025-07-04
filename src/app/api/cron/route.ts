import { NextResponse } from 'next/server';
import { updateRotation } from '@/services/assignments';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('Starting cron job for rotation update...');
    const result = await updateRotation();
    logger.info(`Rotation update completed with result: ${JSON.stringify(result)}`);
    return NextResponse.json({ message: 'Cron job executed successfully', result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cron job failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 