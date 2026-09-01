import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseFreshestSnapshot,deleteMilestone,deletePlan,deleteTask,emptyWorkspace,localDateKey,
  milestoneProgress,normalizeWorkspace,planProgress,sanitizeUrl,syncDerivedState,validateMilestone,
  validateTask,wouldCreateTaskDependencyCycle,workspaceMetrics
} from './domain';
import type {Milestone,Plan,Task,Workspace} from './types';

const createdAt='2026-09-01T12:00:00.000Z';
const plan=(id='p1'):Plan=>({id,name:`Plan ${id}`,emoji:'◇',description:'A useful plan.',goal:'Ship the outcome.',color:'#7f8cff',startDate:'2026-09-01',targetDate:'2026-09-30',priority:'Medium',status:'Active',category:'General',tags:[],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt});
const milestone=(id='m1',planId='p1'):Milestone=>({id,planId,name:`Milestone ${id}`,description:'Checkpoint',status:'Not Started',targetDate:'2026-09-15',order:1,dependencies:[]});
const task=(id='t1',planId='p1'):Task=>({id,planId,title:`Task ${id}`,status:'To Do',priority:'Medium',assignee:'You',dueDate:'2026-09-10',estimate:2,tags:[],subtasks:[],dependencies:[],createdAt});
const workspace=():Workspace=>({...emptyWorkspace(),plans:[plan()],milestones:[milestone()],tasks:[{...task(),milestoneId:'m1'}]});

test('localDateKey uses local calendar fields instead of UTC slicing',()=>{
  const date=new Date(2026,0,2,0,30,0);
  assert.equal(localDateKey(date),'2026-01-02');
});

test('normalization drops dangling entities, bad cross-plan references, cycles, and unsafe URLs',()=>{
  const raw={
    ...emptyWorkspace(),
    plans:[plan('p1'),plan('p2')],
    milestones:[milestone('m1','p1'),{...milestone('m2','p2'),dependencies:['m1']}],
    tasks:[
      {...task('t1','p1'),dependencies:['t2','missing']},
      {...task('t2','p1'),dependencies:['t1']},
      {...task('t3','p2'),milestoneId:'m1',dependencies:['t1']},
      {...task('orphan','missing')}
    ],
    resources:[
      {id:'r1',planId:'p1',title:'Unsafe',kind:'Link',url:'javascript:alert(1)',createdAt},
      {id:'r2',planId:'missing',title:'Orphan',kind:'Reference',createdAt}
    ]
  };
  const normalized=normalizeWorkspace(raw);
  assert.ok(normalized);
  assert.equal(normalized.tasks.some(item=>item.id==='orphan'),false);
  assert.equal(normalized.resources.length,1);
  assert.equal(normalized.resources[0].url,undefined);
  assert.equal(normalized.tasks.find(item=>item.id==='t3')?.milestoneId,undefined);
  assert.deepEqual(normalized.tasks.find(item=>item.id==='t3')?.dependencies,[]);
  const t1=normalized.tasks.find(item=>item.id==='t1')!;
  const t2=normalized.tasks.find(item=>item.id==='t2')!;
  assert.equal(t1.dependencies.includes('missing'),false);
  assert.equal(t1.dependencies.includes('t2')&&t2.dependencies.includes('t1'),false);
  assert.deepEqual(normalized.milestones.find(item=>item.id==='m2')?.dependencies,[]);
});

test('task deletion cleans dependency references and detaches task notes',()=>{
  const state=workspace();
  state.tasks.push({...task('t2'),dependencies:['t1']});
  state.notes.push({id:'n1',planId:'p1',taskId:'t1',title:'Attached',body:'Keep me',createdAt,updatedAt:createdAt});
  state.activity.push({id:'a1',type:'task',taskId:'t1',planId:'p1',message:'Task activity',createdAt});
  const next=deleteTask(state,'t1');
  assert.equal(next.tasks.some(item=>item.id==='t1'),false);
  assert.deepEqual(next.tasks.find(item=>item.id==='t2')?.dependencies,[]);
  assert.equal(next.notes[0].taskId,undefined);
  assert.equal(next.activity.some(item=>item.taskId==='t1'),false);
});

test('milestone deletion keeps child work but removes invalid milestone links',()=>{
  const state=workspace();
  state.resources.push({id:'r1',planId:'p1',milestoneId:'m1',title:'Reference',kind:'Reference',createdAt});
  const next=deleteMilestone(state,'m1');
  assert.equal(next.milestones.length,0);
  assert.equal(next.tasks[0].milestoneId,undefined);
  assert.equal(next.resources[0].milestoneId,undefined);
});

test('plan deletion cascades owned entities while retaining unrelated activity',()=>{
  const state:Workspace={
    ...emptyWorkspace(),
    plans:[plan('p1'),plan('p2')],
    milestones:[milestone('m1','p1'),milestone('m2','p2')],
    tasks:[task('t1','p1'),task('t2','p2')],
    resources:[{id:'r1',planId:'p1',title:'One',kind:'Reference',createdAt},{id:'r2',planId:'p2',title:'Two',kind:'Reference',createdAt}],
    notes:[{id:'n1',planId:'p1',title:'One',body:'x',createdAt,updatedAt:createdAt},{id:'n2',planId:'p2',title:'Two',body:'y',createdAt,updatedAt:createdAt}],
    activity:[{id:'a1',type:'plan',planId:'p1',message:'Delete me',createdAt},{id:'a2',type:'plan',planId:'p2',message:'Keep me',createdAt}]
  };
  const next=deletePlan(state,'p1');
  assert.deepEqual(next.plans.map(item=>item.id),['p2']);
  assert.deepEqual(next.tasks.map(item=>item.id),['t2']);
  assert.deepEqual(next.milestones.map(item=>item.id),['m2']);
  assert.deepEqual(next.resources.map(item=>item.id),['r2']);
  assert.deepEqual(next.notes.map(item=>item.id),['n2']);
  assert.deepEqual(next.activity.map(item=>item.id),['a2']);
});

test('dependency validation rejects cross-plan and circular relationships',()=>{
  const state:Workspace={...emptyWorkspace(),plans:[plan('p1'),plan('p2')],tasks:[task('t1','p1'),{...task('t2','p1'),dependencies:['t1']},task('t3','p2')]};
  assert.equal(wouldCreateTaskDependencyCycle(state,'t1','t2'),true);
  assert.match(validateTask({...task('t1','p1'),dependencies:['t2']},state)??'',/cycle/i);
  assert.match(validateTask({...task('new','p1'),dependencies:['t3']},state)??'',/same plan/i);
});

test('milestone validation keeps targets inside the plan timeline',()=>{
  const state=workspace();
  assert.equal(validateMilestone({...milestone(),targetDate:'2026-09-20'},state),null);
  assert.match(validateMilestone({...milestone(),targetDate:'2026-10-01'},state)??'',/inside the plan timeline/i);
});

test('progress and derived milestone status use task completion deterministically',()=>{
  const state=workspace();
  state.tasks.push({...task('t2'),milestoneId:'m1',status:'Complete',completedAt:createdAt});
  let next=syncDerivedState(state);
  assert.equal(milestoneProgress(next,'m1'),50);
  assert.equal(planProgress(next,'p1'),50);
  assert.equal(next.milestones[0].status,'In Progress');
  next=syncDerivedState({...next,tasks:next.tasks.map(item=>({...item,status:'Complete',completedAt:createdAt}))});
  assert.equal(next.milestones[0].status,'Complete');
  assert.equal(planProgress(next,'p1'),100);
});

test('workspace metrics distinguish overdue, due-today, and unscheduled work',()=>{
  const state:Workspace={...emptyWorkspace(),plans:[plan()],tasks:[
    {...task('late'),dueDate:'2026-08-31'},
    {...task('today'),dueDate:'2026-09-01'},
    {...task('none'),dueDate:undefined},
    {...task('done'),dueDate:'2026-08-30',status:'Complete',completedAt:createdAt}
  ]};
  const metrics=workspaceMetrics(state,'2026-09-01');
  assert.equal(metrics.overdue,1);
  assert.equal(metrics.dueToday,1);
  assert.equal(metrics.unscheduled,1);
  assert.equal(metrics.complete,1);
});

test('snapshot conflict resolution uses the newest savedAt value',()=>{
  const local={workspace:workspace(),savedAt:'2026-09-01T12:00:00.000Z'};
  const cloud={workspace:{...workspace(),plans:[plan('cloud')]},savedAt:'2026-09-01T13:00:00.000Z'};
  assert.equal(chooseFreshestSnapshot(local,cloud),cloud);
  assert.equal(chooseFreshestSnapshot(local,null),local);
});

test('URL sanitizer permits web links only',()=>{
  assert.equal(sanitizeUrl('javascript:alert(1)'),undefined);
  assert.equal(sanitizeUrl('file:///tmp/example'),undefined);
  assert.equal(sanitizeUrl('https://example.com/path'),'https://example.com/path');
});
