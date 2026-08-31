import {demoWorkspace} from './demo';
import type {Plan,Priority,Task,TaskStatus,Workspace} from './types';

const KEY='planora-workspace-v2';
const LEGACY_KEY='planora-workspace-v1';

function cloneDemo():Workspace{return structuredClone(demoWorkspace)}
function scopedKey(scope:string){return `${KEY}:${scope.replace(/[^a-zA-Z0-9:_-]/g,'_')}`}
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
function legacyPriority(value:unknown):Priority{
  return value==='Low'||value==='Medium'||value==='High'||value==='Urgent'?value:'Medium';
}
function migrateLegacy(value:unknown):Workspace|null{
  if(!value||typeof value!=='object')return null;
  const legacy=value as {projects?:unknown[];tasks?:unknown[]};
  if(!Array.isArray(legacy.projects)||!Array.isArray(legacy.tasks))return null;
  const createdAt=new Date().toISOString();
  const plans:Plan[]=legacy.projects.flatMap(raw=>{
    if(!raw||typeof raw!=='object')return [];
    const p=raw as Record<string,unknown>;
    if(typeof p.id!=='string'||typeof p.name!=='string')return [];
    return [{id:p.id,name:p.name,emoji:typeof p.emoji==='string'?p.emoji:'◇',description:typeof p.description==='string'?p.description:'',goal:typeof p.description==='string'?p.description:`Complete ${p.name}.`,color:typeof p.color==='string'?p.color:'#7f8cff',startDate:new Date().toISOString().slice(0,10),targetDate:dateFromLegacy(p.due),priority:'Medium',status:'Active',category:'General',tags:[],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt}];
  });
  const tasks:Task[]=legacy.tasks.flatMap(raw=>{
    if(!raw||typeof raw!=='object')return [];
    const t=raw as Record<string,unknown>;
    if(typeof t.id!=='string'||typeof t.projectId!=='string'||typeof t.title!=='string')return [];
    return [{id:t.id,planId:t.projectId,title:t.title,status:legacyStatus(t.status),priority:legacyPriority(t.priority),assignee:typeof t.assignee==='string'?t.assignee:'You',dueDate:dateFromLegacy(t.due),estimate:typeof t.estimate==='number'&&Number.isFinite(t.estimate)?Math.max(t.estimate,0):1,tags:Array.isArray(t.tags)?t.tags.filter((tag):tag is string=>typeof tag==='string'):[],notes:typeof t.note==='string'?t.note:undefined,subtasks:[],dependencies:[],createdAt}];
  });
  return {...cloneDemo(),plans,milestones:[],tasks,resources:[],notes:[],activity:[{id:crypto.randomUUID(),type:'plan',message:'Migrated your previous Planora workspace.',createdAt}],settings:cloneDemo().settings};
}

export function normalizeWorkspace(value:unknown):Workspace|null{
  if(!value||typeof value!=='object')return null;
  const w=value as Partial<Workspace>;
  if(!Array.isArray(w.plans)||!Array.isArray(w.tasks))return null;
  return {
    plans:w.plans as Workspace['plans'],
    milestones:Array.isArray(w.milestones)?w.milestones:[],
    tasks:w.tasks as Workspace['tasks'],
    resources:Array.isArray(w.resources)?w.resources:[],
    notes:Array.isArray(w.notes)?w.notes:[],
    activity:Array.isArray(w.activity)?w.activity:[],
    settings:w.settings&&typeof w.settings==='object'?{...cloneDemo().settings,...w.settings}:cloneDemo().settings
  };
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
  }catch{/* Browser storage can be unavailable in hardened contexts. */}
  return cloneDemo();
}

export function saveWorkspace(value:Workspace,scope='guest'){
  try{localStorage.setItem(scopedKey(scope),JSON.stringify(value))}catch{/* Keep the app usable if storage is unavailable. */}
}

export function resetWorkspace(scope='guest'){
  try{localStorage.removeItem(scopedKey(scope))}catch{/* noop */}
  return cloneDemo();
}

export function exportWorkspace(value:Workspace){
  return JSON.stringify(value,null,2);
}
