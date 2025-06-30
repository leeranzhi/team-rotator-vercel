export interface Member {
  id: number;
  host: string;
  slackMemberId: string;
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
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export interface SystemConfig {
  key: string;
  value: string;
  lastModified: string; // ISO date string
  modifiedBy: string | null;
}

export interface TaskAssignmentWithDetails extends TaskAssignment {
  taskName: string;
  host: string;
  slackMemberId: string;
} 