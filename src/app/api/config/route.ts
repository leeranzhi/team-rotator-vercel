import { NextResponse } from 'next/server';
import { getSystemConfigs, saveSystemConfig } from '@/lib/db';
import { SystemConfig } from '@/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const configs = await getSystemConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fetching system configs: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch system configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const config: SystemConfig = await request.json();
    logger.info('Saving system config', { config });
    
    await saveSystemConfig(config);
    
    // 获取更新后的配置
    const updatedConfigs = await getSystemConfigs();
    const savedConfig = updatedConfigs.find(c => c.key === config.key);
    
    if (!savedConfig) {
      logger.warn('Config saved but not found in updated configs', { config });
      return NextResponse.json(
        { message: 'Config saved successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(savedConfig);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error saving system config: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
} 