import { Member, Task, TaskAssignment, SystemConfig, EdgeConfigClient } from '@/types';
import { createClient } from '@vercel/edge-config';
import { logger } from './logger';

const edgeConfig = createClient(process.env.EDGE_CONFIG) as unknown as EdgeConfigClient;

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

// Members
export async function getMembers(): Promise<Member[]> {
  if (isDev) {
    return membersCache;
  }
  
  try {
    const members = await edgeConfig.get('members') as Member[];
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
    await edgeConfig.set('members', members);
  } catch (error) {
    logger.error('Failed to update member in Edge Config');
    throw error;
  }
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  if (isDev) {
    return tasksCache;
  }

  try {
    const tasks = await edgeConfig.get('tasks') as Task[];
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
    await edgeConfig.set('tasks', tasks);
  } catch (error) {
    logger.error('Failed to update task in Edge Config');
    throw error;
  }
}

// Task Assignments
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  if (isDev) {
    return taskAssignmentsCache;
  }

  try {
    const assignments = await edgeConfig.get('taskAssignments') as TaskAssignment[];
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
    await edgeConfig.set('taskAssignments', assignments);
  } catch (error) {
    logger.error('Failed to update task assignment in Edge Config');
    throw error;
  }
}

// System Configs
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  if (isDev) {
    return systemConfigsCache;
  }

  try {
    const configs = await edgeConfig.get('systemConfigs') as SystemConfig[];
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
    await edgeConfig.set('systemConfigs', configs);
  } catch (error) {
    logger.error('Failed to save system config in Edge Config');
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
      memberName: member?.name || 'Unknown Member',
      slackMemberId: member?.slackMemberId || 'Unknown',
    };
  });
}

// 初始化函数
export async function initializeDB(): Promise<void> {
  if (!isDev) {
    try {
      // 检查是否需要初始化
      const [members, tasks, assignments, configs] = await Promise.all([
        edgeConfig.get('members'),
        edgeConfig.get('tasks'),
        edgeConfig.get('taskAssignments'),
        edgeConfig.get('systemConfigs'),
      ]);

      // 如果所有数据都不存在，则初始化
      if (!members && !tasks && !assignments && !configs) {
        await Promise.all([
          edgeConfig.set('members', []),
          edgeConfig.set('tasks', []),
          edgeConfig.set('taskAssignments', []),
          edgeConfig.set('systemConfigs', []),
        ]);
        logger.info('Initialized Edge Config storage');
      }
    } catch (error) {
      logger.error('Failed to initialize Edge Config storage');
      throw error;
    }
  }
} 