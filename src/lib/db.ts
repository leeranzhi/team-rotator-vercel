import { Member, Task, TaskAssignment, SystemConfig } from '@/types';
import { createClient } from '@vercel/edge-config';
import { logger } from './logger';

// Edge Config 客户端配置
const EDGE_CONFIG = process.env.EDGE_CONFIG;
const EDGE_CONFIG_ID = EDGE_CONFIG ? new URL(EDGE_CONFIG).pathname.split('/')[1] : null;
const EDGE_CONFIG_TOKEN = EDGE_CONFIG ? new URL(EDGE_CONFIG).searchParams.get('token') : null;
const VERCEL_ACCESS_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

// 读取客户端
const edgeConfigRead = process.env.EDGE_CONFIG ? createClient(process.env.EDGE_CONFIG) : null;

if (!process.env.EDGE_CONFIG) {
  logger.warn('EDGE_CONFIG environment variable is not set');
} else {
  logger.info('Edge Config read client initialized successfully');
  }

if (!process.env.VERCEL_ACCESS_TOKEN) {
  logger.warn('VERCEL_ACCESS_TOKEN environment variable is not set');
} else {
  logger.info('Vercel access token is available for write operations');
}

// 内存缓存，用于开发环境
let membersCache: Member[] = [];
let tasksCache: Task[] = [];
let taskAssignmentsCache: TaskAssignment[] = [];
let systemConfigsCache: SystemConfig[] = [];

const isDev = process.env.NODE_ENV === 'development';

// 辅助函数：确保数组存在
function ensureArray<T>(value: T[] | null | undefined): T[] {
  return value || [];
}

// 辅助函数：检查 Edge Config 是否可用
function checkEdgeConfig() {
  if (!edgeConfigRead) {
    logger.error('Edge Config client is not initialized');
    throw new Error('Edge Config client is not initialized');
  }
}

// 辅助函数：使用 Vercel REST API 更新 Edge Config
async function updateEdgeConfig(key: string, value: any) {
  if (!EDGE_CONFIG_ID) {
    logger.error('Edge Config ID not found');
    throw new Error('Edge Config ID not found');
  }

  if (!VERCEL_ACCESS_TOKEN) {
    logger.error('VERCEL_ACCESS_TOKEN not found. This token is required for write operations.');
    throw new Error('VERCEL_ACCESS_TOKEN not found');
  }

  const url = `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`;
  
  try {
    logger.info('Updating Edge Config', { key, url });
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VERCEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key,
            value,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Failed to update Edge Config', { error, status: response.status });
      throw new Error(`Failed to update Edge Config: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    logger.info('Successfully updated Edge Config', { key, result });
    return result;
  } catch (error) {
    logger.error('Failed to update Edge Config', { error, key });
    throw error;
  }
}

// Members
export async function getMembers(): Promise<Member[]> {
  if (isDev) {
    logger.info('Using local cache for members in development mode');
    return membersCache;
  }
  
  try {
    checkEdgeConfig();
    const members = await edgeConfigRead!.get('members') as Member[] | null;
    return ensureArray(members);
  } catch (error) {
    logger.error('Failed to get members from Edge Config');
    return [];
  }
}

export async function updateMember(member: Member): Promise<void> {
  if (isDev) {
    const index = membersCache.findIndex(m => m.id === member.id);
    if (index !== -1) {
      membersCache[index] = member;
    } else {
      membersCache.push(member);
    }
    return;
  }

  try {
    const members = await getMembers();
    const index = members.findIndex(m => m.id === member.id);
    if (index !== -1) {
      members[index] = member;
    } else {
      members.push(member);
    }
    await updateEdgeConfig('members', members);
  } catch (error) {
    logger.error('Failed to update member in Edge Config');
    throw error;
  }
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  if (isDev) {
    logger.info('Using local cache for tasks in development mode');
    return tasksCache;
  }

  try {
    checkEdgeConfig();
    const tasks = await edgeConfigRead!.get('tasks') as Task[] | null;
    return ensureArray(tasks);
  } catch (error) {
    logger.error('Failed to get tasks from Edge Config');
    return [];
  }
}

export async function updateTask(task: Task): Promise<void> {
  if (isDev) {
    const index = tasksCache.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasksCache[index] = task;
    } else {
      tasksCache.push(task);
    }
    return;
  }

  try {
    const tasks = await getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    await updateEdgeConfig('tasks', tasks);
  } catch (error) {
    logger.error('Failed to update task in Edge Config');
    throw error;
  }
}

// Task Assignments
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  if (isDev) {
    logger.info('Using local cache for task assignments in development mode');
    return taskAssignmentsCache;
  }

  try {
    checkEdgeConfig();
    const assignments = await edgeConfigRead!.get('taskAssignments') as TaskAssignment[] | null;
    return ensureArray(assignments);
  } catch (error) {
    logger.error('Failed to get task assignments from Edge Config');
    return [];
  }
}

export async function updateTaskAssignment(assignment: TaskAssignment): Promise<void> {
  if (isDev) {
    const index = taskAssignmentsCache.findIndex(a => a.id === assignment.id);
    if (index !== -1) {
      taskAssignmentsCache[index] = assignment;
    } else {
      taskAssignmentsCache.push(assignment);
    }
    return;
  }

  try {
    const assignments = await getTaskAssignments();
    const index = assignments.findIndex(a => a.id === assignment.id);
    if (index !== -1) {
      assignments[index] = assignment;
    } else {
      assignments.push(assignment);
    }
    await updateEdgeConfig('taskAssignments', assignments);
  } catch (error) {
    logger.error('Failed to update task assignment in Edge Config');
    throw error;
  }
}

// System Configs
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  if (isDev) {
    logger.info('Using local cache for system configs in development mode');
    return systemConfigsCache;
  }

  try {
    checkEdgeConfig();
    const configs = await edgeConfigRead!.get('systemConfigs') as SystemConfig[] | null;
    return ensureArray(configs);
  } catch (error) {
    logger.error('Failed to get system configs from Edge Config');
    return [];
  }
}

export async function saveSystemConfig(config: SystemConfig): Promise<void> {
  if (isDev) {
    const index = systemConfigsCache.findIndex(c => c.key === config.key);
    if (index !== -1) {
      systemConfigsCache[index] = config;
    } else {
      systemConfigsCache.push(config);
    }
    return;
  }

  try {
    const configs = await getSystemConfigs();
    const index = configs.findIndex(c => c.key === config.key);
    if (index !== -1) {
      configs[index] = config;
    } else {
      configs.push(config);
    }

    // 更新Edge Config并等待结果
    const result = await updateEdgeConfig('systemConfigs', configs);
    logger.info('System config saved successfully', { config, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to save system config in Edge Config', { error: errorMessage, config });
    throw error;
  }
}

// 用于获取带有详细信息的任务分配
export async function getTaskAssignmentsWithDetails(): Promise<any[]> {
  const [assignments, tasks, members] = await Promise.all([
    getTaskAssignments(),
    getTasks(),
    getMembers(),
  ]);

  return assignments.map(assignment => {
    const task = tasks.find(t => t.id === assignment.taskId);
    const member = members.find(m => m.id === assignment.memberId);
    return {
      ...assignment,
      taskName: task?.name || 'Unknown Task',
      host: member?.host || 'Unknown Host',
      slackMemberId: member?.slackMemberId || '',
    };
  });
} 