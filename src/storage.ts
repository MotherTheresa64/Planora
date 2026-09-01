import {demoWorkspace} from './demo';
import {emptyWorkspace,localDateKey,normalizeWorkspace} from './domain';
import type {Plan,Priority,Task,TaskStatus,Workspace,WorkspaceSnapshot} from './types';

const KEY='planora-workspace-v3';
const PREVIOUS_KEY='planora-workspace-v2';
const LEGACY_KEY='planora-workspace-v1';
const SCHEMA_VERSION=3;

const clone=<T,>(value:T):T=>structuredClone(value);
const scopedKey=(base:string,scope:string)=>`${base}:${scope.replace(/[^a-zA-Z0-9:_-]/g,'_')}`;
const now=()=>new Date().toISOString();

function parseSnapshot(raw:string):WorkspaceSnapshot|null{
  try{
    const value=JSON.parse(raw) as unknown;
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      const record=value as Record<string,unknown>;
      const workspace=normalizeWorkspace(record.workspace);
      if(workspace){
        const savedAt=typeof record.savedAt==='string'&&!Number.isNaN(Date.parse(record.savedAt))?new Date(record.savedAt).toISOString():now();
        return{workspace,savedAt};
      }
    }
    const workspace=normalizeWorkspace(value);
    return workspace?{workspace,savedAt:now()}:null;
  }catch{return null}
}

function dateFromLegacy(value:unknown){
  if(typeof value!=='string'||!value.trim())return localDateKey();
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const parsed=new Date(`${value}, ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime())?localDateKey():localDateKey(parsed);
}
function legacyStatus(value:unknown):TaskStatus{
  if(value==='Done')return'Complete';
  if(value==='In progress')return'In Progress';
  if(value==='Review')return'To Do';
  return'Backlog';
}
function legacyPriority(value:unknown):Priority{return value==='Low'||value==='Medium'||value==='High'||value==='Urgent'?value:'Medium'}
function migrateLegacy(value:unknown):Workspace|null{
  if(!value||typeof value!=='object')return null;
  const legacy=value as {projects?:unknown[];tasks?:unknown[]};
  if(!Array.isArray(legacy.projects)||!Array.isArray(legacy.tasks))return null;
  const createdAt=now();
  const plans:Plan[]=legacy.projects.flatMap(raw=>{
    if(!raw||typeof raw!=='object')return[];
    const item=raw as Record<string,unknown>;
    if(typeof item.id!=='string'||typeof item.name!=='string')return[];
    return[{id:item.id,name:item.name,emoji:typeof item.emoji==='string'?item.emoji:'◇',description:typeof item.description==='string'?item.description:'',goal:typeof item.description==='string'?item.description:`Complete ${item.name}.`,color:typeof item.color==='string'?item.color:'#7f8cff',startDate:localDateKey(),targetDate:dateFromLegacy(item.due),priority:'Medium',status:'Active',category:'General',tags:[],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt}];
  });
  const planIds=new Set(plans.map(plan=>plan.id));
  const tasks:Task[]=legacy.tasks.flatMap(raw=>{
    if(!raw||typeof raw!=='object')return[];
    const item=raw as Record<string,unknown>;
    if(typeof item.id!=='string'||typeof item.projectId!=='string'||typeof item.title!=='string'||!planIds.has(item.projectId))return[];
    return[{id:item.id,planId:item.projectId,title:item.title,status:legacyStatus(item.status),priority:legacyPriority(item.priority),assignee:typeof item.assignee==='string'?item.assignee:'You',dueDate:dateFromLegacy(item.due),estimate:typeof item.estimate==='number'&&Number.isFinite(item.estimate)?Math.max(item.estimate,0):2,tags:Array.isArray(item.tags)?item.tags.filter((tag):tag is string=>typeof tag==='string'):[],notes:typeof item.note==='string'?item.note:undefined,subtasks:[],dependencies:[],createdAt}];
  });
  return normalizeWorkspace({...emptyWorkspace(),plans,tasks,activity:[{id:crypto.randomUUID(),type:'plan',message:'Migrated your previous Planora workspace.',createdAt}]})??emptyWorkspace();
}

function read(base:string,scope:string){
  try{return localStorage.getItem(scopedKey(base,scope))}catch{return null}
}
function remove(base:string,scope:string){try{localStorage.removeItem(scopedKey(base,scope))}catch{/* storage may be unavailable */}}

export function loadWorkspaceSnapshot(scope='guest'):WorkspaceSnapshot{
  const current=read(KEY,scope);
  if(current){const parsed=parseSnapshot(current);if(parsed)return parsed}

  const previous=read(PREVIOUS_KEY,scope);
  if(previous){
    const parsed=parseSnapshot(previous);
    if(parsed){saveWorkspace(parsed.workspace,scope,parsed.savedAt);remove(PREVIOUS_KEY,scope);return parsed}
  }

  if(scope==='guest'){
    try{
      const unscoped=localStorage.getItem(PREVIOUS_KEY);
      if(unscoped){const parsed=parseSnapshot(unscoped);if(parsed){saveWorkspace(parsed.workspace,scope,parsed.savedAt);localStorage.removeItem(PREVIOUS_KEY);return parsed}}
      const legacy=localStorage.getItem(LEGACY_KEY);
      if(legacy){const migrated=migrateLegacy(JSON.parse(legacy));if(migrated){const snapshot={workspace:migrated,savedAt:now()};saveWorkspace(snapshot.workspace,scope,snapshot.savedAt);localStorage.removeItem(LEGACY_KEY);return snapshot}}
    }catch{/* hardened/private browser contexts can reject storage */}
  }

  return{workspace:emptyWorkspace(),savedAt:new Date(0).toISOString()};
}

export function loadWorkspace(scope='guest'){return loadWorkspaceSnapshot(scope).workspace}

export function saveWorkspace(value:Workspace,scope='guest',savedAt=now()):WorkspaceSnapshot{
  const workspace=normalizeWorkspace(value)??emptyWorkspace();
  const snapshot={workspace,savedAt};
  try{localStorage.setItem(scopedKey(KEY,scope),JSON.stringify({schemaVersion:SCHEMA_VERSION,...snapshot}))}catch{/* keep local-only usage functional if quota/storage is unavailable */}
  return snapshot;
}

export function resetWorkspace(scope='guest'){
  remove(KEY,scope);remove(PREVIOUS_KEY,scope);
  return emptyWorkspace();
}

export function demoSnapshot():WorkspaceSnapshot{return{workspace:clone(demoWorkspace),savedAt:now()}}
export function exportWorkspace(value:Workspace){return JSON.stringify({schemaVersion:SCHEMA_VERSION,exportedAt:now(),workspace:normalizeWorkspace(value)??emptyWorkspace()},null,2)}
export function parseWorkspaceImport(raw:string):Workspace{
  const parsed=JSON.parse(raw) as unknown;
  const root=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:null;
  const workspace=normalizeWorkspace(root?.workspace??parsed);
  if(!workspace)throw new Error('This file does not contain a valid Planora workspace.');
  return workspace;
}
