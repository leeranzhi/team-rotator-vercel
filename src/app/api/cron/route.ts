import { NextResponse } from 'next/server';
import { updateTaskAssignments } from '@/lib/rotation';
import { getTaskAssignmentsWithDetails, getSystemConfigs } from '@/lib/db';
import { isWorkingDay } from '@/lib/holiday';

async function sendToSlack(webhookUrl: string, assignments: any[], isError: boolean = false) {
  const today = new Date();
  const currentAssignments = assignments.filter(assignment => {
    const startDate = new Date(assignment.startDate);
    const endDate = new Date(assignment.endDate);
    return today >= startDate && today <= endDate;
  });

  if (currentAssignments.length === 0 && !isError) {
    return;
  }

  let message;
  if (isError) {
    message = {
      text: assignments.join('\n'),
    };
  } else {
    message = {
      text: "Today's Task Assignments:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Today's Task Assignments:*"
          }
        },
        ...currentAssignments.map(assignment => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• *${assignment.taskName}*: <@${assignment.slackMemberId}>`
          }
        }))
      ]
    };
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

export async function GET() {
  try {
    // 检查是否是工作日
    if (!await isWorkingDay()) {
      return NextResponse.json({ message: 'Not a working day, skipping update' });
    }

    // 更新任务分配
    await updateTaskAssignments();

    // 获取 Webhook URLs
    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
    const webhookUrl = webhookConfig?.value;

    if (webhookUrl) {
      // 获取最新的任务分配并发送到 Slack
      const assignments = await getTaskAssignmentsWithDetails();
      await sendToSlack(webhookUrl, assignments);
    }

    return NextResponse.json({ message: 'Cron job completed successfully' });
  } catch (error) {
    console.error('Error in cron job:', error);
    
    // 发送错误消息到 Slack
    try {
      const configs = await getSystemConfigs();
      const personalWebhookConfig = configs.find(c => c.key === 'Slack:PersonalWebhookUrl');
      const personalWebhookUrl = personalWebhookConfig?.value;

      if (personalWebhookUrl) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await sendToSlack(personalWebhookUrl, [`Failed to execute cron job: ${errorMessage}`], true);
      }
    } catch (slackError) {
      console.error('Failed to send error message to Slack:', slackError);
    }

    return NextResponse.json(
      { error: 'Failed to execute cron job' },
      { status: 500 }
    );
  }
} 