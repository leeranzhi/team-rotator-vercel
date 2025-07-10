export interface Member {
  id: number;
  name: string;
  slackMemberId: string;
  active?: boolean;
}

export interface Task {
  id: number;
  name: string;
  rotationRule: string;
  active?: boolean;
}

export interface TaskAssignment {
  id: number;
  taskId: number;
  memberId: number;
  startDate: string;
  endDate: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  lastModified: string;
  modifiedBy: string | null;
}

// Edge Config 类型定义
export interface EdgeConfigClient {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EDGE_CONFIG?: string;
    }
  }
}

export interface TaskAssignmentWithDetails extends TaskAssignment {
  taskName: string;
  name: string;
  slackMemberId: string;
} 