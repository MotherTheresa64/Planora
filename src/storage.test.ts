const store=new Map<string,string>();
(globalThis as any).localStorage={
  getItem:(k:string)=>store.has(k)?store.get(k)!:null,
  setItem:(k:string,v:string)=>{store.set(k,v)},
  removeItem:(k:string)=>{store.delete(k)},
  clear:()=>store.clear(),
  key:()=>null,
  length:0
};
import {beforeEach,describe,expect,it} from 'vitest';
import {loadWorkspace,resetWorkspace,saveWorkspace,exportWorkspace,normalizeWorkspace} from './storage';
import {demoWorkspace} from './demo';

beforeEach(()=>store.clear());

describe('loadWorkspace',()=>{
  it('returns the demo on first load',()=>{
    const w=loadWorkspace('owner');
    expect(w.plans).toHaveLength(demoWorkspace.plans.length);
    expect(w.tasks).toHaveLength(demoWorkspace.tasks.length);
  });
  it('falls back to the demo on malformed JSON',()=>{
    store.set('planora-workspace-v2:owner','{bad');
    expect(loadWorkspace('owner').plans).toHaveLength(demoWorkspace.plans.length);
  });
  it('round-trips a saved workspace per scope',()=>{
    const w=loadWorkspace('owner');
    saveWorkspace(w,'owner');
    const loaded=loadWorkspace('owner');
    expect(loaded.plans[0].name).toBe(w.plans[0].name);
  });
  it('isolates different scopes',()=>{
    const w=loadWorkspace('owner');
    saveWorkspace(w,'owner');
    const guest=loadWorkspace('guest');
    expect(guest.plans).toHaveLength(demoWorkspace.plans.length);
  });
});

describe('resetWorkspace / exportWorkspace',()=>{
  it('resetWorkspace returns the demo and clears the scope',()=>{
    loadWorkspace('owner');
    saveWorkspace(loadWorkspace('owner'),'owner');
    const reset=resetWorkspace('owner');
    expect(reset.plans).toHaveLength(demoWorkspace.plans.length);
    expect(store.has('planora-workspace-v2:owner')).toBe(false);
  });
  it('exportWorkspace produces valid JSON',()=>{
    const w=loadWorkspace('owner');
    const json=exportWorkspace(w);
    expect(JSON.parse(json).plans).toHaveLength(w.plans.length);
  });
});

describe('normalizeWorkspace',()=>{
  it('rejects non-objects',()=>{
    expect(normalizeWorkspace(null)).toBeNull();
    expect(normalizeWorkspace('nope')).toBeNull();
    expect(normalizeWorkspace([1,2])).toBeNull();
  });
  it('rejects an object without plan arrays',()=>{
    expect(normalizeWorkspace({foo:1})).toBeNull();
  });
  it('normalizes a demo workspace',()=>{
    const n=normalizeWorkspace(demoWorkspace);
    expect(n?.plans).toHaveLength(demoWorkspace.plans.length);
    expect(n?.tasks).toHaveLength(demoWorkspace.tasks.length);
  });
});