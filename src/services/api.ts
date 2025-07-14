import axios, { AxiosError } from 'axios';
import { Member, Task, TaskAssignment, SystemConfig, TaskAssignmentWithDetails } from '@/types';

const baseURL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api'
  : '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 错误处理函数
const handleApiError = (error: AxiosError, context: string) => {
  console.error(`API Error in ${context}:`, {
    status: error.response?.status,
    data: error.response?.data,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
    }
  });
  throw error;
};

// Members
export const getMembers = async (): Promise<Member[]> => {
  try {
  const response = await api.get('/members');
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'getMembers');
  }
};

export const createMember = async (member: { host: string; slackMemberId: string }): Promise<Member> => {
  try {
  const response = await api.post('/members', member);
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'createMember');
  }
};

export const updateMember = async (member: Member): Promise<Member> => {
  try {
    const response = await api.put('/members', member);
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'updateMember');
  }
};

// Tasks
export const getTasks = async (): Promise<Task[]> => {
  try {
  const response = await api.get('/tasks');
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'getTasks');
  }
};

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  try {
  const response = await api.post('/tasks', task);
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'createTask');
  }
};

// Task Assignments
export const getAssignments = async (): Promise<TaskAssignmentWithDetails[]> => {
  try {
  const response = await api.get('/assignments');
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'getAssignments');
  }
};

export const saveAssignment = async (assignment: Omit<TaskAssignment, 'id'>): Promise<TaskAssignmentWithDetails> => {
  try {
  const response = await api.post('/assignments', assignment);
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'saveAssignment');
  }
};

export const updateAssignment = async (assignment: TaskAssignmentWithDetails): Promise<TaskAssignmentWithDetails> => {
  try {
  const response = await api.put('/assignments', assignment);
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'updateAssignment');
  }
};

export const triggerRotationUpdate = async (): Promise<void> => {
  try {
  await api.post('/assignments/update-rotation');
  } catch (error) {
    return handleApiError(error as AxiosError, 'triggerRotationUpdate');
  }
};

export const sendToSlack = async (): Promise<void> => {
  try {
  await api.post('/assignments/send-to-slack');
  } catch (error) {
    return handleApiError(error as AxiosError, 'sendToSlack');
  }
};

// System Config
export const getSystemConfigs = async (): Promise<SystemConfig[]> => {
  try {
  const response = await api.get('/config');
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'getSystemConfigs');
  }
};

export const saveSystemConfig = async (config: SystemConfig): Promise<SystemConfig> => {
  try {
  const response = await api.post('/config', config);
  return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, 'saveSystemConfig');
  }
};

// Webhook URL helpers
export const getWebhookUrl = async (): Promise<string> => {
  try {
  const response = await api.get('/config');
  const configs = response.data;
  const webhookConfig = configs.find((c: SystemConfig) => c.key === 'Slack:WebhookUrl');
  return webhookConfig?.value || '';
  } catch (error) {
    return handleApiError(error as AxiosError, 'getWebhookUrl');
  }
};

export const updateWebhookUrl = async (webhookUrl: string): Promise<void> => {
  try {
  await saveSystemConfig({
    key: 'Slack:WebhookUrl',
    value: webhookUrl,
    lastModified: new Date().toISOString(),
    modifiedBy: null
  });
  } catch (error) {
    return handleApiError(error as AxiosError, 'updateWebhookUrl');
  }
}; 