import { getTaskAssignmentsWithDetails, getSystemConfigs, getMembers } from '@/lib/db';
import { updateTaskAssignments } from '@/lib/rotation';
import { isWorkingDay } from '@/lib/holiday';
import { Member } from '@/types';

export interface SlackMessage {
  text: string;
  blocks?: Array<{
    type: string;
    text: {
      type: string;
      text: string;
    };
  }>;
}

export async function getSlackMessage(assignments: any[]) {
  if (!assignments || assignments.length === 0) {
    return null;
  }

  // 获取所有成员并按 ID 排序
  const allMembers = await getMembers();
  const sortedMembers = allMembers.sort((a, b) => a.id - b.id);

  // 按照 ID 排序
  const sortedAssignments = assignments.sort((a, b) => a.id - b.id);
  const messageBuilder = [];

  for (const assignment of sortedAssignments) {
    messageBuilder.push(`${assignment.taskName}: <@${assignment.slackMemberId}>\n`);

    // 特殊处理 English word 任务
    if (assignment.taskName === "English word") {
      const currentMemberIndex = sortedMembers.findIndex(m => m.id === assignment.memberId);
      if (currentMemberIndex !== -1) {
        const nextOneMember = sortedMembers[(currentMemberIndex + 1) % sortedMembers.length];
        const nextTwoMember = sortedMembers[(currentMemberIndex + 2) % sortedMembers.length];

        messageBuilder.push(`English word(Day + 1): <@${nextOneMember.slackMemberId}>\n`);
        messageBuilder.push(`English word(Day + 2): <@${nextTwoMember.slackMemberId}>\n`);
      }
    }
  }

  return messageBuilder.join('');
}

export async function sendToSlack(webhookUrl: string, message: string) {
  if (!webhookUrl) {
    throw new Error('Slack webhook URL is not configured');
  }

  const body = JSON.stringify({ text: message });
  
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
    throw new Error(`Failed to send Slack message. Status: ${response.status} Error: ${error}`);
  }

  console.log('Successfully sent Slack message');
}

export async function sendErrorToSlack(error: Error | string) {
  try {
    console.log('Sending failure message to Slack...');

    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:PersonalWebhookUrl');
    const webhookUrl = webhookConfig?.value;

    if (!webhookUrl) {
      console.warn('Personal Slack webhook URL is not configured');
      return;
    }

    await sendToSlack(webhookUrl, typeof error === 'string' ? error : error.message);
  } catch (slackError) {
    console.error('Failed to send error message to Slack:', slackError);
  }
}

// 只更新任务分配，不发送通知
export async function updateAssignmentsOnly(options: { 
  checkWorkingDay?: boolean
} = {}) {
  const { checkWorkingDay = false } = options;

  try {
    // 检查是否是工作日（如果需要）
    if (checkWorkingDay && !await isWorkingDay()) {
      return { success: true, message: 'Not a working day, skipping update' };
    }

    // 更新任务分配
    await updateTaskAssignments();
    return { success: true, message: 'Task assignments updated successfully' };
  } catch (error) {
    console.error('Error in updateAssignmentsOnly:', error);
    throw error;
  }
}

// 只发送 Slack 通知
export async function sendNotificationOnly() {
  try {
    console.log('Getting system configs for Slack notification...');
    const configs = await getSystemConfigs();
    const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
    const webhookUrl = webhookConfig?.value;

    console.log('Webhook config:', {
      found: !!webhookConfig,
      url: webhookUrl ? `${webhookUrl.substring(0, 20)}...` : 'not set'
    });

    if (!webhookUrl) {
      throw new Error('Slack webhook URL is not configured');
    }

    console.log('Getting task assignments...');
    const assignments = await getTaskAssignmentsWithDetails();
    console.log(`Found ${assignments.length} assignments`);

    const messageText = await getSlackMessage(assignments);
    console.log('Generated Slack message:', messageText ? 'yes' : 'no');
    
    if (messageText) {
      console.log('Sending notification to Slack...');
      await sendToSlack(webhookUrl, messageText);
      console.log('Notification sent successfully');
    }

    return { success: true, message: 'Notifications sent successfully' };
  } catch (error) {
    console.error('Error in sendNotificationOnly:', error);
    await sendErrorToSlack(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
} 