export type Status='Backlog'|'In progress'|'Review'|'Done'; export type Priority='Low'|'Medium'|'High'|'Urgent';
export interface Project{id:string;name:string;emoji:string;description:string;color:string;progress:number;due:string;members:string[]}
export interface Task{id:string;projectId:string;title:string;status:Status;priority:Priority;assignee:string;due:string;estimate:number;tags:string[];note?:string}
export interface Workspace{projects:Project[];tasks:Task[]}
