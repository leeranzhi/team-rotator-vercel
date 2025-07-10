import axios from 'axios';
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

// Members
export const getMembers = async (): Promise<Member[]> => {
  const response = await api.get('/members');
  return response.data;
};

export const createMember = async (member: { host: string; slackMemberId: string }): Promise<Member> => {
  const response = await api.post('/members', member);
  return response.data;
};

export const updateMember = async (member: Member): Promise<Member> => {
  const response = await api.put('/members', member);
  return response.data;
};

// Tasks
export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get('/tasks');
  return response.data;
};

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  const response = await api.post('/tasks', task);
  return response.data;
};

// Task Assignments
export const getAssignments = async (): Promise<TaskAssignmentWithDetails[]> => {
  const response = await api.get('/assignments');
  return response.data;
};

export const saveAssignment = async (assignment: Omit<TaskAssignment, 'id'>): Promise<TaskAssignmentWithDetails> => {
  const response = await api.post('/assignments', assignment);
  return response.data;
};

export const updateAssignment = async (assignment: TaskAssignmentWithDetails): Promise<TaskAssignmentWithDetails> => {
  const response = await api.put('/assignments', assignment);
  return response.data;
};

export const triggerRotationUpdate = async (): Promise<void> => {
  await api.post('/assignments/update-rotation');
};

export const sendToSlack = async (): Promise<void> => {
  await api.post('/assignments/send-to-slack');
};

// System Config
export const getSystemConfigs = async (): Promise<SystemConfig[]> => {
  const response = await api.get('/config');
  return response.data;
};

export const saveSystemConfig = async (config: SystemConfig): Promise<SystemConfig> => {
  const response = await api.post('/config', config);
  return response.data;
};

// Webhook URL helpers
export const getWebhookUrl = async (): Promise<string> => {
  const response = await api.get('/config');
  const configs = response.data;
  const webhookConfig = configs.find((c: SystemConfig) => c.key === 'Slack:WebhookUrl');
  return webhookConfig?.value || '';
};

export const updateWebhookUrl = async (webhookUrl: string): Promise<void> => {
  await saveSystemConfig({
    key: 'Slack:WebhookUrl',
    value: webhookUrl,
    lastModified: new Date().toISOString(),
    modifiedBy: null
  });
}; 