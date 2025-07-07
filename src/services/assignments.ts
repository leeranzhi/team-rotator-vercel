import { getTaskAssignmentsWithDetails, getSystemConfigs, getMembers } from '@/lib/db';
import { updateTaskAssignments } from '@/lib/rotation';
import { isWorkingDay } from '@/lib/holiday';
import { Member } from '@/types';
import { logger } from '@/lib/logger';

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
  logger.info('Getting system configs for Slack notification...');
  const configs = await getSystemConfigs();
  const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
  const url = webhookUrl || webhookConfig?.value;

  logger.info(`Webhook config: ${JSON.stringify({ found: !!url, url: url ? url.substring(0, 20) + '...' : 'not found' })}`);
  
  if (!url) {
    const error = 'Slack webhook URL not configured';
    logger.error(error);
    throw new Error(error);
  }

  try {
    logger.info('Sending notification to Slack...');
    const messageBody = typeof message === 'string' && !message.startsWith('{') 
      ? JSON.stringify({ text: message })
      : message;
    
    logger.info(`Sending Slack message with:\nWebhook URL: ${url}\nMessage Body: ${messageBody}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: messageBody,
    });

    if (!response.ok) {
      const error = `Failed to send Slack message. Status: ${response.status} Error: ${await response.text()}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Successfully sent message to Slack');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending to Slack';
    logger.error(`Error in sendToSlack: ${errorMessage}`);
    throw error;
  }
}

// 只更新任务分配，不发送通知
export async function updateAssignmentsOnly(options: { 
  checkWorkingDay?: boolean,
  date?: Date
} = {}) {
  const { checkWorkingDay = false, date = new Date() } = options;

  try {
    // 检查是否是工作日（如果需要）
    if (checkWorkingDay && !await isWorkingDay(date)) {
      logger.info(`${date.toISOString().split('T')[0]} is not a working day. Skipping member rotation.`);
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
    logger.info('Getting task assignments...');
    const assignments = await getTaskAssignmentsWithDetails();
    logger.info(`Found ${assignments.length} assignments`);

    const messageText = await getSlackMessage(assignments);
    logger.info(`Generated Slack message: ${!!messageText}`);
    
    if (messageText) {
      logger.info('Sending notification to Slack...');
      const configs = await getSystemConfigs();
      const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
      const webhookUrl = webhookConfig?.value;
      
      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }
      
      await sendToSlack(webhookUrl, messageText);
      logger.info('Notification sent successfully');
    }

    return { success: true, message: 'Notifications sent successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in sendNotificationOnly: ${errorMessage}`);
    throw error;
  }
} 

export async function updateRotation() {
  logger.info('Starting rotation update process...');
  try {
    const today = new Date();
    logger.info(`Checking rotation for date: ${today.toISOString().split('T')[0]}`);
    
    // 先更新任务分配
    const updateResult = await updateAssignmentsOnly({ 
      checkWorkingDay: true,
      date: today
    });

    // 如果不是工作日，直接返回
    if (updateResult.message === 'Not a working day, skipping update') {
      logger.info('Not a working day, skipping update');
      return { message: updateResult.message, skipped: true };
    }

    logger.info('Assignments updated successfully, sending notification...');
    // 再发送通知
    const notificationResult = await sendNotificationOnly();
    
    logger.info('Rotation update completed successfully');
    return { 
      message: 'Rotation updated and notification sent',
      updateResult,
      notificationResult
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error in updateRotation: ${errorMessage}`);
    throw error;
  }
} 