import { NextResponse } from 'next/server';
import { getTaskAssignmentsWithDetails, getSystemConfigs } from '@/lib/db';
import { getSlackMessage, sendToSlack } from '@/services/assignments';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const assignments = await getTaskAssignmentsWithDetails();
    const message = await getSlackMessage(assignments);
    
    if (!message) {
      return NextResponse.json(
        { error: 'No assignments found to send to Slack' },
        { status: 404 }
      );
    }

    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
    const webhookUrl = webhookConfig?.value;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Slack webhook URL is not configured' },
        { status: 400 }
      );
    }

    await sendToSlack(webhookUrl, message);
    return NextResponse.json({ message: 'Successfully sent message to Slack' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error sending message to Slack: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to send message to Slack' },
      { status: 500 }
    );
  }
} 