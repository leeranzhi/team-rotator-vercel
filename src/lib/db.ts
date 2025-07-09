import { promises as fs } from 'fs';
import path from 'path';
import { Member, Task, TaskAssignment, SystemConfig, TaskAssignmentWithDetails } from '@/types';
import { kv } from '@vercel/kv';
import { logger } from './logger';

const dataDirectory = path.join(process.cwd(), 'data');

// Key prefixes for KV store
const KV_KEYS = {
  MEMBERS: 'members',
  TASKS: 'tasks',
  ASSIGNMENTS: 'assignments',
  CONFIGS: 'configs',
} as const;

// In-memory cache with TTL
type CacheItem<T> = {
  data: T[];
  timestamp: number;
};

const CACHE_TTL = 60 * 1000; // 1 minute
let cache: {
  [key: string]: CacheItem<any> | null;
} = {
  [KV_KEYS.MEMBERS]: null,
  [KV_KEYS.TASKS]: null,
  [KV_KEYS.ASSIGNMENTS]: null,
  [KV_KEYS.CONFIGS]: null,
};

// 确保数据目录存在（仅用于开发环境）
async function ensureDataDirectory() {
  if (process.env.NODE_ENV === 'production') return;
  try {
    await fs.access(dataDirectory);
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true });
  }
}

// 通用的读取JSON文件函数（仅用于开发环境）
async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(dataDirectory, filename);
    const jsonData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// 通用的写入JSON文件函数（仅用于开发环境）
async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;
  await ensureDataDirectory();
  const filePath = path.join(dataDirectory, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// 通用的获取数据函数
async function getData<T>(key: string, filename: string): Promise<T[]> {
  // 检查缓存是否有效
  const cacheItem = cache[key];
  if (cacheItem && Date.now() - cacheItem.timestamp < CACHE_TTL) {
    return cacheItem.data;
  }

  try {
    if (process.env.NODE_ENV === 'production') {
      // 在生产环境使用 Vercel KV
      const data = await kv.get<T[]>(key) || [];
      // 更新缓存
      cache[key] = {
        data,
        timestamp: Date.now(),
      };
      return data;
    } else {
      // 在开发环境使用文件系统
      const data = await readJsonFile<T>(filename);
      // 更新缓存
      cache[key] = {
        data,
        timestamp: Date.now(),
      };
      return data;
    }
  } catch (error) {
    logger.error(`Error getting data for ${key}: ${error}`);
    return [];
  }
}

// 通用的保存数据函数
async function saveData<T>(key: string, filename: string, data: T[]): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // 在生产环境使用 Vercel KV
      await kv.set(key, data);
    } else {
      // 在开发环境使用文件系统
      await writeJsonFile(filename, data);
    }
    // 更新缓存
    cache[key] = {
      data,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Error saving data for ${key}: ${error}`);
    throw error;
  }
}

// Members
export async function getMembers(): Promise<Member[]> {
  return getData<Member>(KV_KEYS.MEMBERS, 'members.json');
}

export async function saveMember(member: Member): Promise<Member> {
  const members = await getMembers();
  const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
  const newMember = { ...member, id: newId };
  members.push(newMember);
  await saveData(KV_KEYS.MEMBERS, 'members.json', members);
  return newMember;
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  return getData<Task>(KV_KEYS.TASKS, 'tasks.json');
}

export async function saveTask(task: Task): Promise<Task> {
  const tasks = await getTasks();
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  const newTask = { ...task, id: newId };
  tasks.push(newTask);
  await saveData(KV_KEYS.TASKS, 'tasks.json', tasks);
  return newTask;
}

// Task Assignments
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  return getData<TaskAssignment>(KV_KEYS.ASSIGNMENTS, 'task_assignments.json');
}

export async function saveTaskAssignment(assignment: TaskAssignment): Promise<TaskAssignment> {
  const assignments = await getTaskAssignments();
  const newId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
  const newAssignment = { ...assignment, id: newId };
  assignments.push(newAssignment);
  await saveData(KV_KEYS.ASSIGNMENTS, 'task_assignments.json', assignments);
  return newAssignment;
}

export async function updateTaskAssignment(assignment: TaskAssignment): Promise<TaskAssignment> {
  const assignments = await getTaskAssignments();
  const index = assignments.findIndex(a => a.id === assignment.id);
  if (index === -1) {
    throw new Error('Assignment not found');
  }
  
  // Only save essential fields
  const essentialAssignment = {
    id: assignment.id,
    taskId: assignment.taskId,
    memberId: assignment.memberId,
    startDate: assignment.startDate,
    endDate: assignment.endDate
  };
  
  assignments[index] = essentialAssignment;
  await saveData(KV_KEYS.ASSIGNMENTS, 'task_assignments.json', assignments);
  return essentialAssignment;
}

// System Configs
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  return getData<SystemConfig>(KV_KEYS.CONFIGS, 'system_configs.json');
}

export async function saveSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  const configs = await getSystemConfigs();
  const existingIndex = configs.findIndex(c => c.key === config.key);
  if (existingIndex !== -1) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  await saveData(KV_KEYS.CONFIGS, 'system_configs.json', configs);
  return config;
}

// 获取带详细信息的任务分配列表
export async function getTaskAssignmentsWithDetails(): Promise<TaskAssignmentWithDetails[]> {
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
      taskName: task?.name || '',
      host: member?.host || '',
      slackMemberId: member?.slackMemberId || '',
    };
  });
}

// Reset cache
export function resetCache() {
  cache = {
    [KV_KEYS.MEMBERS]: null,
    [KV_KEYS.TASKS]: null,
    [KV_KEYS.ASSIGNMENTS]: null,
    [KV_KEYS.CONFIGS]: null,
  };
} 