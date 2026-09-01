export type TaskStatus='Backlog'|'To Do'|'In Progress'|'Blocked'|'Complete';
export type Priority='Low'|'Medium'|'High'|'Urgent';
export type PlanStatus='Draft'|'Planned'|'Active'|'On Track'|'At Risk'|'Behind'|'Paused'|'Completed'|'Archived';
export type MilestoneStatus='Not Started'|'In Progress'|'Complete';
export type CollaboratorRole='Owner'|'Editor'|'Contributor'|'Viewer';
export type ResourceKind='Link'|'Documentation'|'Article'|'Video'|'Reference'|'File'|'Note';

export interface Collaborator{
  id:string;
  name:string;
  initials:string;
  role:CollaboratorRole;
}

export interface Plan{
  id:string;
  name:string;
  emoji:string;
  description:string;
  goal:string;
  color:string;
  startDate:string;
  targetDate:string;
  priority:Priority;
  status:PlanStatus;
  category:string;
  tags:string[];
  collaborators:Collaborator[];
  createdAt:string;
  updatedAt?:string;
  completedAt?:string;
}

export interface Milestone{
  id:string;
  planId:string;
  name:string;
  description:string;
  status:MilestoneStatus;
  targetDate:string;
  order:number;
  dependencies:string[];
  createdAt?:string;
  updatedAt?:string;
}

export interface Subtask{
  id:string;
  title:string;
  complete:boolean;
}

export interface Task{
  id:string;
  planId:string;
  milestoneId?:string;
  title:string;
  description?:string;
  status:TaskStatus;
  priority:Priority;
  assignee:string;
  startDate?:string;
  dueDate?:string;
  estimate:number;
  actual?:number;
  tags:string[];
  notes?:string;
  subtasks:Subtask[];
  dependencies:string[];
  createdAt:string;
  updatedAt?:string;
  completedAt?:string;
}

export interface Resource{
  id:string;
  planId:string;
  milestoneId?:string;
  title:string;
  kind:ResourceKind;
  url?:string;
  notes?:string;
  createdAt:string;
  updatedAt?:string;
}

export interface Note{
  id:string;
  planId:string;
  taskId?:string;
  title:string;
  body:string;
  createdAt:string;
  updatedAt:string;
}

export interface ActivityItem{
  id:string;
  type:'plan'|'milestone'|'task'|'resource'|'note'|'schedule';
  message:string;
  createdAt:string;
  planId?:string;
  taskId?:string;
}

export interface WorkspaceSettings{
  weekStartsOn:'monday'|'sunday';
  defaultTaskEstimate:number;
  compactMode:boolean;
  notifications:boolean;
}

export interface Workspace{
  plans:Plan[];
  milestones:Milestone[];
  tasks:Task[];
  resources:Resource[];
  notes:Note[];
  activity:ActivityItem[];
  settings:WorkspaceSettings;
}

export interface WorkspaceSnapshot{
  workspace:Workspace;
  savedAt:string;
}
