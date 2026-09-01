import type {ActivityItem,Collaborator,Milestone,MilestoneStatus,Note,Plan,PlanStatus,Priority,Resource,ResourceKind,Task,TaskStatus,Workspace,WorkspaceSettings,WorkspaceSnapshot} from './types';

export const TASK_STATUSES:TaskStatus[]=['Backlog','To Do','In Progress','Blocked','Complete'];
export const PRIORITIES:Priority[]=['Low','Medium','High','Urgent'];
export const PLAN_STATUSES:PlanStatus[]=['Draft','Planned','Active','On Track','At Risk','Behind','Paused','Completed','Archived'];
export const MILESTONE_STATUSES:MilestoneStatus[]=['Not Started','In Progress','Complete'];
export const RESOURCE_KINDS:ResourceKind[]=['Link','Documentation','Article','Video','Reference','File','Note'];

const taskStatusSet=new Set<string>(TASK_STATUSES);
const prioritySet=new Set<string>(PRIORITIES);
const planStatusSet=new Set<string>(PLAN_STATUSES);
const milestoneStatusSet=new Set<string>(MILESTONE_STATUSES);
const resourceKindSet=new Set<string>(RESOURCE_KINDS);
const collaboratorRoles=new Set(['Owner','Editor','Contributor','Viewer']);
const activityTypes=new Set(['plan','milestone','task','resource','note','schedule']);

const asRecord=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const text=(value:unknown,fallback='',max=5000)=>typeof value==='string'?value.trim().slice(0,max):fallback;
const optionalText=(value:unknown,max=5000)=>{const result=text(value,'',max);return result||undefined};
const stringArray=(value:unknown,maxItems=40,maxLength=80)=>Array.isArray(value)?Array.from(new Set(value.flatMap(item=>typeof item==='string'&&item.trim()?[item.trim().slice(0,maxLength)]:[]))).slice(0,maxItems):[];
const finiteNumber=(value:unknown,fallback=0,min=0,max=100000)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const timestamp=(value:unknown,fallback=()=>new Date().toISOString())=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?new Date(value).toISOString():fallback();
const uniqueById=<T extends {id:string}>(items:T[])=>{const seen=new Set<string>();return items.filter(item=>item.id&&!seen.has(item.id)&&(seen.add(item.id),true))};

export const initials=(value:string)=>value.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'YOU';
export const localDateKey=(value=new Date())=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
export function parseDateKey(value:unknown):Date|null{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(year,month-1,day,12,0,0,0);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}
export const validDateKey=(value:unknown):value is string=>Boolean(parseDateKey(value));
export const formatDateKey=(value?:string)=>{const parsed=parseDateKey(value);return parsed?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:parsed.getFullYear()!==new Date().getFullYear()?'numeric':undefined}).format(parsed):'Unscheduled'};
export function addDays(value:string,amount:number){const parsed=parseDateKey(value)??new Date();parsed.setDate(parsed.getDate()+amount);return localDateKey(parsed)}
export const isOverdue=(task:Task,today=localDateKey())=>task.status!=='Complete'&&Boolean(task.dueDate&&task.dueDate<today);
export const isOpenTask=(task:Task)=>task.status!=='Complete';
export const compareTaskDates=(a:Task,b:Task)=>(a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')||PRIORITIES.indexOf(b.priority)-PRIORITIES.indexOf(a.priority)||a.title.localeCompare(b.title);

export const defaultSettings:WorkspaceSettings={weekStartsOn:'monday',defaultTaskEstimate:2,compactMode:false,notifications:true};
export const emptyWorkspace=():Workspace=>({plans:[],milestones:[],tasks:[],resources:[],notes:[],activity:[],settings:{...defaultSettings}});

export function sanitizeUrl(value:unknown){
  if(typeof value!=='string'||!value.trim())return undefined;
  try{const url=new URL(value.trim());return url.protocol==='http:'||url.protocol==='https:'?url.toString():undefined}catch{return undefined}
}

function normalizeCollaborators(value:unknown):Collaborator[]{
  if(!Array.isArray(value))return [];
  return uniqueById(value.flatMap(raw=>{const item=asRecord(raw);if(!item)return[];const name=text(item.name,'',120),id=text(item.id,'',120);if(!name||!id)return[];const role=typeof item.role==='string'&&collaboratorRoles.has(item.role)?item.role as Collaborator['role']:'Contributor';return[{id,name,initials:text(item.initials,initials(name),8),role}]}));
}

function pruneCycles<T extends {id:string;dependencies:string[]}>(items:T[]){
  const map=new Map(items.map(item=>[item.id,item]));
  const result:T[]=items.map(item=>({...item,dependencies:[]}));
  const resultMap=new Map(result.map(item=>[item.id,item]));
  const reaches=(from:string,target:string,seen=new Set<string>()):boolean=>{
    if(from===target)return true;
    if(seen.has(from))return false;
    seen.add(from);
    const node=resultMap.get(from);
    return Boolean(node?.dependencies.some(dep=>reaches(dep,target,seen)));
  };
  for(const source of items){
    const target=resultMap.get(source.id)!;
    for(const dep of Array.from(new Set(source.dependencies))){
      if(dep===source.id||!map.has(dep)||reaches(dep,source.id))continue;
      target.dependencies.push(dep);
    }
  }
  return result;
}

export function normalizeWorkspace(value:unknown):Workspace|null{
  const root=asRecord(value);if(!root)return null;
  if(!Array.isArray(root.plans)||!Array.isArray(root.tasks))return null;
  const today=localDateKey();
  const plans=uniqueById(root.plans.flatMap(raw=>{const p=asRecord(raw);if(!p)return[];const id=text(p.id,'',120),name=text(p.name,'',180);if(!id||!name)return[];const start=validDateKey(p.startDate)?p.startDate:today;const target=validDateKey(p.targetDate)&&p.targetDate>=start?p.targetDate:start;const priority=typeof p.priority==='string'&&prioritySet.has(p.priority)?p.priority as Priority:'Medium';const status=typeof p.status==='string'&&planStatusSet.has(p.status)?p.status as PlanStatus:'Active';const collaborators=normalizeCollaborators(p.collaborators);return[{id,name,emoji:text(p.emoji,'◇',8),description:text(p.description,'',4000),goal:text(p.goal,text(p.description,`Complete ${name}.`,4000),4000),color:/^#[0-9a-f]{6}$/i.test(text(p.color))?text(p.color):'#7f8cff',startDate:start,targetDate:target,priority,status,category:text(p.category,'General',80),tags:stringArray(p.tags),collaborators:collaborators.length?collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:timestamp(p.createdAt),updatedAt:p.updatedAt?timestamp(p.updatedAt):undefined,completedAt:p.completedAt?timestamp(p.completedAt):undefined}]}));
  const planMap=new Map(plans.map(plan=>[plan.id,plan]));

  let milestones=uniqueById((Array.isArray(root.milestones)?root.milestones:[]).flatMap(raw=>{const m=asRecord(raw);if(!m)return[];const id=text(m.id,'',120),planId=text(m.planId,'',120),name=text(m.name,'',180),plan=planMap.get(planId);if(!id||!plan||!name)return[];const status=typeof m.status==='string'&&milestoneStatusSet.has(m.status)?m.status as MilestoneStatus:'Not Started';return[{id,planId,name,description:text(m.description,'',3000),status,targetDate:validDateKey(m.targetDate)?m.targetDate:plan.targetDate,order:Math.round(finiteNumber(m.order,1,0,10000)),dependencies:stringArray(m.dependencies,80,120),createdAt:m.createdAt?timestamp(m.createdAt):undefined,updatedAt:m.updatedAt?timestamp(m.updatedAt):undefined}]}));
  const milestoneById=new Map(milestones.map(item=>[item.id,item]));
  milestones=pruneCycles(milestones.map(item=>({...item,dependencies:item.dependencies.filter(dep=>milestoneById.get(dep)?.planId===item.planId)})));
  const milestoneMap=new Map(milestones.map(item=>[item.id,item]));

  let tasks=uniqueById(root.tasks.flatMap(raw=>{const t=asRecord(raw);if(!t)return[];const id=text(t.id,'',120),planId=text(t.planId,'',120),title=text(t.title,'',220),plan=planMap.get(planId);if(!id||!plan||!title)return[];const milestoneId=text(t.milestoneId,'',120);const milestone=milestoneId?milestoneMap.get(milestoneId):undefined;const status=typeof t.status==='string'&&taskStatusSet.has(t.status)?t.status as TaskStatus:'Backlog';const priority=typeof t.priority==='string'&&prioritySet.has(t.priority)?t.priority as Priority:'Medium';const subtasks=uniqueById((Array.isArray(t.subtasks)?t.subtasks:[]).flatMap(rawSub=>{const sub=asRecord(rawSub);if(!sub)return[];const subId=text(sub.id,'',120),subTitle=text(sub.title,'',220);return subId&&subTitle?[{id:subId,title:subTitle,complete:Boolean(sub.complete)}]:[]}));return[{id,planId,milestoneId:milestone?.planId===planId?milestoneId:undefined,title,description:optionalText(t.description,4000),status,priority,assignee:text(t.assignee,'You',120),startDate:validDateKey(t.startDate)?t.startDate:undefined,dueDate:validDateKey(t.dueDate)?t.dueDate:undefined,estimate:finiteNumber(t.estimate,defaultSettings.defaultTaskEstimate,0,10000),actual:t.actual===undefined?undefined:finiteNumber(t.actual,0,0,10000),tags:stringArray(t.tags),notes:optionalText(t.notes,5000),subtasks,dependencies:stringArray(t.dependencies,100,120),createdAt:timestamp(t.createdAt),updatedAt:t.updatedAt?timestamp(t.updatedAt):undefined,completedAt:status==='Complete'?(t.completedAt?timestamp(t.completedAt):timestamp(t.updatedAt??t.createdAt)):undefined}]}));
  const taskById=new Map(tasks.map(item=>[item.id,item]));
  tasks=pruneCycles(tasks.map(item=>({...item,dependencies:item.dependencies.filter(dep=>taskById.get(dep)?.planId===item.planId)})));
  const taskMap=new Map(tasks.map(item=>[item.id,item]));

  const resources=uniqueById((Array.isArray(root.resources)?root.resources:[]).flatMap(raw=>{const r=asRecord(raw);if(!r)return[];const id=text(r.id,'',120),planId=text(r.planId,'',120),title=text(r.title,'',220),plan=planMap.get(planId);if(!id||!plan||!title)return[];const milestoneId=text(r.milestoneId,'',120),milestone=milestoneId?milestoneMap.get(milestoneId):undefined;const kind=typeof r.kind==='string'&&resourceKindSet.has(r.kind)?r.kind as ResourceKind:'Reference';return[{id,planId,milestoneId:milestone?.planId===planId?milestoneId:undefined,title,kind,url:sanitizeUrl(r.url),notes:optionalText(r.notes,5000),createdAt:timestamp(r.createdAt),updatedAt:r.updatedAt?timestamp(r.updatedAt):undefined}]}));

  const notes=uniqueById((Array.isArray(root.notes)?root.notes:[]).flatMap(raw=>{const n=asRecord(raw);if(!n)return[];const id=text(n.id,'',120),planId=text(n.planId,'',120),title=text(n.title,'',220),plan=planMap.get(planId);if(!id||!plan||!title)return[];const taskId=text(n.taskId,'',120),task=taskId?taskMap.get(taskId):undefined;return[{id,planId,taskId:task?.planId===planId?taskId:undefined,title,body:text(n.body,'',12000),createdAt:timestamp(n.createdAt),updatedAt:timestamp(n.updatedAt,()=>timestamp(n.createdAt))}]}));

  const activity=uniqueById((Array.isArray(root.activity)?root.activity:[]).flatMap(raw=>{const a=asRecord(raw);if(!a)return[];const id=text(a.id,'',120),message=text(a.message,'',500);if(!id||!message||typeof a.type!=='string'||!activityTypes.has(a.type))return[];const planId=text(a.planId,'',120),taskId=text(a.taskId,'',120);const item:ActivityItem={id,type:a.type as ActivityItem['type'],message,createdAt:timestamp(a.createdAt)};if(planMap.has(planId))item.planId=planId;if(taskMap.has(taskId))item.taskId=taskId;return[item]})).slice(0,100);

  const settingsRecord=asRecord(root.settings);
  const settings:WorkspaceSettings={
    weekStartsOn:settingsRecord?.weekStartsOn==='sunday'?'sunday':'monday',
    defaultTaskEstimate:finiteNumber(settingsRecord?.defaultTaskEstimate,defaultSettings.defaultTaskEstimate,.25,1000),
    compactMode:Boolean(settingsRecord?.compactMode),
    notifications:settingsRecord?.notifications===undefined?true:Boolean(settingsRecord.notifications)
  };

  const workspace:Workspace={plans,milestones,tasks,resources,notes,activity,settings};
  return syncDerivedState(workspace);
}

export function syncDerivedState(workspace:Workspace):Workspace{
  const milestones=workspace.milestones.map(milestone=>{
    const tasks=workspace.tasks.filter(task=>task.milestoneId===milestone.id);
    if(!tasks.length)return milestone;
    const completed=tasks.every(task=>task.status==='Complete');
    const started=tasks.some(task=>!['Backlog','To Do'].includes(task.status)||task.subtasks.some(sub=>sub.complete));
    const status:MilestoneStatus=completed?'Complete':started?'In Progress':'Not Started';
    return status===milestone.status?milestone:{...milestone,status,updatedAt:new Date().toISOString()};
  });
  return {...workspace,milestones};
}

export function planProgress(workspace:Workspace,planId:string){
  const tasks=workspace.tasks.filter(task=>task.planId===planId);
  if(!tasks.length)return 0;
  const completed=tasks.reduce((sum,task)=>sum+(task.status==='Complete'?1:0),0);
  return Math.round(completed/tasks.length*100);
}
export function milestoneProgress(workspace:Workspace,milestoneId:string){
  const tasks=workspace.tasks.filter(task=>task.milestoneId===milestoneId);
  if(tasks.length)return Math.round(tasks.filter(task=>task.status==='Complete').length/tasks.length*100);
  return workspace.milestones.find(item=>item.id===milestoneId)?.status==='Complete'?100:0;
}
export function planHealth(workspace:Workspace,plan:Plan,today=localDateKey()):PlanStatus{
  if(['Draft','Paused','Completed','Archived'].includes(plan.status))return plan.status;
  const late=workspace.tasks.filter(task=>task.planId===plan.id&&isOverdue(task,today)).length;
  if(plan.targetDate<today&&planProgress(workspace,plan.id)<100)return'Behind';
  if(late>=2)return'At Risk';
  return plan.status==='Planned'?'Planned':'On Track';
}
export function taskBlockers(workspace:Workspace,task:Task){
  const taskMap=new Map(workspace.tasks.map(item=>[item.id,item]));
  return task.dependencies.flatMap(id=>{const dependency=taskMap.get(id);return dependency&&dependency.status!=='Complete'?[dependency]:[]});
}
export function wouldCreateTaskDependencyCycle(workspace:Workspace,taskId:string,dependencyId:string){
  if(taskId===dependencyId)return true;
  const map=new Map(workspace.tasks.map(task=>[task.id,task.dependencies]));
  const visit=(id:string,seen=new Set<string>()):boolean=>{if(id===taskId)return true;if(seen.has(id))return false;seen.add(id);return(map.get(id)??[]).some(next=>visit(next,seen))};
  return visit(dependencyId);
}

export function updateTaskStatus(workspace:Workspace,taskId:string,status:TaskStatus){
  const now=new Date().toISOString();
  const tasks=workspace.tasks.map(task=>task.id===taskId?{...task,status,updatedAt:now,completedAt:status==='Complete'?task.completedAt??now:undefined}:task);
  return syncDerivedState({...workspace,tasks});
}
export function deleteTask(workspace:Workspace,taskId:string){
  const task=workspace.tasks.find(item=>item.id===taskId);if(!task)return workspace;
  const tasks=workspace.tasks.filter(item=>item.id!==taskId).map(item=>item.dependencies.includes(taskId)?{...item,dependencies:item.dependencies.filter(id=>id!==taskId),updatedAt:new Date().toISOString()}:item);
  const notes=workspace.notes.map(note=>note.taskId===taskId?{...note,taskId:undefined,updatedAt:new Date().toISOString()}:note);
  const activity=workspace.activity.filter(item=>item.taskId!==taskId);
  return syncDerivedState({...workspace,tasks,notes,activity});
}
export function deleteMilestone(workspace:Workspace,milestoneId:string){
  const milestone=workspace.milestones.find(item=>item.id===milestoneId);if(!milestone)return workspace;
  const milestones=workspace.milestones.filter(item=>item.id!==milestoneId).map(item=>item.dependencies.includes(milestoneId)?{...item,dependencies:item.dependencies.filter(id=>id!==milestoneId)}:item);
  const tasks=workspace.tasks.map(task=>task.milestoneId===milestoneId?{...task,milestoneId:undefined,updatedAt:new Date().toISOString()}:task);
  const resources=workspace.resources.map(resource=>resource.milestoneId===milestoneId?{...resource,milestoneId:undefined,updatedAt:new Date().toISOString()}:resource);
  return syncDerivedState({...workspace,milestones,tasks,resources});
}
export function deletePlan(workspace:Workspace,planId:string){
  const removedTaskIds=new Set(workspace.tasks.filter(task=>task.planId===planId).map(task=>task.id));
  const removedMilestoneIds=new Set(workspace.milestones.filter(item=>item.planId===planId).map(item=>item.id));
  const plans=workspace.plans.filter(plan=>plan.id!==planId);
  const tasks=workspace.tasks.filter(task=>task.planId!==planId).map(task=>({...task,dependencies:task.dependencies.filter(id=>!removedTaskIds.has(id))}));
  const milestones=workspace.milestones.filter(item=>item.planId!==planId).map(item=>({...item,dependencies:item.dependencies.filter(id=>!removedMilestoneIds.has(id))}));
  const resources=workspace.resources.filter(item=>item.planId!==planId);
  const notes=workspace.notes.filter(item=>item.planId!==planId);
  const activity=workspace.activity.filter(item=>item.planId!==planId&&!removedTaskIds.has(item.taskId??''));
  return syncDerivedState({...workspace,plans,tasks,milestones,resources,notes,activity});
}

export function addActivity(workspace:Workspace,message:string,type:ActivityItem['type'],planId?:string,taskId?:string){
  const item:ActivityItem={id:crypto.randomUUID(),type,message:message.slice(0,500),createdAt:new Date().toISOString(),planId,taskId};
  return {...workspace,activity:[item,...workspace.activity].slice(0,100)};
}

export function validatePlan(plan:Plan){
  if(!plan.name.trim())return'Plan name is required.';
  if(!plan.goal.trim())return'A clear goal is required.';
  if(!validDateKey(plan.startDate)||!validDateKey(plan.targetDate))return'Plan dates are invalid.';
  if(plan.targetDate<plan.startDate)return'Target date must be on or after the start date.';
  return null;
}
export function validateTask(task:Task,workspace:Workspace){
  if(!task.title.trim())return'Task name is required.';
  if(!workspace.plans.some(plan=>plan.id===task.planId))return'Choose a valid plan.';
  if(task.milestoneId&&!workspace.milestones.some(item=>item.id===task.milestoneId&&item.planId===task.planId))return'The selected milestone does not belong to this plan.';
  if(task.startDate&&!validDateKey(task.startDate))return'Start date is invalid.';
  if(task.dueDate&&!validDateKey(task.dueDate))return'Due date is invalid.';
  if(task.startDate&&task.dueDate&&task.dueDate<task.startDate)return'Due date must be on or after the start date.';
  if(!Number.isFinite(task.estimate)||task.estimate<0)return'Estimate must be zero or greater.';
  for(const dependencyId of task.dependencies){
    const dependency=workspace.tasks.find(item=>item.id===dependencyId);
    if(!dependency||dependency.planId!==task.planId)return'Dependencies must be valid tasks in the same plan.';
    if(wouldCreateTaskDependencyCycle(workspace,task.id,dependencyId))return'This dependency would create a cycle.';
  }
  return null;
}
export function validateMilestone(milestone:Milestone,workspace:Workspace){
  const plan=workspace.plans.find(item=>item.id===milestone.planId);
  if(!plan)return'Choose a valid plan.';
  if(!milestone.name.trim())return'Milestone name is required.';
  if(!validDateKey(milestone.targetDate))return'Milestone date is invalid.';
  if(milestone.targetDate<plan.startDate||milestone.targetDate>plan.targetDate)return'Milestone date must fall inside the plan timeline.';
  return null;
}
export function validateResource(resource:Resource,workspace:Workspace){
  if(!workspace.plans.some(plan=>plan.id===resource.planId))return'Choose a valid plan.';
  if(!resource.title.trim())return'Resource title is required.';
  if(resource.url&&!sanitizeUrl(resource.url))return'Only http:// and https:// resource links are supported.';
  return null;
}
export function validateNote(note:Note,workspace:Workspace){
  if(!workspace.plans.some(plan=>plan.id===note.planId))return'Choose a valid plan.';
  if(!note.title.trim())return'Note title is required.';
  if(!note.body.trim())return'Note content is required.';
  return null;
}

export function generateStarterPlan(plan:Plan){
  const templates=[['Define the outcome','Clarify success criteria, constraints, and the path forward.'],['Build the foundation','Complete prerequisites before the core work.'],['Execute the core work','Turn the plan into its main deliverable.'],['Finish and reflect','Polish the outcome and capture lessons learned.']] as const;
  const spread=(fraction:number)=>{const start=parseDateKey(plan.startDate)!,end=parseDateKey(plan.targetDate)!,span=Math.max(1,Math.round((end.getTime()-start.getTime())/86400000));return addDays(plan.startDate,Math.round(span*fraction))};
  const milestones=templates.map(([name,description],index):Milestone=>({id:crypto.randomUUID(),planId:plan.id,name,description,status:index?'Not Started':'In Progress',targetDate:spread([.2,.45,.75,1][index]),order:index+1,dependencies:[]}));
  milestones.forEach((milestone,index)=>{milestone.dependencies=index?[milestones[index-1].id]:[]});
  const tasks=milestones.flatMap((milestone,index)=>['Define the next result','Complete the focused work','Review and adjust'].map((title,taskIndex):Task=>({id:crypto.randomUUID(),planId:plan.id,milestoneId:milestone.id,title:index===2&&taskIndex===1?`Complete the core work for ${plan.name}`:title,status:index===0&&taskIndex===0?'To Do':'Backlog',priority:index===2?'High':plan.priority,assignee:'You',dueDate:spread(Math.min(1,([.2,.45,.75,1][index])*(taskIndex+1)/3)),estimate:2,tags:[plan.category.toLowerCase()].filter(Boolean),subtasks:[],dependencies:[],createdAt:new Date().toISOString()}));
  return{milestones,tasks};
}

export function workspaceMetrics(workspace:Workspace,today=localDateKey()){
  const complete=workspace.tasks.filter(task=>task.status==='Complete').length;
  const open=workspace.tasks.filter(isOpenTask);
  return{
    completion:workspace.tasks.length?Math.round(complete/workspace.tasks.length*100):0,
    complete,
    total:workspace.tasks.length,
    overdue:open.filter(task=>Boolean(task.dueDate&&task.dueDate<today)).length,
    dueToday:open.filter(task=>task.dueDate===today).length,
    unscheduled:open.filter(task=>!task.dueDate).length,
    openHours:open.reduce((sum,task)=>sum+task.estimate,0),
    blocked:open.filter(task=>task.status==='Blocked'||taskBlockers(workspace,task).length>0).length,
    activePlans:workspace.plans.filter(plan=>!['Completed','Archived'].includes(plan.status)).length,
    atRisk:workspace.plans.filter(plan=>['At Risk','Behind'].includes(planHealth(workspace,plan,today))).length
  };
}

export function chooseFreshestSnapshot(local:WorkspaceSnapshot,cloud:WorkspaceSnapshot|null){
  if(!cloud)return local;
  const localTime=Date.parse(local.savedAt),cloudTime=Date.parse(cloud.savedAt);
  if(Number.isNaN(localTime))return cloud;
  if(Number.isNaN(cloudTime))return local;
  return localTime>cloudTime?local:cloud;
}
