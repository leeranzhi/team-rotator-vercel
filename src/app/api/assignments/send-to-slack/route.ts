import { NextResponse } from 'next/server';
import { getTaskAssignmentsWithDetails, getSystemConfigs } from '@/lib/db';

async function getSlackMessage() {
  const assignments = await getTaskAssignmentsWithDetails();
  if (!assignments || assignments.length === 0) {
    return null;
  }

  // 按照 ID 排序
  const sortedAssignments = assignments.sort((a, b) => a.id - b.id);
  const messageBuilder = [];

  for (const assignment of sortedAssignments) {
    messageBuilder.push(`${assignment.taskName}: <@${assignment.slackMemberId}>\n`);

    // 特殊处理 English word 任务
    if (assignment.taskName === "English word") {
      const members = assignments
        .map(a => ({ id: a.memberId, slackMemberId: a.slackMemberId }))
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => a.id - b.id);

      const currentMemberIndex = members.findIndex(m => m.id === assignment.memberId);
      if (currentMemberIndex !== -1) {
        const nextOneMember = members[(currentMemberIndex + 1) % members.length];
        const nextTwoMember = members[(currentMemberIndex + 2) % members.length];

        messageBuilder.push(`English word(Day + 1): <@${nextOneMember.slackMemberId}>\n`);
        messageBuilder.push(`English word(Day + 2): <@${nextTwoMember.slackMemberId}>\n`);
      }
    }
  }

  return messageBuilder.join('');
}

async function sendFailedMessageToSlack(failedMessage: string) {
  try {
    console.log('Sending failure message to Slack...');

    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:PersonalWebhookUrl');
    const webhookUrl = webhookConfig?.value;

    if (!webhookUrl) {
      console.warn('Personal Slack webhook URL is not configured');
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: failedMessage }),
    });

    if (response.ok) {
      console.log('Failure message sent to Slack!');
    } else {
      console.error(`Failed to send failure message to Slack. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error('An error occurred while sending failure message to Slack:', error);
  }
}

export async function POST() {
  try {
    const message = await getSlackMessage();
    if (!message) {
      return NextResponse.json(
        { error: 'No assignments found to send to Slack' },
        { status: 404 }
      );
    }

    // Get webhook URL directly from the database
    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
    const webhookUrl = webhookConfig?.value;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Slack webhook URL is not configured' },
        { status: 400 }
      );
    }

    const body = JSON.stringify({ text: message });
    
    // Add logging
    console.log('Sending Slack message with:');
    console.log('Webhook URL:', webhookUrl);
    console.log('Message Body:', body);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send Slack message. Status:', response.status, 'Error:', error);
      await sendFailedMessageToSlack(`Failed to send Slack message: ${error}`);
      return NextResponse.json(
        { error: 'Failed to send message to Slack' },
        { status: 500 }
      );
    }

    console.log('Successfully sent Slack message');
    return NextResponse.json({ message: 'Successfully sent message to Slack' });
  } catch (error) {
    console.error('Error sending message to Slack:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await sendFailedMessageToSlack(`Error sending message to Slack: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to send message to Slack' },
      { status: 500 }
    );
  }
} 