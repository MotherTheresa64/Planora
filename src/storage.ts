import {demoWorkspace} from './demo';
import type {Priority,Project,Status,Task,Workspace} from './types';

const KEY='planora-workspace-v1';
const statuses:Status[]=['Backlog','In progress','Review','Done'];
const priorities:Priority[]=['Low','Medium','High','Urgent'];

const isStringArray=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');

function isProject(value:unknown):value is Project{
  if(!value||typeof value!=='object')return false;
  const p=value as Partial<Project>;
  return typeof p.id==='string'&&typeof p.name==='string'&&typeof p.emoji==='string'&&
    typeof p.description==='string'&&typeof p.color==='string'&&typeof p.progress==='number'&&
    Number.isFinite(p.progress)&&typeof p.due==='string'&&isStringArray(p.members);
}

function isTask(value:unknown):value is Task{
  if(!value||typeof value!=='object')return false;
  const t=value as Partial<Task>;
  return typeof t.id==='string'&&typeof t.projectId==='string'&&typeof t.title==='string'&&
    statuses.includes(t.status as Status)&&priorities.includes(t.priority as Priority)&&
    typeof t.assignee==='string'&&typeof t.due==='string'&&typeof t.estimate==='number'&&
    Number.isFinite(t.estimate)&&t.estimate>=0&&isStringArray(t.tags)&&
    (t.note===undefined||typeof t.note==='string');
}

function isWorkspace(value:unknown):value is Workspace{
  if(!value||typeof value!=='object')return false;
  const w=value as Partial<Workspace>;
  return Array.isArray(w.projects)&&w.projects.every(isProject)&&Array.isArray(w.tasks)&&w.tasks.every(isTask);
}

function freshDemo(){return structuredClone(demoWorkspace)}

export function loadWorkspace():Workspace{
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return freshDemo();
    const parsed:unknown=JSON.parse(raw);
    if(isWorkspace(parsed))return parsed;
    localStorage.removeItem(KEY);
    return freshDemo();
  }catch{
    return freshDemo();
  }
}

export function saveWorkspace(value:Workspace){
  try{localStorage.setItem(KEY,JSON.stringify(value))}catch{
    // Quota/privacy restrictions should not make the UI unusable.
  }
}

export function resetWorkspace(){
  try{localStorage.removeItem(KEY)}catch{
    // Storage can be disabled in hardened/private browser contexts.
  }
  return freshDemo();
}
