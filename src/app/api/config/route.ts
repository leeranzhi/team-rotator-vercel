import { NextResponse } from 'next/server';
import { getSystemConfigs, saveSystemConfig } from '@/lib/db';
import { SystemConfig } from '@/types';

export async function GET() {
  try {
    const configs = await getSystemConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching system configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const config: SystemConfig = await request.json();
    const savedConfig = await saveSystemConfig(config);
    return NextResponse.json(savedConfig);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
} 