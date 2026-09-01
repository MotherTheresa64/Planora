import {demoWorkspace} from './demo';
import type {ActivityItem,Collaborator,Milestone,Note,Plan,PlanStatus,Priority,Resource,ResourceKind,Subtask,Task,TaskStatus,Workspace,WorkspaceSettings} from './types';

const KEY='planora-workspace-v2';
const LEGACY_KEY='planora-workspace-v1';
const LIMITS={plans:250,milestones:750,tasks:2000,resources:750,notes:750,activity:100} as const;
const taskStatuses:TaskStatus[]=['Backlog','To Do','In Progress','Blocked','Complete'];
const priorities:Priority[]=['Low','Medium','High','Urgent'];
const planStatuses:PlanStatus[]=['Draft','Planned','Active','On Track','At Risk','Behind','Paused','Completed','Archived'];
const resourceKinds:ResourceKind[]=['Link','Documentation','Article','Video','Reference','File','Note'];

function cloneDemo():Workspace{return structuredClone(demoWorkspace)}
function scopedKey(scope:string){return `${KEY}:${scope.replace(/[^a-zA-Z0-9:_-]/g,'_')}`}
function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function text(value:unknown,fallback=''){return typeof value==='string'?value.slice(0,10000):fallback}
function nonEmpty(value:unknown,fallback=''){const v=text(value).trim();return v||fallback}
function finite(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback}
function bool(value:unknown,fallback=false){return typeof value==='boolean'?value:fallback}
function strings(value:unknown,max=50){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string').map(item=>item.slice(0,160)).filter(Boolean).slice(0,max):[]}
function isoDate(value:unknown,fallback=new Date().toISOString().slice(0,10)){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return fallback;
  const parsed=new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())?fallback:value;
}
function isoTimestamp(value:unknown,fallback=new Date().toISOString()){
  if(typeof value!=='string')return fallback;
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?fallback:parsed.toISOString();
}
function enumValue<T extends string>(value:unknown,allowed:readonly T[],fallback:T):T{return typeof value==='string'&&allowed.includes(value as T)?value as T:fallback}
function color(value:unknown){return typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value)?value:'#7f8cff'}
function id(value:unknown){return typeof value==='string'&&value.trim()?value.slice(0,180):''}

function collaborator(raw:unknown,index:number):Collaborator|null{
  const c=record(raw);if(!c)return null;
  const name=nonEmpty(c.name,'Collaborator');
  return {id:id(c.id)||`collaborator-${index}`,name,initials:nonEmpty(c.initials,name.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'CO').slice(0,8),role:enumValue(c.role,['Owner','Editor','Contributor','Viewer'] as const,'Viewer')};
}
function plan(raw:unknown,index:number):Plan|null{
  const p=record(raw);if(!p)return null;
  const planId=id(p.id);if(!planId)return null;
  const startDate=isoDate(p.startDate),targetDate=isoDate(p.targetDate,startDate);
  const collaborators=(Array.isArray(p.collaborators)?p.collaborators:[]).map(collaborator).filter((value):value is Collaborator=>Boolean(value)).slice(0,100);
  return {id:planId,name:nonEmpty(p.name,`Untitled plan ${index+1}`).slice(0,240),emoji:nonEmpty(p.emoji,'◇').slice(0,8),description:text(p.description).slice(0,8000),goal:nonEmpty(p.goal,'Define a clear outcome for this plan.').slice(0,4000),color:color(p.color),startDate,targetDate:targetDate<startDate?startDate:targetDate,priority:enumValue(p.priority,priorities,'Medium'),status:enumValue(p.status,planStatuses,'Active'),category:nonEmpty(p.category,'General').slice(0,120),tags:strings(p.tags),collaborators:collaborators.length?collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:isoTimestamp(p.createdAt),completedAt:p.completedAt?isoTimestamp(p.completedAt):undefined};
}
function milestone(raw:unknown,index:number,planIds:Set<string>):Milestone|null{
  const m=record(raw);if(!m)return null;
  const milestoneId=id(m.id),planId=id(m.planId);if(!milestoneId||!planIds.has(planId))return null;
  return {id:milestoneId,planId,name:nonEmpty(m.name,`Milestone ${index+1}`).slice(0,240),description:text(m.description).slice(0,6000),status:enumValue(m.status,['Not Started','In Progress','Complete'] as const,'Not Started'),targetDate:isoDate(m.targetDate),order:Math.max(1,Math.round(finite(m.order,index+1))),dependencies:strings(m.dependencies,100)};
}
function subtask(raw:unknown,index:number):Subtask|null{
  const s=record(raw);if(!s)return null;
  const title=nonEmpty(s.title);if(!title)return null;
  return {id:id(s.id)||`subtask-${index}`,title:title.slice(0,400),complete:bool(s.complete)};
}
function task(raw:unknown,index:number,planIds:Set<string>,milestonesById:Map<string,Milestone>):Task|null{
  const t=record(raw);if(!t)return null;
  const taskId=id(t.id),planId=id(t.planId);if(!taskId||!planIds.has(planId))return null;
  const requestedMilestone=id(t.milestoneId),milestone=milestonesById.get(requestedMilestone);
  const subtasks=(Array.isArray(t.subtasks)?t.subtasks:[]).map(subtask).filter((value):value is Subtask=>Boolean(value)).slice(0,250);
  const estimate=Math.min(10000,Math.max(0,finite(t.estimate,1)));
  const actual=t.actual===undefined?undefined:Math.min(10000,Math.max(0,finite(t.actual)));
  return {id:taskId,planId,milestoneId:milestone?.planId===planId?milestone.id:undefined,title:nonEmpty(t.title,`Untitled task ${index+1}`).slice(0,500),description:t.description===undefined?undefined:text(t.description).slice(0,8000),status:enumValue(t.status,taskStatuses,'Backlog'),priority:enumValue(t.priority,priorities,'Medium'),assignee:nonEmpty(t.assignee,'You').slice(0,240),startDate:t.startDate?isoDate(t.startDate):undefined,dueDate:isoDate(t.dueDate),estimate,actual,tags:strings(t.tags),notes:t.notes===undefined?undefined:text(t.notes).slice(0,12000),subtasks,dependencies:strings(t.dependencies,250),createdAt:isoTimestamp(t.createdAt),completedAt:t.completedAt?isoTimestamp(t.completedAt):undefined};
}
function resource(raw:unknown,planIds:Set<string>,milestonesById:Map<string,Milestone>):Resource|null{
  const r=record(raw);if(!r)return null;
  const resourceId=id(r.id),planId=id(r.planId);if(!resourceId||!planIds.has(planId))return null;
  const requestedMilestone=id(r.milestoneId),milestone=milestonesById.get(requestedMilestone);
  const rawUrl=text(r.url).trim();
  let safeUrl:Resource['url'];
  if(rawUrl){try{const parsed=new URL(rawUrl);if(['http:','https:'].includes(parsed.protocol))safeUrl=parsed.toString()}catch{/* Invalid resource URL is dropped rather than breaking rendering. */}}
  return {id:resourceId,planId,milestoneId:milestone?.planId===planId?milestone.id:undefined,title:nonEmpty(r.title,'Untitled resource').slice(0,500),kind:enumValue(r.kind,resourceKinds,'Reference'),url:safeUrl,notes:r.notes===undefined?undefined:text(r.notes).slice(0,12000),createdAt:isoTimestamp(r.createdAt)};
}
function note(raw:unknown,planIds:Set<string>,taskIds:Set<string>):Note|null{
  const n=record(raw);if(!n)return null;
  const noteId=id(n.id),planId=id(n.planId);if(!noteId||!planIds.has(planId))return null;
  const requestedTask=id(n.taskId);
  return {id:noteId,planId,taskId:taskIds.has(requestedTask)?requestedTask:undefined,title:nonEmpty(n.title,'Untitled note').slice(0,500),body:text(n.body).slice(0,20000),createdAt:isoTimestamp(n.createdAt),updatedAt:isoTimestamp(n.updatedAt,n.createdAt?isoTimestamp(n.createdAt):new Date().toISOString())};
}
function activity(raw:unknown,planIds:Set<string>,taskIds:Set<string>):ActivityItem|null{
  const a=record(raw);if(!a)return null;
  const activityId=id(a.id);if(!activityId)return null;
  const type=enumValue(a.type,['plan','milestone','task','resource','note','schedule'] as const,'task');
  const planId=id(a.planId),taskId=id(a.taskId);
  return {id:activityId,type,message:nonEmpty(a.message,'Workspace updated.').slice(0,1000),createdAt:isoTimestamp(a.createdAt),planId:planIds.has(planId)?planId:undefined,taskId:taskIds.has(taskId)?taskId:undefined};
}
function settings(raw:unknown):WorkspaceSettings{
  const fallback=cloneDemo().settings,s=record(raw);
  if(!s)return fallback;
  return {weekStartsOn:enumValue(s.weekStartsOn,['monday','sunday'] as const,fallback.weekStartsOn),defaultTaskEstimate:Math.min(10000,Math.max(0,finite(s.defaultTaskEstimate,fallback.defaultTaskEstimate))),compactMode:bool(s.compactMode,fallback.compactMode),notifications:bool(s.notifications,fallback.notifications)};
}

function dateFromLegacy(value:unknown){
  if(typeof value!=='string'||!value.trim())return new Date().toISOString().slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const parsed=new Date(`${value}, ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime())?new Date().toISOString().slice(0,10):parsed.toISOString().slice(0,10);
}
function legacyStatus(value:unknown):TaskStatus{
  if(value==='Done')return 'Complete';
  if(value==='In progress')return 'In Progress';
  if(value==='Review')return 'To Do';
  return 'Backlog';
}
function legacyPriority(value:unknown):Priority{return enumValue(value,priorities,'Medium')}
function migrateLegacy(value:unknown):Workspace|null{
  const legacy=record(value) as {projects?:unknown[];tasks?:unknown[]}|null;
  if(!legacy||!Array.isArray(legacy.projects)||!Array.isArray(legacy.tasks))return null;
  const createdAt=new Date().toISOString();
  const plans:Plan[]=legacy.projects.flatMap((raw,index)=>{
    const p=record(raw);if(!p)return [];
    const planId=id(p.id),name=nonEmpty(p.name);if(!planId||!name)return [];
    return [{id:planId,name:name.slice(0,240),emoji:nonEmpty(p.emoji,'◇').slice(0,8),description:text(p.description).slice(0,8000),goal:text(p.description)||`Complete ${name}.`,color:color(p.color),startDate:new Date().toISOString().slice(0,10),targetDate:dateFromLegacy(p.due),priority:'Medium',status:'Active',category:'General',tags:[],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:index?createdAt:createdAt}];
  }).slice(0,LIMITS.plans);
  const planIds=new Set(plans.map(item=>item.id));
  const tasks:Task[]=legacy.tasks.flatMap(raw=>{
    const t=record(raw);if(!t)return [];
    const taskId=id(t.id),planId=id(t.projectId),title=nonEmpty(t.title);if(!taskId||!planIds.has(planId)||!title)return [];
    return [{id:taskId,planId,title:title.slice(0,500),status:legacyStatus(t.status),priority:legacyPriority(t.priority),assignee:nonEmpty(t.assignee,'You').slice(0,240),dueDate:dateFromLegacy(t.due),estimate:Math.min(10000,Math.max(0,finite(t.estimate,1))),tags:strings(t.tags),notes:t.note===undefined?undefined:text(t.note).slice(0,12000),subtasks:[],dependencies:[],createdAt}];
  }).slice(0,LIMITS.tasks);
  return {...cloneDemo(),plans,milestones:[],tasks,resources:[],notes:[],activity:[{id:crypto.randomUUID(),type:'plan',message:'Migrated your previous Planora workspace.',createdAt}],settings:cloneDemo().settings};
}

export function normalizeWorkspace(value:unknown):Workspace|null{
  const w=record(value);if(!w||!Array.isArray(w.plans)||!Array.isArray(w.tasks))return null;
  const plans=w.plans.map(plan).filter((item):item is Plan=>Boolean(item)).slice(0,LIMITS.plans);
  const uniquePlans=plans.filter((item,index)=>plans.findIndex(other=>other.id===item.id)===index);
  const planIds=new Set(uniquePlans.map(item=>item.id));
  const milestones=(Array.isArray(w.milestones)?w.milestones:[]).map((item,index)=>milestone(item,index,planIds)).filter((item):item is Milestone=>Boolean(item)).slice(0,LIMITS.milestones);
  const uniqueMilestones=milestones.filter((item,index)=>milestones.findIndex(other=>other.id===item.id)===index);
  const milestonesById=new Map(uniqueMilestones.map(item=>[item.id,item]));
  const tasks=w.tasks.map((item,index)=>task(item,index,planIds,milestonesById)).filter((item):item is Task=>Boolean(item)).slice(0,LIMITS.tasks);
  const uniqueTasks=tasks.filter((item,index)=>tasks.findIndex(other=>other.id===item.id)===index);
  const taskIds=new Set(uniqueTasks.map(item=>item.id));
  const repairedTasks=uniqueTasks.map(item=>({...item,dependencies:item.dependencies.filter(dependency=>dependency!==item.id&&taskIds.has(dependency))}));
  const resources=(Array.isArray(w.resources)?w.resources:[]).map(item=>resource(item,planIds,milestonesById)).filter((item):item is Resource=>Boolean(item)).slice(0,LIMITS.resources);
  const notes=(Array.isArray(w.notes)?w.notes:[]).map(item=>note(item,planIds,taskIds)).filter((item):item is Note=>Boolean(item)).slice(0,LIMITS.notes);
  const history=(Array.isArray(w.activity)?w.activity:[]).map(item=>activity(item,planIds,taskIds)).filter((item):item is ActivityItem=>Boolean(item)).slice(0,LIMITS.activity);
  return {plans:uniquePlans,milestones:uniqueMilestones,tasks:repairedTasks,resources,notes,activity:history,settings:settings(w.settings)};
}

export function loadWorkspace(scope='guest'):Workspace{
  try{
    const raw=localStorage.getItem(scopedKey(scope));
    if(raw){const normalized=normalizeWorkspace(JSON.parse(raw));if(normalized)return normalized;}
    if(scope==='guest'){
      const unscoped=localStorage.getItem(KEY);
      if(unscoped){const normalized=normalizeWorkspace(JSON.parse(unscoped));if(normalized)return normalized;}
      const legacy=localStorage.getItem(LEGACY_KEY);
      if(legacy){const migrated=migrateLegacy(JSON.parse(legacy));if(migrated){saveWorkspace(migrated,scope);return migrated;}}
    }
  }catch{/* Browser storage can be unavailable or contain malformed JSON. */}
  return cloneDemo();
}

export function saveWorkspace(value:Workspace,scope='guest'){
  try{localStorage.setItem(scopedKey(scope),JSON.stringify(value))}catch{/* Keep the app usable if storage is unavailable. */}
}

export function resetWorkspace(scope='guest'){
  try{localStorage.removeItem(scopedKey(scope))}catch{/* noop */}
  return cloneDemo();
}

export function exportWorkspace(value:Workspace){return JSON.stringify(value,null,2)}
