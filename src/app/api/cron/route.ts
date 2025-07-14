import { NextResponse } from 'next/server';
import { updateRotation } from '@/services/assignments';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Add request ID for tracking
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Starting cron job for rotation update...`);
    
    // Log the current time and environment
    logger.info(`[${requestId}] Execution time: ${new Date().toISOString()}`);
    logger.info(`[${requestId}] Environment: ${process.env.VERCEL_ENV || 'local'}`);
    
    // Execute rotation
    const result = await updateRotation();
    
    // Log detailed results
    logger.info(`[${requestId}] Rotation update completed with result: ${JSON.stringify(result)}`);
    
    return NextResponse.json({ 
      message: 'Cron job executed successfully', 
      requestId,
      executionTime: new Date().toISOString(),
      result 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cron job failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 