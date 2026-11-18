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
import {DEFAULT_THEME,STORAGE_KEY,themes} from './theme';

describe('Planora theme',()=>{
  beforeEach(()=>store.clear());
  it('defines the four themes in order',()=>{
    expect(themes.map(t=>t.id)).toEqual(['midnight','aurora','ember','graphite']);
    expect(DEFAULT_THEME).toBe('aurora');
  });
  it('has a stable storage key',()=>{
    expect(STORAGE_KEY).toBe('planora-theme-v2');
  });
});