import { promises as fs } from 'fs';
import path from 'path';
import { Member, Task, TaskAssignment, SystemConfig, TaskAssignmentWithDetails } from '@/types';

const dataDirectory = path.join(process.cwd(), 'data');

// In-memory cache
let membersCache: Member[] | null = null;
let tasksCache: Task[] | null = null;
let assignmentsCache: TaskAssignment[] | null = null;
let configsCache: SystemConfig[] | null = null;

// 确保数据目录存在
async function ensureDataDirectory() {
  try {
    await fs.access(dataDirectory);
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true });
  }
}

// 通用的读取JSON文件函数
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

// 通用的写入JSON文件函数
async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  // In production, skip file writing
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  await ensureDataDirectory();
  const filePath = path.join(dataDirectory, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Members
export async function getMembers(): Promise<Member[]> {
  if (!membersCache) {
    membersCache = await readJsonFile<Member>('members.json');
  }
  return membersCache;
}

export async function saveMember(member: Member): Promise<Member> {
  const members = await getMembers();
  const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
  const newMember = { ...member, id: newId };
  members.push(newMember);
  membersCache = members;
  await writeJsonFile('members.json', members);
  return newMember;
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  if (!tasksCache) {
    tasksCache = await readJsonFile<Task>('tasks.json');
  }
  return tasksCache;
}

export async function saveTask(task: Task): Promise<Task> {
  const tasks = await getTasks();
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  const newTask = { ...task, id: newId };
  tasks.push(newTask);
  tasksCache = tasks;
  await writeJsonFile('tasks.json', tasks);
  return newTask;
}

// Task Assignments
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  if (!assignmentsCache) {
    assignmentsCache = await readJsonFile<TaskAssignment>('task_assignments.json');
  }
  return assignmentsCache;
}

export async function saveTaskAssignment(assignment: TaskAssignment): Promise<TaskAssignment> {
  const assignments = await getTaskAssignments();
  const newId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
  const newAssignment = { ...assignment, id: newId };
  assignments.push(newAssignment);
  assignmentsCache = assignments;
  await writeJsonFile('task_assignments.json', assignments);
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
  assignmentsCache = assignments;
  await writeJsonFile('task_assignments.json', assignments);
  return essentialAssignment;
}

// System Configs
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  if (!configsCache) {
    configsCache = await readJsonFile<SystemConfig>('system_configs.json');
  }
  return configsCache;
}

export async function saveSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  const configs = await getSystemConfigs();
  const existingIndex = configs.findIndex(c => c.key === config.key);
  if (existingIndex !== -1) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  configsCache = configs;
  await writeJsonFile('system_configs.json', configs);
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

// Reset cache (useful for testing)
export function resetCache() {
  membersCache = null;
  tasksCache = null;
  assignmentsCache = null;
  configsCache = null;
} 