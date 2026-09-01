import {useEffect,useMemo,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {User} from 'firebase/auth';
import {
  AlertTriangle,BarChart3,Bell,BookOpen,CalendarDays,CheckCircle2,ChevronDown,Cloud,CloudOff,
  Command,Download,Edit3,ExternalLink,FileText,Flag,FolderKanban,GripVertical,LayoutDashboard,
  ListTodo,LogOut,Menu,Plus,RotateCcw,Route,Search,Sparkles,Target,Trash2,TrendingUp,Upload,Users,X
} from 'lucide-react';
import type {Milestone,Note,Plan,PlanStatus,Priority,Resource,ResourceKind,Task,TaskStatus,Workspace} from './types';
import {
  PLAN_STATUSES,PRIORITIES,RESOURCE_KINDS,TASK_STATUSES,addActivity,addDays,chooseFreshestSnapshot,
  compareTaskDates,deleteMilestone,deletePlan,deleteTask,formatDateKey,generateStarterPlan,initials,
  isOpenTask,isOverdue,localDateKey,milestoneProgress,planHealth,planProgress,sanitizeUrl,syncDerivedState,
  taskBlockers,updateTaskStatus,validateMilestone,validateNote,validatePlan,validateResource,validateTask,
  workspaceMetrics
} from './domain';
import {demoSnapshot,exportWorkspace,loadWorkspaceSnapshot,parseWorkspaceImport,resetWorkspace,saveWorkspace} from './storage';
import {firebaseReady,firstName,loadCloudWorkspace,saveCloudWorkspace,signInGoogle,signOutUser,subscribeAuth} from './firebase';

type View='Dashboard'|'Today'|'Plans'|'Tasks'|'Roadmap'|'Calendar'|'Resources'|'Insights';
type ModalState={kind:'task'|'plan'|'milestone'|'resource'|'note';id?:string}|null;
type SaveResult=string|null;

const nav:[View,typeof LayoutDashboard][]=[
  ['Dashboard',LayoutDashboard],['Today',ListTodo],['Plans',Target],['Tasks',FolderKanban],
  ['Roadmap',Route],['Calendar',CalendarDays],['Resources',BookOpen],['Insights',BarChart3]
];
const descriptions:Record<View,string>={
  Dashboard:'Your command center for plans, deadlines, progress, and next actions.',
  Today:'A focused view of what deserves your attention right now.',
  Plans:'Turn goals into milestones, tasks, resources, and measurable progress.',
  Tasks:'Manage work across plans with a practical Kanban workflow.',
  Roadmap:'See how milestones connect today’s work to the larger goal.',
  Calendar:'Understand deadlines and scheduled work in context.',
  Resources:'Keep useful references attached to the work they support.',
  Insights:'Measure progress, workload, risks, and achievements.'
};
const nowIso=()=>new Date().toISOString();
const nextTaskStatus=(status:TaskStatus)=>TASK_STATUSES[Math.min(TASK_STATUSES.indexOf(status)+1,TASK_STATUSES.length-1)];

export default function App(){
  const first=useMemo(()=>loadWorkspaceSnapshot('guest'),[]);
  const [scope,setScope]=useState('guest');
  const [data,setData]=useState<Workspace>(first.workspace);
  const [user,setUser]=useState<User|null>(null);
  const [authLoading,setAuthLoading]=useState(firebaseReady);
  const [cloud,setCloud]=useState<'local'|'syncing'|'synced'|'error'>(firebaseReady?'syncing':'local');
  const [view,setView]=useState<View>('Dashboard');
  const [selected,setSelected]=useState('all');
  const [query,setQuery]=useState('');
  const [modal,setModal]=useState<ModalState>(null);
  const [menu,setMenu]=useState(false);
  const [toast,setToast]=useState('');
  const searchRef=useRef<HTMLInputElement>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const skipSave=useRef(false);
  const authSequence=useRef(0);

  useEffect(()=>subscribeAuth(authUser=>{
    const sequence=++authSequence.current;
    setAuthLoading(true);
    void(async()=>{
      const nextScope=authUser?`user:${authUser.uid}`:'guest';
      const local=loadWorkspaceSnapshot(nextScope);
      let chosen=local;
      let cloudSnapshot=null;
      let nextCloud:'local'|'syncing'|'synced'|'error'=authUser?'syncing':'local';
      if(authUser){
        try{
          cloudSnapshot=await loadCloudWorkspace(authUser.uid);
          chosen=chooseFreshestSnapshot(local,cloudSnapshot);
          nextCloud='synced';
          if(chosen===cloudSnapshot)saveWorkspace(chosen.workspace,nextScope,chosen.savedAt);
          else if(chosen.savedAt!==new Date(0).toISOString())await saveCloudWorkspace(authUser.uid,chosen.workspace,chosen.savedAt);
        }catch{nextCloud='error'}
      }
      if(sequence!==authSequence.current)return;
      skipSave.current=true;
      setUser(authUser);
      setScope(nextScope);
      setData(chosen.workspace);
      setCloud(nextCloud);
      setAuthLoading(false);
      setSelected('all');
    })();
  }),[]);

  useEffect(()=>{
    if(skipSave.current){skipSave.current=false;return}
    const savedAt=nowIso();
    saveWorkspace(data,scope,savedAt);
    if(!user){setCloud('local');return}
    setCloud('syncing');
    const timer=window.setTimeout(()=>{
      void saveCloudWorkspace(user.uid,data,savedAt).then(()=>setCloud('synced')).catch(()=>setCloud('error'));
    },650);
    return()=>window.clearTimeout(timer);
  },[data,scope,user]);

  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(timer)},[toast]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus()}
      if(event.key==='Escape'){setModal(null);setMenu(false)}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();if(!q)return null;
    return{
      plans:data.plans.filter(plan=>`${plan.name} ${plan.goal} ${plan.description} ${plan.category} ${plan.tags.join(' ')}`.toLowerCase().includes(q)),
      tasks:data.tasks.filter(task=>`${task.title} ${task.description??''} ${task.notes??''} ${task.tags.join(' ')} ${task.assignee}`.toLowerCase().includes(q)),
      milestones:data.milestones.filter(item=>`${item.name} ${item.description}`.toLowerCase().includes(q)),
      resources:data.resources.filter(item=>`${item.title} ${item.notes??''} ${item.kind}`.toLowerCase().includes(q)),
      notes:data.notes.filter(note=>`${note.title} ${note.body}`.toLowerCase().includes(q))
    };
  },[data,query]);

  const openPlan=(id:string)=>{setSelected(id);setQuery('');setView('Plans');setMenu(false)};
  const show=(message:string)=>setToast(message);

  const moveTask=(id:string,status:TaskStatus)=>{
    const task=data.tasks.find(item=>item.id===id);if(!task||task.status===status)return;
    const blockers=taskBlockers(data,task);
    if(blockers.length&&['In Progress','Complete'].includes(status)){
      show(`Finish ${blockers.length} dependenc${blockers.length===1?'y':'ies'} before moving this task forward.`);return;
    }
    setData(current=>addActivity(updateTaskStatus(current,id,status),`${status==='Complete'?'Completed':'Moved'} “${task.title}”${status==='Complete'?'.':` to ${status}.`}`,'task',task.planId,task.id));
    show(status==='Complete'?'Task completed':`Moved to ${status}`);
  };

  const saveTaskRecord=(task:Task):SaveResult=>{
    const existing=data.tasks.find(item=>item.id===task.id);
    const error=validateTask(task,data);if(error)return error;
    const normalized:Task={...task,title:task.title.trim(),description:task.description?.trim()||undefined,notes:task.notes?.trim()||undefined,tags:Array.from(new Set(task.tags.map(tag=>tag.trim()).filter(Boolean))),updatedAt:nowIso(),completedAt:task.status==='Complete'?(task.completedAt??nowIso()):undefined};
    setData(current=>{
      const tasks=existing?current.tasks.map(item=>item.id===task.id?normalized:item):[normalized,...current.tasks];
      return addActivity(syncDerivedState({...current,tasks}),`${existing?'Updated':'Created'} “${normalized.title}”.`,'task',normalized.planId,normalized.id);
    });
    setModal(null);show(existing?'Task updated':'Task created');return null;
  };

  const savePlanRecord=(plan:Plan,smart=false):SaveResult=>{
    const existing=data.plans.find(item=>item.id===plan.id);
    const error=validatePlan(plan);if(error)return error;
    if(existing){
      const invalidMilestone=data.milestones.find(item=>item.planId===plan.id&&(item.targetDate<plan.startDate||item.targetDate>plan.targetDate));
      if(invalidMilestone)return`Adjust “${invalidMilestone.name}” before shortening this plan timeline.`;
    }
    const normalized:Plan={...plan,name:plan.name.trim(),goal:plan.goal.trim(),description:plan.description.trim(),category:plan.category.trim()||'General',tags:Array.from(new Set(plan.tags.map(tag=>tag.trim()).filter(Boolean))),updatedAt:nowIso(),completedAt:plan.status==='Completed'?(plan.completedAt??nowIso()):undefined};
    setData(current=>{
      let next:Workspace={...current,plans:existing?current.plans.map(item=>item.id===plan.id?normalized:item):[normalized,...current.plans]};
      if(!existing&&smart){const generated=generateStarterPlan(normalized);next={...next,milestones:[...generated.milestones,...next.milestones],tasks:[...generated.tasks,...next.tasks]}}
      return addActivity(syncDerivedState(next),`${existing?'Updated':smart?'Generated starter plan for':'Created'} “${normalized.name}”.`,'plan',normalized.id);
    });
    setSelected(normalized.id);setView('Plans');setModal(null);show(existing?'Plan updated':smart?'Starter plan generated':'Plan created');return null;
  };

  const saveMilestoneRecord=(milestone:Milestone):SaveResult=>{
    const existing=data.milestones.find(item=>item.id===milestone.id);
    const error=validateMilestone(milestone,data);if(error)return error;
    const normalized={...milestone,name:milestone.name.trim(),description:milestone.description.trim(),updatedAt:nowIso()};
    setData(current=>{
      const milestones=existing?current.milestones.map(item=>item.id===milestone.id?normalized:item):[...current.milestones,normalized];
      return addActivity(syncDerivedState({...current,milestones}),`${existing?'Updated':'Created'} milestone “${normalized.name}”.`,'milestone',normalized.planId);
    });
    setModal(null);show(existing?'Milestone updated':'Milestone created');return null;
  };

  const saveResourceRecord=(resource:Resource):SaveResult=>{
    const existing=data.resources.find(item=>item.id===resource.id);
    const error=validateResource(resource,data);if(error)return error;
    const normalized={...resource,title:resource.title.trim(),url:sanitizeUrl(resource.url),notes:resource.notes?.trim()||undefined,updatedAt:nowIso()};
    setData(current=>addActivity({...current,resources:existing?current.resources.map(item=>item.id===resource.id?normalized:item):[normalized,...current.resources]},`${existing?'Updated':'Added'} resource “${normalized.title}”.`,'resource',normalized.planId));
    setModal(null);show(existing?'Resource updated':'Resource added');return null;
  };

  const saveNoteRecord=(note:Note):SaveResult=>{
    const existing=data.notes.find(item=>item.id===note.id);
    const error=validateNote(note,data);if(error)return error;
    const normalized={...note,title:note.title.trim(),body:note.body.trim(),updatedAt:nowIso()};
    setData(current=>addActivity({...current,notes:existing?current.notes.map(item=>item.id===note.id?normalized:item):[normalized,...current.notes]},`${existing?'Updated':'Added'} note “${normalized.title}”.`,'note',normalized.planId,note.taskId));
    setModal(null);show(existing?'Note updated':'Note added');return null;
  };

  const removeTask=(id:string)=>{
    const task=data.tasks.find(item=>item.id===id);if(!task)return;
    if(!window.confirm(`Delete “${task.title}”? Dependencies pointing to it will be cleaned up automatically.`))return;
    setData(current=>addActivity(deleteTask(current,id),`Deleted task “${task.title}”.`,'task',task.planId));show('Task deleted');
  };
  const removeMilestone=(id:string)=>{
    const item=data.milestones.find(milestone=>milestone.id===id);if(!item)return;
    if(!window.confirm(`Delete milestone “${item.name}”? Its tasks and resources will remain in the plan and become unassigned from this milestone.`))return;
    setData(current=>addActivity(deleteMilestone(current,id),`Deleted milestone “${item.name}”.`,'milestone',item.planId));show('Milestone deleted');
  };
  const removePlan=(id:string)=>{
    const plan=data.plans.find(item=>item.id===id);if(!plan)return;
    if(!window.confirm(`Delete “${plan.name}” and all tasks, milestones, resources, and notes inside it? This cannot be undone.`))return;
    setData(current=>deletePlan(current,id));setSelected('all');setView('Dashboard');show('Plan deleted');
  };
  const removeResource=(id:string)=>{
    const resource=data.resources.find(item=>item.id===id);if(!resource)return;
    if(!window.confirm(`Delete resource “${resource.title}”?`))return;
    setData(current=>({...current,resources:current.resources.filter(item=>item.id!==id)}));show('Resource deleted');
  };
  const removeNote=(id:string)=>{
    const note=data.notes.find(item=>item.id===id);if(!note)return;
    if(!window.confirm(`Delete note “${note.title}”?`))return;
    setData(current=>({...current,notes:current.notes.filter(item=>item.id!==id)}));show('Note deleted');
  };

  const download=()=>{
    const url=URL.createObjectURL(new Blob([exportWorkspace(data)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`planora-${localDateKey()}.json`;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  const importFile=async(file:File)=>{
    try{
      const workspace=parseWorkspaceImport(await file.text());
      if(data.plans.length&&!window.confirm('Replace the current workspace with the imported Planora file?'))return;
      setData(workspace);setSelected('all');setView('Dashboard');show('Workspace imported');
    }catch(error){show(error instanceof Error?error.message:'Could not import that workspace.')}
  };
  const loadSample=()=>{
    if((data.plans.length||data.tasks.length)&&!window.confirm('Replace the current workspace with Planora sample data?'))return;
    setData(demoSnapshot().workspace);setSelected('all');setView('Dashboard');show('Sample workspace loaded');
  };
  const reset=()=>{
    if((data.plans.length||data.tasks.length)&&!window.confirm('Clear this Planora workspace? Export first if you need a backup.'))return;
    setData(resetWorkspace(scope));setSelected('all');setQuery('');setView('Dashboard');show('Workspace cleared');
  };

  const metrics=workspaceMetrics(data);
  const currentPlan=data.plans.find(plan=>plan.id===selected);
  const modalRecord=modal?.id;

  return <div className="app-shell">
    <aside id="planora-sidebar" className={menu?'sidebar open':'sidebar'} aria-label="Primary navigation">
      <div className="brand"><span className="brand-mark">P</span><span>planora</span></div>
      <div className="workspace" aria-label={user?'Cloud workspace':'Local guest workspace'}>
        <span className="avatar small">{user?initials(firstName(user)):'P'}</span>
        <span><b>{user?`${firstName(user)}'s workspace`:'Personal workspace'}</b><small>{authLoading?'Checking session…':cloud==='synced'?'Cloud synced':cloud==='syncing'?'Syncing…':cloud==='error'?'Cloud unavailable · local backup active':'Local persistence'}</small></span>
        {cloud==='synced'?<Cloud size={15}/>:<CloudOff size={15}/>} 
      </div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={view===label?'nav active':'nav'} aria-current={view===label?'page':undefined} onClick={()=>{setView(label);setMenu(false)}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-label">Active plans <button onClick={()=>setModal({kind:'plan'})} aria-label="Create plan"><Plus size={15}/></button></div>
      <div className="project-nav">{data.plans.filter(plan=>!['Archived','Completed'].includes(plan.status)).slice(0,7).map(plan=><button key={plan.id} onClick={()=>openPlan(plan.id)}><span style={{background:plan.color}}/>{plan.name}</button>)}{!data.plans.length&&<small className="sidebar-empty">No plans yet</small>}</div>
      <div className="sidebar-bottom">
        <div className="focus-card"><Sparkles size={18}/><b>Planora focus</b><p>See overdue, due-now, and next work without digging through every plan.</p><button onClick={()=>{setView('Today');setMenu(false)}}>Open Today</button></div>
        <div className="utility-actions">
          <button className="reset" onClick={download}><Download size={15}/>Export</button>
          <button className="reset" onClick={()=>importRef.current?.click()}><Upload size={15}/>Import</button>
          <button className="reset" onClick={loadSample}><Sparkles size={15}/>Sample</button>
          <button className="reset" onClick={reset}><RotateCcw size={15}/>Clear</button>
        </div>
        <input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file)void importFile(file);event.currentTarget.value=''}}/>
      </div>
    </aside>

    <main>
      <header>
        <button className="mobile-menu" onClick={()=>setMenu(value=>!value)} aria-label="Toggle navigation" aria-controls="planora-sidebar" aria-expanded={menu}><Menu/></button>
        <div className="search"><Search size={17}/><input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search plans, tasks, milestones, resources…" aria-label="Search workspace"/><span><Command size={13}/>K</span></div>
        <div className="header-actions">
          <button className="icon-btn" onClick={()=>show(metrics.overdue+metrics.atRisk?`${metrics.overdue} overdue task${metrics.overdue===1?'':'s'} · ${metrics.atRisk} plan${metrics.atRisk===1?'':'s'} at risk`:'You’re all caught up')} aria-label="Workspace alerts"><Bell size={19}/>{metrics.overdue+metrics.atRisk>0&&<i/>}</button>
          <button className="user-button" disabled={authLoading} onClick={user?()=>void signOutUser().catch(()=>show('Sign-out failed.')):async()=>{if(!firebaseReady){show('Firebase is not configured, so Planora is using local guest mode.');return}try{await signInGoogle()}catch{show('Google sign-in was cancelled or unavailable.')}}}>
            <span className="avatar">{user?initials(firstName(user)):'G'}</span><span className="user-copy"><b>{user?firstName(user):'Guest'}</b><small>{user?'Sign out':firebaseReady?'Sign in with Google':'Local guest mode'}</small></span>{user?<LogOut size={14}/>:<ChevronDown size={14}/>} 
          </button>
        </div>
      </header>

      <section className="content">
        <div className="page-head"><div><p className="eyebrow">{new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date())}</p><h1>{view==='Dashboard'?`Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${user?firstName(user):'there'}.`:view}</h1><p>{results?'Search across the complete workspace.':descriptions[view]}</p></div><div className="page-actions"><button className="secondary" onClick={()=>setModal({kind:'plan'})}><Target size={16}/>New plan</button><button className="primary" onClick={()=>setModal({kind:'task'})} disabled={!data.plans.length}><Plus size={17}/>New task</button></div></div>
        {results?<SearchResults data={data} results={results} openPlan={openPlan} editTask={id=>setModal({kind:'task',id})}/>:<ViewBody view={view} data={data} selected={selected} setSelected={setSelected} openPlan={openPlan} moveTask={moveTask} setData={setData} setModal={setModal} removeTask={removeTask} removeMilestone={removeMilestone} removePlan={removePlan} removeResource={removeResource} removeNote={removeNote} loadSample={loadSample}/>} 
      </section>
    </main>

    {modal?.kind==='task'&&<TaskModal data={data} existing={modalRecord?data.tasks.find(item=>item.id===modalRecord):undefined} selected={selected} close={()=>setModal(null)} save={saveTaskRecord}/>} 
    {modal?.kind==='plan'&&<PlanModal owner={user?firstName(user):'You'} existing={modalRecord?data.plans.find(item=>item.id===modalRecord):undefined} close={()=>setModal(null)} save={savePlanRecord}/>} 
    {modal?.kind==='milestone'&&<MilestoneModal data={data} existing={modalRecord?data.milestones.find(item=>item.id===modalRecord):undefined} planId={currentPlan?.id??selected} close={()=>setModal(null)} save={saveMilestoneRecord}/>} 
    {modal?.kind==='resource'&&<ResourceModal data={data} existing={modalRecord?data.resources.find(item=>item.id===modalRecord):undefined} selected={selected} close={()=>setModal(null)} save={saveResourceRecord}/>} 
    {modal?.kind==='note'&&<NoteModal data={data} existing={modalRecord?data.notes.find(item=>item.id===modalRecord):undefined} planId={currentPlan?.id??selected} close={()=>setModal(null)} save={saveNoteRecord}/>} 
    {toast&&<div className="toast" role="status" aria-live="polite"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function ViewBody({view,...props}:{view:View;data:Workspace;selected:string;setSelected:(value:string)=>void;openPlan:(id:string)=>void;moveTask:(id:string,status:TaskStatus)=>void;setData:Dispatch<SetStateAction<Workspace>>;setModal:(modal:ModalState)=>void;removeTask:(id:string)=>void;removeMilestone:(id:string)=>void;removePlan:(id:string)=>void;removeResource:(id:string)=>void;removeNote:(id:string)=>void;loadSample:()=>void}){
  if(view==='Dashboard')return <Dashboard {...props}/>;
  if(view==='Today')return <Today {...props}/>;
  if(view==='Plans')return <Plans {...props}/>;
  if(view==='Tasks')return <Board {...props}/>;
  if(view==='Roadmap')return <RoadmapView {...props}/>;
  if(view==='Calendar')return <CalendarView {...props}/>;
  if(view==='Resources')return <ResourcesView {...props}/>;
  return <Insights {...props}/>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="metric"><strong>{value}</strong><b>{label}</b><p>{note}</p></div>}
function Status({value}:{value:PlanStatus}){return <span className={`plan-status ${value.toLowerCase().replaceAll(' ','-')}`}>{value}</span>}
function Empty({title,body,action}:{title:string;body:string;action?:React.ReactNode}){return <div className="empty-state"><Sparkles size={22}/><b>{title}</b><p>{body}</p>{action}</div>}

function TaskRow({task,data,moveTask,editTask}:{task:Task;data:Workspace;moveTask:(id:string,status:TaskStatus)=>void;editTask:(id:string)=>void}){
  const plan=data.plans.find(item=>item.id===task.planId),blockers=taskBlockers(data,task);
  return <div className="task-row"><button className={`status-dot ${task.status==='Complete'?'complete':''}`} onClick={()=>moveTask(task.id,nextTaskStatus(task.status))} disabled={task.status==='Complete'} aria-label={task.status==='Complete'?`${task.title} complete`:`Advance ${task.title}`}>{task.status==='Complete'?'✓':blockers.length?'!':''}</button><div className="task-main"><b>{task.title}</b><small><span style={{background:plan?.color}}/>{plan?.name??'Unknown plan'} · {formatDateKey(task.dueDate)}{blockers.length?` · ${blockers.length} blocker${blockers.length===1?'':'s'}`:''}</small></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><button className="icon-action" onClick={()=>editTask(task.id)} aria-label={`Edit ${task.title}`}><Edit3 size={15}/></button></div>;
}

function Dashboard({data,moveTask,openPlan,setModal,loadSample}:{data:Workspace;moveTask:(id:string,status:TaskStatus)=>void;openPlan:(id:string)=>void;setModal:(modal:ModalState)=>void;loadSample:()=>void}){
  const metrics=workspaceMetrics(data),openTasks=data.tasks.filter(isOpenTask),active=data.plans.filter(plan=>!['Archived','Completed'].includes(plan.status)),nextTasks=[...openTasks].sort(compareTaskDates).slice(0,6),risk=active.filter(plan=>['At Risk','Behind'].includes(planHealth(data,plan)));
  if(!data.plans.length)return <Empty title="Turn an idea into an executable plan" body="Create a plan from scratch, or load an optional sample workspace to explore Planora without mixing demo data into your real workspace." action={<div className="empty-actions"><button className="primary" onClick={()=>setModal({kind:'plan'})}><Plus size={16}/>Create first plan</button><button className="secondary" onClick={loadSample}><Sparkles size={16}/>Load sample workspace</button></div>}/>;
  return <><div className="metric-grid"><Metric label="Overall progress" value={`${metrics.completion}%`} note={`${metrics.complete} of ${metrics.total} tasks complete`}/><Metric label="Due today" value={`${metrics.dueToday}`} note={`${metrics.overdue} overdue · ${metrics.unscheduled} unscheduled`}/><Metric label="Active plans" value={`${metrics.activePlans}`} note={`${risk.length} currently need attention`}/><Metric label="Open effort" value={`${metrics.openHours}h`} note={`${metrics.blocked} blocked by status or dependencies`}/></div><div className="section-title"><div><h2>Active plans</h2><p>Goals with measurable progress and next actions.</p></div></div><div className="projects-grid">{active.slice(0,6).map(plan=><button className="project-card" key={plan.id} onClick={()=>openPlan(plan.id)}><div className="project-top"><span className="project-icon" style={{background:`${plan.color}22`,color:plan.color}}>{plan.emoji}</span><Status value={planHealth(data,plan)}/></div><h3>{plan.name}</h3><p>{plan.goal}</p><div className="progress-meta"><span>{planProgress(data,plan.id)}% complete</span><span>Target {formatDateKey(plan.targetDate)}</span></div><div className="progress"><i style={{width:`${planProgress(data,plan.id)}%`,background:plan.color}}/></div></button>)}</div><div className="two-col dashboard-lower"><section><div className="section-title"><div><h2>What to do next</h2><p>Nearest open deadlines across your plans.</p></div></div><div className="task-list">{nextTasks.map(task=><TaskRow key={task.id} task={task} data={data} moveTask={moveTask} editTask={id=>setModal({kind:'task',id})}/>)}{!nextTasks.length&&<div className="empty compact">No open tasks. Nice work.</div>}</div></section><section><div className="section-title"><div><h2>Recent activity</h2><p>Changes made in this workspace.</p></div></div><div className="activity-list">{data.activity.slice(0,7).map(item=><div key={item.id}><span className="activity-dot"/><div><b>{item.message}</b><small>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(item.createdAt))}</small></div></div>)}{!data.activity.length&&<div className="empty compact">Activity will appear as you work.</div>}</div></section></div></>;
}

function Today({data,moveTask,setModal}:{data:Workspace;moveTask:(id:string,status:TaskStatus)=>void;setModal:(modal:ModalState)=>void}){
  const today=localDateKey(),tasks=[...data.tasks].filter(isOpenTask).sort(compareTaskDates),groups:[string,Task[]][]=[['Overdue',tasks.filter(task=>isOverdue(task,today))],['Today',tasks.filter(task=>task.dueDate===today)],['Coming next',tasks.filter(task=>Boolean(task.dueDate&&task.dueDate>today)).slice(0,10)],['Unscheduled',tasks.filter(task=>!task.dueDate)]];
  return <>{groups.map(([title,list])=><section className="today-section" key={title}><div className="section-title"><div><h2>{title}</h2></div><span className="count-pill">{list.length}</span></div><div className="task-list">{list.map(task=><TaskRow key={task.id} task={task} data={data} moveTask={moveTask} editTask={id=>setModal({kind:'task',id})}/>)}{!list.length&&<div className="empty compact">Nothing here.</div>}</div></section>)}</>;
}

function Plans({data,selected,setSelected,moveTask,setModal,removePlan,removeMilestone,removeNote}:{data:Workspace;selected:string;setSelected:(value:string)=>void;moveTask:(id:string,status:TaskStatus)=>void;setModal:(modal:ModalState)=>void;removePlan:(id:string)=>void;removeMilestone:(id:string)=>void;removeNote:(id:string)=>void}){
  const plan=data.plans.find(item=>item.id===selected)??data.plans[0];if(!plan)return <Empty title="No plans yet" body="Create a plan to connect a goal to milestones, tasks, resources, and progress." action={<button className="primary" onClick={()=>setModal({kind:'plan'})}><Plus size={16}/>Create plan</button>}/>;
  const milestones=data.milestones.filter(item=>item.planId===plan.id).sort((a,b)=>a.targetDate.localeCompare(b.targetDate)||a.order-b.order),tasks=data.tasks.filter(task=>task.planId===plan.id).sort(compareTaskDates),notes=data.notes.filter(note=>note.planId===plan.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return <><div className="toolbar"><div className="toolbar-left"><select value={plan.id} onChange={event=>setSelected(event.target.value)} aria-label="Selected plan">{data.plans.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="toolbar-right"><button className="secondary" onClick={()=>setModal({kind:'plan',id:plan.id})}><Edit3 size={15}/>Edit plan</button><button className="secondary" onClick={()=>setModal({kind:'milestone'})}><Flag size={15}/>Milestone</button><button className="secondary" onClick={()=>setModal({kind:'note'})}><FileText size={15}/>Note</button><button className="danger-button" onClick={()=>removePlan(plan.id)}><Trash2 size={15}/>Delete</button></div></div><div className="plan-hero"><div className="plan-title"><span className="project-icon large" style={{background:`${plan.color}22`,color:plan.color}}>{plan.emoji}</span><div><div className="plan-title-row"><h2>{plan.name}</h2><Status value={planHealth(data,plan)}/></div><p>{plan.goal}</p></div></div><div className="plan-progress"><strong>{planProgress(data,plan.id)}%</strong><span>complete</span></div></div><div className="plan-meta-grid"><div><small>Category</small><b>{plan.category}</b></div><div><small>Priority</small><b>{plan.priority}</b></div><div><small>Timeline</small><b>{formatDateKey(plan.startDate)} → {formatDateKey(plan.targetDate)}</b></div><div><small>Collaborators</small><b><Users size={14}/>{plan.collaborators.length}</b></div></div><div className="plan-description"><h3>Plan brief</h3><p>{plan.description||'No additional description yet.'}</p></div><div className="section-title"><div><h2>Milestones</h2><p>Chronological checkpoints inside the plan timeline.</p></div><button className="text-button" onClick={()=>setModal({kind:'milestone'})}><Plus size={14}/>Add</button></div><div className="milestone-list">{milestones.map(item=><MilestoneCard key={item.id} milestone={item} data={data} edit={()=>setModal({kind:'milestone',id:item.id})} remove={()=>removeMilestone(item.id)}/>)}{!milestones.length&&<div className="empty compact">No milestones yet. Add one when this plan needs a meaningful checkpoint.</div>}</div><div className="section-title"><div><h2>Plan tasks</h2><p>Actionable work connected to this goal.</p></div><button className="text-button" onClick={()=>setModal({kind:'task'})}><Plus size={14}/>Add</button></div><div className="task-list">{tasks.map(task=><TaskRow key={task.id} task={task} data={data} moveTask={moveTask} editTask={id=>setModal({kind:'task',id})}/>)}{!tasks.length&&<div className="empty compact">No tasks yet.</div>}</div><div className="section-title"><div><h2>Notes</h2><p>Plan context that should stay attached to the work.</p></div><button className="text-button" onClick={()=>setModal({kind:'note'})}><Plus size={14}/>Add</button></div><div className="notes-grid">{notes.map(note=><article className="note-card" key={note.id}><div><FileText size={16}/><span><b>{note.title}</b><small>Updated {new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(note.updatedAt))}</small></span></div><p>{note.body}</p><div className="card-actions"><button onClick={()=>setModal({kind:'note',id:note.id})}><Edit3 size={14}/>Edit</button><button onClick={()=>removeNote(note.id)}><Trash2 size={14}/>Delete</button></div></article>)}{!notes.length&&<div className="empty compact">No notes attached to this plan.</div>}</div></>;
}

function MilestoneCard({milestone,data,edit,remove}:{milestone:Milestone;data:Workspace;edit:()=>void;remove:()=>void}){
  const value=milestoneProgress(data,milestone.id);return <article className="milestone-card"><span className={`milestone-check ${milestone.status==='Complete'?'complete':''}`}>{milestone.status==='Complete'?<CheckCircle2/>:<Flag/>}</span><div className="milestone-copy"><div><b>{milestone.name}</b><span>{milestone.status}</span></div><p>{milestone.description}</p><div className="progress"><i style={{width:`${value}%`}}/></div><small>{value}% · Target {formatDateKey(milestone.targetDate)}</small></div><div className="card-actions vertical"><button onClick={edit} aria-label={`Edit ${milestone.name}`}><Edit3 size={14}/></button><button onClick={remove} aria-label={`Delete ${milestone.name}`}><Trash2 size={14}/></button></div></article>;
}

function Board({data,selected,setSelected,moveTask,setModal,removeTask}:{data:Workspace;selected:string;setSelected:(value:string)=>void;moveTask:(id:string,status:TaskStatus)=>void;setModal:(modal:ModalState)=>void;removeTask:(id:string)=>void}){
  const [priority,setPriority]=useState<'all'|Priority>('all');
  const tasks=data.tasks.filter(task=>(selected==='all'||task.planId===selected)&&(priority==='all'||task.priority===priority));
  return <><div className="toolbar"><div className="toolbar-left"><select value={selected} onChange={event=>setSelected(event.target.value)}><option value="all">All plans</option>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><select value={priority} onChange={event=>setPriority(event.target.value as 'all'|Priority)}><option value="all">All priorities</option>{PRIORITIES.map(item=><option key={item}>{item}</option>)}</select></div><span>{tasks.length} tasks</span></div>{!data.plans.length?<Empty title="No task board yet" body="Create a plan first, then Planora can organize its work across the board."/>:<div className="board planora-board">{TASK_STATUSES.map(status=><section className="column" key={status} onDragOver={event=>event.preventDefault()} onDrop={event=>{const id=event.dataTransfer.getData('text/planora-task');if(id)moveTask(id,status)}}><div className="column-head"><b>{status}</b><span>{tasks.filter(task=>task.status===status).length}</span></div>{tasks.filter(task=>task.status===status).map(task=>{const blockers=taskBlockers(data,task);return <article className={`task-card ${blockers.length?'blocked':''}`} draggable key={task.id} onDragStart={event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/planora-task',task.id)}}><div className="task-card-top"><GripVertical className="drag-handle" size={14}/><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><button className="icon-action" onClick={()=>setModal({kind:'task',id:task.id})} aria-label={`Edit ${task.title}`}><Edit3 size={15}/></button><button className="delete-task" onClick={()=>removeTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15}/></button></div><h3>{task.title}</h3>{task.notes&&<p>{task.notes}</p>}{blockers.length>0&&<div className="dependency-warning"><AlertTriangle size={13}/>{blockers.length} incomplete dependenc{blockers.length===1?'y':'ies'}</div>}<div className="task-card-foot"><span className="avatar mini">{initials(task.assignee)}</span><small>{formatDateKey(task.dueDate)} · {task.estimate}h</small></div><label className="status-control"><span className="sr-only">Status for {task.title}</span><select value={task.status} onChange={event=>moveTask(task.id,event.target.value as TaskStatus)}>{TASK_STATUSES.map(item=><option key={item}>{item}</option>)}</select></label></article>})}{!tasks.some(task=>task.status===status)&&<div className="column-empty">No tasks</div>}</section>)}</div>}</>;
}

function RoadmapView({data,selected,setSelected,setModal}:{data:Workspace;selected:string;setSelected:(value:string)=>void;setModal:(modal:ModalState)=>void}){
  const plan=data.plans.find(item=>item.id===selected)??data.plans[0];if(!plan)return <Empty title="No roadmap yet" body="Create a plan and milestones to build a chronological roadmap."/>;
  const milestones=data.milestones.filter(item=>item.planId===plan.id).sort((a,b)=>a.targetDate.localeCompare(b.targetDate)||a.order-b.order);
  return <><div className="toolbar"><select value={plan.id} onChange={event=>setSelected(event.target.value)}>{data.plans.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><span>{planProgress(data,plan.id)}% plan progress</span></div><div className="roadmap-hero"><Target/><div><b>{plan.goal}</b><p>{formatDateKey(plan.startDate)} → {formatDateKey(plan.targetDate)}</p></div></div><div className="roadmap-list">{milestones.map((milestone,index)=><div className="roadmap-step" key={milestone.id}><div className="roadmap-line"><span>{index+1}</span>{index<milestones.length-1&&<i/>}</div><MilestoneCard milestone={milestone} data={data} edit={()=>setModal({kind:'milestone',id:milestone.id})} remove={()=>undefined}/></div>)}{!milestones.length&&<Empty title="No milestones scheduled" body="Add milestones to turn the plan timeline into meaningful checkpoints." action={<button className="primary" onClick={()=>setModal({kind:'milestone'})}><Plus size={15}/>Add milestone</button>}/>}</div></>;
}

function CalendarView({data}:{data:Workspace}){
  const [cursor,setCursor]=useState(()=>new Date()),year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate();
  const weekStartsMonday=data.settings.weekStartsOn==='monday',rawOffset=new Date(year,month,1).getDay(),offset=weekStartsMonday?(rawOffset+6)%7:rawOffset,cells=Array.from({length:42},(_,index)=>index-offset+1),today=localDateKey();
  const taskEvents=(day:number)=>data.tasks.filter(task=>{if(!task.dueDate)return false;const [y,m,d]=task.dueDate.split('-').map(Number);return y===year&&m===month+1&&d===day});
  const milestoneEvents=(day:number)=>data.milestones.filter(item=>{const [y,m,d]=item.targetDate.split('-').map(Number);return y===year&&m===month+1&&d===day});
  const labels=weekStartsMonday?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const agenda=[...data.tasks.filter(task=>task.dueDate&&task.dueDate.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).map(task=>({id:`t:${task.id}`,date:task.dueDate!,label:task.title,type:'Task'})),...data.milestones.filter(item=>item.targetDate.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).map(item=>({id:`m:${item.id}`,date:item.targetDate,label:item.name,type:'Milestone'}))].sort((a,b)=>a.date.localeCompare(b.date));
  return <><div className="calendar-controls"><div><button onClick={()=>setCursor(new Date(year,month-1,1))} aria-label="Previous month">←</button><button onClick={()=>setCursor(new Date())}>Today</button></div><h2>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(cursor)}</h2><div><button onClick={()=>setCursor(new Date(year,month+1,1))} aria-label="Next month">→</button></div></div><div className="calendar-card"><div className="weekdays">{labels.map(label=><b key={label}>{label}</b>)}</div><div className="month-grid">{cells.map((day,index)=>{const key=day>=1&&day<=days?`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';return <div className={`${day>=1&&day<=days?'day':'day muted'} ${key===today?'today':''}`} key={index}><span>{day>=1&&day<=days?day:''}</span>{day>=1&&day<=days&&taskEvents(day).slice(0,2).map(task=><small key={task.id}>{task.title}</small>)}{day>=1&&day<=days&&milestoneEvents(day).slice(0,1).map(item=><small className="milestone-event" key={item.id}>{item.name}</small>)}</div>})}</div></div><div className="section-title"><div><h2>Month agenda</h2><p>Scheduled tasks and milestone targets.</p></div></div><div className="agenda-list">{agenda.slice(0,20).map(item=><div key={item.id}><CalendarDays size={15}/><span><b>{item.label}</b><small>{item.type}</small></span><small>{formatDateKey(item.date)}</small></div>)}{!agenda.length&&<div className="empty compact">Nothing scheduled this month.</div>}</div></>;
}

function ResourcesView({data,selected,setSelected,setModal,removeResource}:{data:Workspace;selected:string;setSelected:(value:string)=>void;setModal:(modal:ModalState)=>void;removeResource:(id:string)=>void}){
  const items=data.resources.filter(resource=>selected==='all'||resource.planId===selected);
  return <><div className="toolbar"><select value={selected} onChange={event=>setSelected(event.target.value)}><option value="all">All plans</option>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><button className="primary" onClick={()=>setModal({kind:'resource'})} disabled={!data.plans.length}><Plus size={15}/>Add resource</button></div><div className="resource-grid">{items.map(resource=><article className="resource-card" key={resource.id}><span className="resource-icon"><BookOpen/></span><div><span>{resource.kind}</span><h3>{resource.title}</h3><p>{resource.notes}</p><small>{data.plans.find(plan=>plan.id===resource.planId)?.name}</small></div><div className="card-actions vertical">{resource.url&&<a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${resource.title}`}><ExternalLink size={15}/></a>}<button onClick={()=>setModal({kind:'resource',id:resource.id})} aria-label={`Edit ${resource.title}`}><Edit3 size={14}/></button><button onClick={()=>removeResource(resource.id)} aria-label={`Delete ${resource.title}`}><Trash2 size={14}/></button></div></article>)}{!items.length&&<Empty title="No resources here" body={data.plans.length?'Attach links, documentation, references, or notes to the plans they support.':'Create a plan first so resources have a clear home.'}/>}</div></>;
}

function Insights({data}:{data:Workspace}){
  const metrics=workspaceMetrics(data),planRows=data.plans.map(plan=>({plan,progress:planProgress(data,plan.id),health:planHealth(data,plan)})).sort((a,b)=>a.progress-b.progress),priorityCounts=PRIORITIES.map(priority=>({priority,count:data.tasks.filter(task=>task.priority===priority&&task.status!=='Complete').length}));
  return <><div className={`health-banner ${metrics.atRisk?'risk':''}`}><TrendingUp/><div><b>Workspace health: {metrics.atRisk?'Needs attention':'Healthy'}</b><p>{metrics.atRisk?`${metrics.atRisk} active plan${metrics.atRisk===1?'':'s'} need attention.`:'No active plan is currently behind or at risk.'}</p></div><strong>{metrics.completion}%</strong></div><div className="insights-grid"><div className="insight-card"><h2>Completion</h2><div className="donut" style={{background:`radial-gradient(circle,var(--theme-surface) 55%,transparent 57%),conic-gradient(var(--theme-accent) 0 ${metrics.completion}%,var(--theme-surface-3) ${metrics.completion}% 100%)`}}><strong>{metrics.completion}%</strong><small>workspace tasks</small></div></div><div className="insight-card"><h2>Open effort</h2><strong className="big-number">{metrics.openHours}h</strong><p>Estimated effort remaining across open work.</p></div><div className="insight-card"><h2>Schedule pressure</h2><strong className="big-number">{metrics.overdue}</strong><p>Overdue tasks · {metrics.dueToday} due today · {metrics.unscheduled} unscheduled.</p></div><div className="insight-card wide"><h2>Plan progress</h2><div className="project-insight-list">{planRows.map(({plan,progress,health})=><div key={plan.id}><span className="project-dot" style={{background:plan.color}}/><div><b>{plan.name}</b><small>{health}</small></div><strong>{progress}%</strong></div>)}{!planRows.length&&<div className="empty compact">No plan data yet.</div>}</div></div><div className="insight-card"><h2>Open priorities</h2><div className="priority-breakdown">{priorityCounts.map(item=><div key={item.priority}><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span><strong>{item.count}</strong></div>)}</div></div></div></>;
}

function SearchResults({data,results,openPlan,editTask}:{data:Workspace;results:{plans:Plan[];tasks:Task[];milestones:Milestone[];resources:Resource[];notes:Note[]};openPlan:(id:string)=>void;editTask:(id:string)=>void}){
  const total=results.plans.length+results.tasks.length+results.milestones.length+results.resources.length+results.notes.length;
  if(!total)return <Empty title="No matches" body="Try a shorter term, a tag, a plan name, or part of a task title."/>;
  return <div className="search-results"><SearchGroup title="Plans" count={results.plans.length}>{results.plans.map(plan=><button key={plan.id} onClick={()=>openPlan(plan.id)}><Target/><span><b>{plan.name}</b><small>{plan.goal}</small></span></button>)}</SearchGroup><SearchGroup title="Tasks & milestones" count={results.tasks.length+results.milestones.length}>{results.tasks.map(task=><button key={task.id} onClick={()=>editTask(task.id)}><CheckCircle2/><span><b>{task.title}</b><small>{data.plans.find(plan=>plan.id===task.planId)?.name} · {formatDateKey(task.dueDate)}</small></span></button>)}{results.milestones.map(item=><button key={item.id} onClick={()=>openPlan(item.planId)}><Flag/><span><b>{item.name}</b><small>{item.description}</small></span></button>)}</SearchGroup><SearchGroup title="Resources & notes" count={results.resources.length+results.notes.length}>{results.resources.map(resource=><button key={resource.id} onClick={()=>openPlan(resource.planId)}><BookOpen/><span><b>{resource.title}</b><small>{resource.kind}</small></span></button>)}{results.notes.map(note=><button key={note.id} onClick={()=>openPlan(note.planId)}><FileText/><span><b>{note.title}</b><small>{note.body}</small></span></button>)}</SearchGroup></div>;
}
function SearchGroup({title,count,children}:{title:string;count:number;children:React.ReactNode}){return <section className="search-group"><div className="section-title"><h2>{title}</h2><span className="count-pill">{count}</span></div><div>{children}{!count&&<div className="empty compact">No matches.</div>}</div></section>}

function Dialog({title,close,children,className='' }:{title:string;close:()=>void;children:React.ReactNode;className?:string}){
  return <div className="overlay" onMouseDown={close}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={event=>event.stopPropagation()}><button type="button" className="close" onClick={close} aria-label="Close dialog"><X/></button><h2 id="dialog-title">{title}</h2>{children}</section></div>;
}

function FormError({message}:{message:string}){return message?<div className="form-error" role="alert"><AlertTriangle size={14}/>{message}</div>:null}

function TaskModal({data,existing,selected,close,save}:{data:Workspace;existing?:Task;selected:string;close:()=>void;save:(task:Task)=>SaveResult}){
  const defaultPlan=existing?.planId??(selected!=='all'?selected:data.plans[0]?.id??'');
  const [title,setTitle]=useState(existing?.title??''),[planId,setPlanId]=useState(defaultPlan),[milestoneId,setMilestoneId]=useState(existing?.milestoneId??''),[priority,setPriority]=useState<Priority>(existing?.priority??'Medium'),[status,setStatus]=useState<TaskStatus>(existing?.status??'To Do'),[assignee,setAssignee]=useState(existing?.assignee??'You'),[startDate,setStartDate]=useState(existing?.startDate??''),[dueDate,setDueDate]=useState(existing?.dueDate??''),[estimate,setEstimate]=useState(String(existing?.estimate??data.settings.defaultTaskEstimate)),[tags,setTags]=useState(existing?.tags.join(', ')??''),[notes,setNotes]=useState(existing?.notes??''),[description,setDescription]=useState(existing?.description??''),[dependencies,setDependencies]=useState(existing?.dependencies??[]),[subtasks,setSubtasks]=useState(existing?.subtasks.map(item=>`${item.complete?'[x]':'[ ]'} ${item.title}`).join('\n')??''),[error,setError]=useState('');
  const availableDependencies=data.tasks.filter(task=>task.planId===planId&&task.id!==existing?.id);
  const buildSubtasks=()=>subtasks.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const complete=/^\[x\]/i.test(line),title=line.replace(/^\[(?:x| )\]\s*/i,'').trim();const prior=existing?.subtasks.find(item=>item.title===title);return{id:prior?.id??crypto.randomUUID(),title,complete:prior?.complete??complete}}).filter(item=>item.title);
  return <Dialog title={existing?'Edit task':'Create a task'} close={close}><form onSubmit={event=>{event.preventDefault();const result=save({id:existing?.id??crypto.randomUUID(),planId,milestoneId:milestoneId||undefined,title,description:description||undefined,status,priority,assignee,startDate:startDate||undefined,dueDate:dueDate||undefined,estimate:Number(estimate),actual:existing?.actual,tags:tags.split(',').map(item=>item.trim()).filter(Boolean),notes:notes||undefined,subtasks:buildSubtasks(),dependencies,createdAt:existing?.createdAt??nowIso(),completedAt:existing?.completedAt});if(result)setError(result)}}><FormError message={error}/><label>Task name<input autoFocus required maxLength={220} value={title} onChange={event=>setTitle(event.target.value)}/></label><label>Description<textarea value={description} onChange={event=>setDescription(event.target.value)}/></label><div className="form-grid"><label>Plan<select value={planId} onChange={event=>{setPlanId(event.target.value);setMilestoneId('');setDependencies([])}}>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label>Milestone<select value={milestoneId} onChange={event=>setMilestoneId(event.target.value)}><option value="">No milestone</option>{data.milestones.filter(item=>item.planId===planId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="form-grid"><label>Status<select value={status} onChange={event=>setStatus(event.target.value as TaskStatus)}>{TASK_STATUSES.map(item=><option key={item}>{item}</option>)}</select></label><label>Priority<select value={priority} onChange={event=>setPriority(event.target.value as Priority)}>{PRIORITIES.map(item=><option key={item}>{item}</option>)}</select></label></div><div className="form-grid"><label>Start date <small>optional</small><input type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label><label>Due date <small>optional</small><input type="date" min={startDate||undefined} value={dueDate} onChange={event=>setDueDate(event.target.value)}/></label></div><div className="form-grid"><label>Assignee<input maxLength={120} value={assignee} onChange={event=>setAssignee(event.target.value)}/></label><label>Estimate (hours)<input type="number" min="0" step="0.25" value={estimate} onChange={event=>setEstimate(event.target.value)}/></label></div><label>Tags<input value={tags} onChange={event=>setTags(event.target.value)} placeholder="research, writing"/></label><label>Dependencies <small>same-plan tasks only</small><select multiple size={Math.min(5,Math.max(2,availableDependencies.length))} value={dependencies} onChange={event=>setDependencies(Array.from(event.currentTarget.selectedOptions,option=>option.value))}>{availableDependencies.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Subtasks <small>one per line; use [x] for complete</small><textarea value={subtasks} onChange={event=>setSubtasks(event.target.value)} placeholder="[ ] Draft outline&#10;[x] Gather source material"/></label><label>Notes<textarea value={notes} onChange={event=>setNotes(event.target.value)}/></label><button className="primary full">{existing?'Save changes':'Create task'}</button></form></Dialog>;
}

function PlanModal({owner,existing,close,save}:{owner:string;existing?:Plan;close:()=>void;save:(plan:Plan,smart:boolean)=>SaveResult}){
  const [name,setName]=useState(existing?.name??''),[goal,setGoal]=useState(existing?.goal??''),[description,setDescription]=useState(existing?.description??''),[startDate,setStartDate]=useState(existing?.startDate??localDateKey()),[targetDate,setTargetDate]=useState(existing?.targetDate??addDays(localDateKey(),30)),[priority,setPriority]=useState<Priority>(existing?.priority??'Medium'),[status,setStatus]=useState<PlanStatus>(existing?.status??'Active'),[category,setCategory]=useState(existing?.category??'Personal'),[tags,setTags]=useState(existing?.tags.join(', ')??''),[color,setColor]=useState(existing?.color??'#7f8cff'),[smart,setSmart]=useState(!existing),[error,setError]=useState('');
  return <Dialog title={existing?'Edit plan':'Create a plan'} close={close} className="plan-modal"><form onSubmit={event=>{event.preventDefault();const result=save({id:existing?.id??crypto.randomUUID(),name,emoji:existing?.emoji??'◇',description,goal,color,startDate,targetDate,priority,status,category,tags:tags.split(',').map(item=>item.trim()).filter(Boolean),collaborators:existing?.collaborators??[{id:'owner',name:owner,initials:initials(owner),role:'Owner'}],createdAt:existing?.createdAt??nowIso(),completedAt:existing?.completedAt},smart);if(result)setError(result)}}><FormError message={error}/>{!existing&&<div className="builder-choice"><button type="button" className={smart?'selected':''} onClick={()=>setSmart(true)}><Sparkles/><span><b>Structured starter</b><small>Generate editable milestones and tasks from a neutral planning template.</small></span></button><button type="button" className={!smart?'selected':''} onClick={()=>setSmart(false)}><FolderKanban/><span><b>Manual plan</b><small>Start with an empty plan and build the structure yourself.</small></span></button></div>}<label>Name<input autoFocus required maxLength={180} value={name} onChange={event=>setName(event.target.value)}/></label><label>Main goal<textarea required value={goal} onChange={event=>setGoal(event.target.value)}/></label><label>Description<textarea value={description} onChange={event=>setDescription(event.target.value)}/></label><div className="form-grid"><label>Start<input type="date" required value={startDate} onChange={event=>setStartDate(event.target.value)}/></label><label>Target<input type="date" required min={startDate} value={targetDate} onChange={event=>setTargetDate(event.target.value)}/></label></div><div className="form-grid"><label>Priority<select value={priority} onChange={event=>setPriority(event.target.value as Priority)}>{PRIORITIES.map(item=><option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value as PlanStatus)}>{PLAN_STATUSES.map(item=><option key={item}>{item}</option>)}</select></label></div><div className="form-grid"><label>Category<input maxLength={80} value={category} onChange={event=>setCategory(event.target.value)}/></label><label>Accent<input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label></div><label>Tags<input value={tags} onChange={event=>setTags(event.target.value)} placeholder="career, launch"/></label><button className="primary full">{existing?'Save plan':smart?'Generate starter plan':'Create plan'}</button></form></Dialog>;
}

function MilestoneModal({data,existing,planId,close,save}:{data:Workspace;existing?:Milestone;planId:string;close:()=>void;save:(milestone:Milestone)=>SaveResult}){
  const plan=data.plans.find(item=>item.id===(existing?.planId??planId))??data.plans[0];
  const [name,setName]=useState(existing?.name??''),[description,setDescription]=useState(existing?.description??''),[targetDate,setTargetDate]=useState(existing?.targetDate??plan?.targetDate??localDateKey()),[error,setError]=useState('');
  if(!plan)return null;
  return <Dialog title={existing?'Edit milestone':'Add milestone'} close={close}><form onSubmit={event=>{event.preventDefault();const result=save({id:existing?.id??crypto.randomUUID(),planId:plan.id,name,description,status:existing?.status??'Not Started',targetDate,order:existing?.order??data.milestones.filter(item=>item.planId===plan.id).length+1,dependencies:existing?.dependencies??[],createdAt:existing?.createdAt??nowIso()});if(result)setError(result)}}><FormError message={error}/><label>Milestone name<input autoFocus required maxLength={180} value={name} onChange={event=>setName(event.target.value)}/></label><label>Description<textarea value={description} onChange={event=>setDescription(event.target.value)}/></label><label>Target date<input type="date" min={plan.startDate} max={plan.targetDate} required value={targetDate} onChange={event=>setTargetDate(event.target.value)}/><small>Plan timeline: {formatDateKey(plan.startDate)} → {formatDateKey(plan.targetDate)}</small></label><button className="primary full">{existing?'Save milestone':'Add milestone'}</button></form></Dialog>;
}

function ResourceModal({data,existing,selected,close,save}:{data:Workspace;existing?:Resource;selected:string;close:()=>void;save:(resource:Resource)=>SaveResult}){
  const [planId,setPlanId]=useState(existing?.planId??(selected!=='all'?selected:data.plans[0]?.id??'')),[milestoneId,setMilestoneId]=useState(existing?.milestoneId??''),[title,setTitle]=useState(existing?.title??''),[kind,setKind]=useState<ResourceKind>(existing?.kind??'Link'),[url,setUrl]=useState(existing?.url??''),[notes,setNotes]=useState(existing?.notes??''),[error,setError]=useState('');
  return <Dialog title={existing?'Edit resource':'Add resource'} close={close}><form onSubmit={event=>{event.preventDefault();const result=save({id:existing?.id??crypto.randomUUID(),planId,milestoneId:milestoneId||undefined,title,kind,url:url||undefined,notes:notes||undefined,createdAt:existing?.createdAt??nowIso()});if(result)setError(result)}}><FormError message={error}/><label>Title<input autoFocus required maxLength={220} value={title} onChange={event=>setTitle(event.target.value)}/></label><div className="form-grid"><label>Plan<select value={planId} onChange={event=>{setPlanId(event.target.value);setMilestoneId('')}}>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label>Milestone<select value={milestoneId} onChange={event=>setMilestoneId(event.target.value)}><option value="">Whole plan</option>{data.milestones.filter(item=>item.planId===planId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label>Type<select value={kind} onChange={event=>setKind(event.target.value as ResourceKind)}>{RESOURCE_KINDS.map(item=><option key={item}>{item}</option>)}</select></label><label>URL <small>http/https only</small><input type="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://…"/></label><label>Notes<textarea value={notes} onChange={event=>setNotes(event.target.value)}/></label><button className="primary full">{existing?'Save resource':'Add resource'}</button></form></Dialog>;
}

function NoteModal({data,existing,planId,close,save}:{data:Workspace;existing?:Note;planId:string;close:()=>void;save:(note:Note)=>SaveResult}){
  const plan=data.plans.find(item=>item.id===(existing?.planId??planId))??data.plans[0];
  const [title,setTitle]=useState(existing?.title??''),[body,setBody]=useState(existing?.body??''),[taskId,setTaskId]=useState(existing?.taskId??''),[error,setError]=useState('');
  if(!plan)return null;
  return <Dialog title={existing?'Edit note':'Add note'} close={close}><form onSubmit={event=>{event.preventDefault();const result=save({id:existing?.id??crypto.randomUUID(),planId:plan.id,taskId:taskId||undefined,title,body,createdAt:existing?.createdAt??nowIso(),updatedAt:nowIso()});if(result)setError(result)}}><FormError message={error}/><label>Title<input autoFocus required maxLength={220} value={title} onChange={event=>setTitle(event.target.value)}/></label><label>Related task <small>optional</small><select value={taskId} onChange={event=>setTaskId(event.target.value)}><option value="">Whole plan</option>{data.tasks.filter(task=>task.planId===plan.id).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Note<textarea className="note-editor" required value={body} onChange={event=>setBody(event.target.value)}/></label><button className="primary full">{existing?'Save note':'Add note'}</button></form></Dialog>;
}
