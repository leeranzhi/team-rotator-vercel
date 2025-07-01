import { NextResponse } from 'next/server';
import { getTaskAssignmentsWithDetails, getSystemConfigs } from '@/lib/db';
import { getSlackMessage, sendToSlack, sendErrorToSlack } from '@/services/assignments';

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
    console.error('Error sending message to Slack:', error);
    await sendErrorToSlack(error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to send message to Slack' },
      { status: 500 }
    );
  }
} 