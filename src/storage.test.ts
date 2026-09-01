import assert from 'node:assert/strict';
import test from 'node:test';
import {demoSnapshot,loadWorkspaceSnapshot,parseWorkspaceImport,resetWorkspace,saveWorkspace} from './storage';
import {emptyWorkspace} from './domain';
import type {Plan,Workspace} from './types';

class MemoryStorage{
  private values=new Map<string,string>();
  get length(){return this.values.size}
  clear(){this.values.clear()}
  getItem(key:string){return this.values.get(key)??null}
  key(index:number){return [...this.values.keys()][index]??null}
  removeItem(key:string){this.values.delete(key)}
  setItem(key:string,value:string){this.values.set(key,String(value))}
}

const store=new MemoryStorage();
Object.defineProperty(globalThis,'localStorage',{value:store,configurable:true});

const plan:Plan={id:'p1',name:'Test plan',emoji:'◇',description:'Description',goal:'Finish it',color:'#7f8cff',startDate:'2026-09-01',targetDate:'2026-09-30',priority:'Medium',status:'Active',category:'Test',tags:[],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:'2026-09-01T12:00:00.000Z'};
const workspace=():Workspace=>({...emptyWorkspace(),plans:[plan]});

test.beforeEach(()=>store.clear());

test('first run is an empty real workspace rather than mandatory demo data',()=>{
  const snapshot=loadWorkspaceSnapshot('guest');
  assert.equal(snapshot.plans,undefined);
  assert.equal(snapshot.workspace.plans.length,0);
  assert.equal(snapshot.workspace.tasks.length,0);
  assert.equal(snapshot.savedAt,new Date(0).toISOString());
});

test('local snapshots are isolated by scope',()=>{
  saveWorkspace(workspace(),'user:alpha','2026-09-01T12:00:00.000Z');
  const alpha=loadWorkspaceSnapshot('user:alpha');
  const beta=loadWorkspaceSnapshot('user:beta');
  assert.equal(alpha.workspace.plans[0].id,'p1');
  assert.equal(beta.workspace.plans.length,0);
});

test('save normalizes malformed relationships before persistence',()=>{
  const state=workspace();
  state.tasks.push({id:'bad',planId:'missing',title:'Orphan task',status:'To Do',priority:'Medium',assignee:'You',estimate:2,tags:[],subtasks:[],dependencies:[],createdAt:'2026-09-01T12:00:00.000Z'});
  saveWorkspace(state,'guest','2026-09-01T12:00:00.000Z');
  const loaded=loadWorkspaceSnapshot('guest');
  assert.equal(loaded.workspace.tasks.length,0);
});

test('import accepts an export-style envelope and rejects non-workspace JSON',()=>{
  const imported=parseWorkspaceImport(JSON.stringify({schemaVersion:3,workspace:workspace()}));
  assert.equal(imported.plans[0].name,'Test plan');
  assert.throws(()=>parseWorkspaceImport(JSON.stringify({hello:'world'})),/valid Planora workspace/i);
});

test('reset clears only the requested scope and returns an empty workspace',()=>{
  saveWorkspace(workspace(),'guest');
  saveWorkspace(workspace(),'user:alpha');
  const reset=resetWorkspace('guest');
  assert.equal(reset.plans.length,0);
  assert.equal(loadWorkspaceSnapshot('guest').workspace.plans.length,0);
  assert.equal(loadWorkspaceSnapshot('user:alpha').workspace.plans.length,1);
});

test('sample data is opt-in and returned as an independent snapshot',()=>{
  const first=demoSnapshot();
  const second=demoSnapshot();
  assert.ok(first.workspace.plans.length>0);
  assert.notEqual(first.workspace,second.workspace);
  first.workspace.plans[0].name='Changed';
  assert.notEqual(first.workspace.plans[0].name,second.workspace.plans[0].name);
});
