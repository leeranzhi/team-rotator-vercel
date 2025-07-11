export interface Member {
  id: number;
  slackMemberId: string;
  host: string;
}

export interface Task {
  id: number;
  name: string;
  rotationRule: string;
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

export type EdgeConfigValue = string | number | boolean | Record<string, any> | EdgeConfigValue[];

// Edge Config 类型定义
export type EdgeConfigClient = {
  get<T = EdgeConfigValue>(key: string): Promise<T>;
  set<T = EdgeConfigValue>(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EDGE_CONFIG?: string;
    }
  }
}

export interface TaskAssignmentWithDetails extends TaskAssignment {
  taskName: string;
  host: string;
  slackMemberId: string;
} 