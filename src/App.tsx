import {useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {
  LayoutDashboard,FolderKanban,CalendarDays,BarChart3,Search,Plus,Bell,
  ChevronDown,CheckCircle2,Clock3,CircleDot,Flame,Sparkles,X,RotateCcw,
  Menu,Command,MoreHorizontal,ArrowUpRight
} from 'lucide-react';
import type {Priority,Project,Status,Task,Workspace} from './types';
import {loadWorkspace,resetWorkspace,saveWorkspace} from './storage';
import {firebaseReady,signInGoogle} from './firebase';

type View='Overview'|'Projects'|'My tasks'|'Calendar'|'Insights';
const statuses:Status[]=['Backlog','In progress','Review','Done'];
const priorities:Priority[]=['Low','Medium','High','Urgent'];
const nav:[View,typeof LayoutDashboard][]=[
  ['Overview',LayoutDashboard],['Projects',FolderKanban],['My tasks',CheckCircle2],
  ['Calendar',CalendarDays],['Insights',BarChart3]
];
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthShort=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function todayLabel(){
  return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
}
function greeting(){
  const hour=new Date().getHours();
  return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
}
function formatDateInput(value:string){
  const [year,month,day]=value.split('-').map(Number);
  if(!year||!month||!day)return value;
  return `${monthShort[month-1]} ${String(day).padStart(2,'0')}`;
}
function projectProgress(data:Workspace,projectId:string){
  const projectTasks=data.tasks.filter(t=>t.projectId===projectId);
  if(!projectTasks.length)return 0;
  return Math.round(projectTasks.filter(t=>t.status==='Done').length/projectTasks.length*100);
}

export default function App(){
  const [data,setData]=useState<Workspace>(loadWorkspace);
  const [view,setView]=useState<View>('Overview');
  const [query,setQuery]=useState('');
  const [selectedProject,setSelectedProject]=useState('all');
  const [modal,setModal]=useState<'task'|'project'|null>(null);
  const [menu,setMenu]=useState(false);
  const [toast,setToast]=useState('');
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>saveWorkspace(data),[data]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(''),2400);
    return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const matchingTasks=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return data.tasks.filter(task=>{
      const project=data.projects.find(p=>p.id===task.projectId);
      return !q||`${task.title} ${task.tags.join(' ')} ${task.assignee} ${project?.name??''} ${task.note??''}`.toLowerCase().includes(q);
    });
  },[data,query]);

  const boardTasks=useMemo(()=>{
    if(view==='My tasks')return matchingTasks.filter(t=>t.assignee==='NR');
    return matchingTasks.filter(t=>selectedProject==='all'||t.projectId===selectedProject);
  },[matchingTasks,selectedProject,view]);

  const done=data.tasks.filter(t=>t.status==='Done').length;
  const totalHours=data.tasks.reduce((sum,t)=>sum+t.estimate,0);
  const completion=Math.round(done/Math.max(data.tasks.length,1)*100);
  const urgentOpen=data.tasks.filter(t=>t.priority==='Urgent'&&t.status!=='Done').length;

  const updateTask=(id:string,status:Status)=>{
    setData(current=>({...current,tasks:current.tasks.map(t=>t.id===id?{...t,status}:t)}));
    setToast(status==='Done'?'Task completed':`Moved to ${status}`);
  };
  const addTask=(task:Task)=>{
    setData(current=>({...current,tasks:[task,...current.tasks]}));
    setModal(null);setToast('Task created');
  };
  const addProject=(project:Project)=>{
    setData(current=>({...current,projects:[project,...current.projects]}));
    setSelectedProject(project.id);setView('Projects');setModal(null);setToast('Project created');
  };
  const signIn=async()=>{
    if(!firebaseReady){setToast('Demo mode — add Firebase keys to enable Google sign-in');return}
    try{await signInGoogle();setToast('Signed in with Google')}
    catch{setToast('Google sign-in was cancelled or unavailable')}
  };
  const reset=()=>{
    setData(resetWorkspace());setSelectedProject('all');setQuery('');setView('Overview');setToast('Demo workspace reset');
  };

  return <div className="app-shell">
    <aside className={menu?'sidebar open':'sidebar'}>
      <div className="brand"><span className="brand-mark">P</span><span>planora</span></div>
      <button className="workspace" onClick={()=>setToast('Northstar is the active workspace')}><span className="avatar small">NR</span><span><b>Northstar</b><small>Personal workspace</small></span><ChevronDown size={15}/></button>
      <nav>{nav.map(([label,Icon])=><button key={label} className={view===label?'nav active':'nav'} onClick={()=>{setView(label);if(label==='My tasks')setSelectedProject('all');setMenu(false)}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-label">Projects <button onClick={()=>setModal('project')} aria-label="Create project"><Plus size={15}/></button></div>
      <div className="project-nav">{data.projects.map(project=><button key={project.id} onClick={()=>{setSelectedProject(project.id);setView('Projects');setMenu(false)}}><span style={{background:project.color}}/>{project.name}</button>)}</div>
      <div className="sidebar-bottom"><div className="focus-card"><Sparkles size={18}/><b>Focus mode</b><p>Quiet the noise and work one task at a time.</p><button onClick={()=>{setView('My tasks');setQuery('');setToast('Focus view opened')}}>Start focus</button></div><button className="reset" onClick={reset}><RotateCcw size={15}/> Reset demo</button></div>
    </aside>

    <main>
      <header>
        <button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle navigation"><Menu/></button>
        <div className="search"><Search size={17}/><input ref={searchRef} placeholder="Search tasks, projects, people…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search workspace"/><span><Command size={13}/> K</span></div>
        <div className="header-actions"><button className="icon-btn" onClick={()=>setToast('You’re all caught up')} aria-label="Notifications"><Bell size={19}/><i/></button><button className="user-button" onClick={signIn}><span className="avatar">NR</span><span className="user-copy"><b>Noah</b><small>{firebaseReady?'Google sign-in ready':'Demo workspace'}</small></span><ChevronDown size={14}/></button></div>
      </header>

      <section className="content">
        <div className="page-head"><div><p className="eyebrow">{todayLabel()}</p><h1>{view==='Overview'?`${greeting()}, Noah.`:view}</h1><p>{view==='Overview'?'Here’s what needs your attention and what’s moving forward.':'A clear view of your work, without the clutter.'}</p></div><button className="primary" onClick={()=>setModal('task')} disabled={!data.projects.length}><Plus size={17}/> New task</button></div>

        {view==='Overview'&&<>
          <div className="metric-grid">
            <Metric icon={<CheckCircle2/>} label="Completion" value={`${completion}%`} note={`${done} of ${data.tasks.length} tasks closed`} trend={completion>=50?'On track':'Building momentum'}/>
            <Metric icon={<Clock3/>} label="Planned effort" value={`${totalHours}h`} note="Across active work" trend={`${data.tasks.filter(t=>t.status!=='Done').length} open tasks`}/>
            <Metric icon={<CircleDot/>} label="In progress" value={`${data.tasks.filter(t=>t.status==='In progress').length}`} note="Tasks moving now" trend={urgentOpen?`${urgentOpen} urgent`:'No urgent blockers'}/>
            <Metric icon={<Flame/>} label="Focus score" value={`${Math.max(0,100-urgentOpen*12)}%`} note="Based on urgent work load" trend={urgentOpen?'Prioritize blockers':'Healthy workload'}/>
          </div>
          <div className="section-title"><div><h2>Active projects</h2><p>Your highest-signal workspaces.</p></div><button className="text-button" onClick={()=>{setSelectedProject('all');setView('Projects')}}>View all <ArrowUpRight size={15}/></button></div>
          <div className="projects-grid">{data.projects.map(project=><ProjectCard key={project.id} project={project} progress={projectProgress(data,project.id)} taskCount={data.tasks.filter(t=>t.projectId===project.id&&t.status!=='Done').length} onOpen={()=>{setSelectedProject(project.id);setView('Projects')}}/>)}</div>
          <div className="two-col"><div><div className="section-title"><div><h2>{query?'Search results':'Priority queue'}</h2><p>{query?`${matchingTasks.length} matching tasks`:'What deserves focus next.'}</p></div></div><div className="task-list">{matchingTasks.filter(t=>t.status!=='Done').slice(0,5).map(task=><TaskRow key={task.id} task={task} project={data.projects.find(p=>p.id===task.projectId)} onAdvance={()=>updateTask(task.id,nextStatus(task.status))}/>)}</div></div><div><div className="section-title"><div><h2>Workspace pulse</h2><p>Current workflow distribution.</p></div></div><Pulse data={data}/></div></div>
        </>}

        {(view==='Projects'||view==='My tasks')&&<Board data={data} tasks={boardTasks} selected={view==='My tasks'?'all':selectedProject} setSelected={setSelectedProject} updateTask={updateTask} hideProjectFilter={view==='My tasks'}/>} 
        {view==='Calendar'&&<Calendar data={data}/>} 
        {view==='Insights'&&<Insights data={data}/>} 
      </section>
    </main>

    {modal==='task'&&<TaskModal projects={data.projects} onClose={()=>setModal(null)} onSave={addTask}/>} 
    {modal==='project'&&<ProjectModal onClose={()=>setModal(null)} onSave={addProject}/>} 
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function nextStatus(status:Status):Status{return statuses[(statuses.indexOf(status)+1)%statuses.length]}

function Metric({icon,label,value,note,trend}:{icon:ReactNode;label:string;value:string;note:string;trend:string}){
  return <div className="metric"><div className="metric-top"><span className="metric-icon">{icon}</span><small>{trend}</small></div><strong>{value}</strong><b>{label}</b><p>{note}</p></div>
}

function ProjectCard({project,progress,taskCount,onOpen}:{project:Project;progress:number;taskCount:number;onOpen:()=>void}){
  return <button className="project-card" onClick={onOpen}><div className="project-top"><span className="project-icon" style={{background:`${project.color}22`,color:project.color}}>{project.emoji}</span><MoreHorizontal/></div><h3>{project.name}</h3><p>{project.description}</p><div className="progress-meta"><span>{progress}% complete</span><span>{taskCount} open</span></div><div className="progress"><i style={{width:`${progress}%`,background:project.color}}/></div><div className="project-foot"><div className="avatars">{project.members.map(member=><span key={member}>{member}</span>)}</div><small>Due {project.due}</small></div></button>
}

function PriorityBadge({priority}:{priority:Priority}){return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>}

function TaskRow({task,project,onAdvance}:{task:Task;project?:Project;onAdvance:()=>void}){
  return <div className="task-row"><button className={`status-dot ${task.status==='Done'?'complete':''}`} onClick={onAdvance} aria-label={`Move ${task.title} forward`}>{task.status==='Done'&&'✓'}</button><div className="task-main"><b>{task.title}</b><small><span style={{background:project?.color}}/>{project?.name??'Unassigned'} · Due {task.due}</small></div><PriorityBadge priority={task.priority}/><span className="avatar mini">{task.assignee}</span></div>
}

function Board({data,tasks,selected,setSelected,updateTask,hideProjectFilter=false}:{data:Workspace;tasks:Task[];selected:string;setSelected:(value:string)=>void;updateTask:(id:string,status:Status)=>void;hideProjectFilter?:boolean}){
  return <>
    <div className="toolbar">{!hideProjectFilter&&<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All projects</option>{data.projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>}<span>{tasks.length} {tasks.length===1?'task':'tasks'}</span></div>
    <div className="board">{statuses.map(status=><section className="column" key={status}><div className="column-head"><b>{status}</b><span>{tasks.filter(t=>t.status===status).length}</span></div>{tasks.filter(t=>t.status===status).map(task=><article className="task-card" key={task.id}><div className="task-card-top"><PriorityBadge priority={task.priority}/><button onClick={()=>updateTask(task.id,nextStatus(task.status))} aria-label={`Move ${task.title} forward`}><MoreHorizontal size={17}/></button></div><h3>{task.title}</h3>{task.note&&<p>{task.note}</p>}<div className="tags">{task.tags.map(tag=><span key={tag}>{tag}</span>)}</div><div className="task-card-foot"><span className="avatar mini">{task.assignee}</span><small>{task.due} · {task.estimate}h</small></div><button className="advance" onClick={()=>updateTask(task.id,nextStatus(task.status))}>Move to {nextStatus(task.status)} →</button></article>)}</section>)}</div>
  </>
}

function Calendar({data}:{data:Workspace}){
  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const mondayOffset=(new Date(year,month,1).getDay()+6)%7;
  const cells=Array.from({length:42},(_,index)=>index-mondayOffset+1);
  const taskOnDay=(task:Task,day:number)=>{
    const [m,d]=task.due.split(' ');
    return monthShort.indexOf(m)===month&&Number(d)===day;
  };
  return <div className="calendar-card"><div className="calendar-top"><h2>{monthNames[month]} {year}</h2><span>{data.tasks.filter(task=>{const [m]=task.due.split(' ');return monthShort.indexOf(m)===month}).length} scheduled tasks</span></div><div className="weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><b key={day}>{day}</b>)}</div><div className="month-grid">{cells.map((day,index)=><div className={day<1||day>daysInMonth?'day muted':'day'} key={index}><span>{day<1?new Date(year,month,day).getDate():day>daysInMonth?day-daysInMonth:day}</span>{day>=1&&day<=daysInMonth&&data.tasks.filter(task=>taskOnDay(task,day)).slice(0,2).map(task=><small key={task.id}>{task.title}</small>)}</div>)}</div></div>
}

function Insights({data}:{data:Workspace}){
  const byStatus=statuses.map(status=>({status,count:data.tasks.filter(t=>t.status===status).length}));
  const max=Math.max(...byStatus.map(item=>item.count),1);
  const completion=Math.round(data.tasks.filter(t=>t.status==='Done').length/Math.max(data.tasks.length,1)*100);
  const highOpen=data.tasks.filter(t=>(t.priority==='High'||t.priority==='Urgent')&&t.status!=='Done').length;
  return <div className="insights-grid"><div className="insight-card wide"><div className="section-title"><div><h2>Work distribution</h2><p>Tasks by workflow stage.</p></div></div><div className="bars">{byStatus.map(({status,count})=><div key={status}><span>{status}</span><div><i style={{width:`${count/max*100}%`}}/></div><b>{count}</b></div>)}</div></div><div className="insight-card"><h2>Completion</h2><div className="donut"><strong>{completion}%</strong><small>workspace tasks</small></div><p>Completion is calculated directly from your current task state.</p></div><div className="insight-card"><h2>Priority load</h2><strong className="big-number">{highOpen}</strong><p>High or urgent tasks are still open.</p><span className="positive">{highOpen<=2?'Manageable load':'Needs attention'}</span></div></div>
}

function Pulse({data}:{data:Workspace}){
  const values=statuses.map(status=>data.tasks.filter(t=>t.status===status).length);
  const max=Math.max(...values,1);
  return <div className="pulse-card"><div className="pulse-bars">{values.map((value,index)=><div key={statuses[index]}><i style={{height:`${Math.max(12,value/max*100)}%`}}/><span>{['B','P','R','D'][index]}</span></div>)}</div><div className="pulse-summary"><b>{data.tasks.filter(t=>t.status==='Done').length} tasks closed</b><span>Backlog · Progress · Review · Done</span></div></div>
}

function TaskModal({projects,onClose,onSave}:{projects:Project[];onClose:()=>void;onSave:(task:Task)=>void}){
  const [title,setTitle]=useState('');
  const [projectId,setProjectId]=useState(projects[0]?.id??'');
  const [priority,setPriority]=useState<Priority>('Medium');
  const [due,setDue]=useState(()=>new Date(Date.now()+7*86_400_000).toISOString().slice(0,10));
  const [estimate,setEstimate]=useState('3');
  const [tags,setTags]=useState('');
  const [note,setNote]=useState('');
  return <div className="overlay" onMouseDown={onClose}><form className="modal" onSubmit={event=>{event.preventDefault();if(title.trim()&&projectId)onSave({id:crypto.randomUUID(),projectId,title:title.trim(),status:'Backlog',priority,assignee:'NR',due:formatDateInput(due),estimate:Math.max(Number(estimate)||1,1),tags:tags.split(',').map(tag=>tag.trim()).filter(Boolean),note:note.trim()||undefined})}} onMouseDown={event=>event.stopPropagation()}>
    <button type="button" className="close" onClick={onClose} aria-label="Close task form"><X/></button><span className="modal-icon"><Plus/></span><h2>Create a task</h2><p>Capture the outcome now. Refine the details later.</p>
    <label>Task name<input autoFocus required value={title} onChange={event=>setTitle(event.target.value)} placeholder="e.g. Ship account settings"/></label>
    <div className="form-grid"><label>Project<select value={projectId} onChange={event=>setProjectId(event.target.value)} required>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Priority<select value={priority} onChange={event=>setPriority(event.target.value as Priority)}>{priorities.map(item=><option key={item}>{item}</option>)}</select></label></div>
    <div className="form-grid"><label>Due date<input type="date" value={due} onChange={event=>setDue(event.target.value)} required/></label><label>Estimate (hours)<input type="number" min="1" max="80" value={estimate} onChange={event=>setEstimate(event.target.value)} required/></label></div>
    <label>Tags<input value={tags} onChange={event=>setTags(event.target.value)} placeholder="frontend, api, docs"/></label>
    <label>Note<textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="Context, acceptance criteria, or handoff notes"/></label>
    <button className="primary full">Create task</button>
  </form></div>
}

function ProjectModal({onClose,onSave}:{onClose:()=>void;onSave:(project:Project)=>void}){
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [due,setDue]=useState(()=>new Date(Date.now()+30*86_400_000).toISOString().slice(0,10));
  const [color,setColor]=useState('#9b8cff');
  return <div className="overlay" onMouseDown={onClose}><form className="modal" onSubmit={event=>{event.preventDefault();if(name.trim())onSave({id:crypto.randomUUID(),name:name.trim(),emoji:'◇',description:description.trim()||'A focused workspace for meaningful work.',color,progress:0,due:formatDateInput(due),members:['NR']})}} onMouseDown={event=>event.stopPropagation()}>
    <button type="button" className="close" onClick={onClose} aria-label="Close project form"><X/></button><span className="modal-icon"><FolderKanban/></span><h2>New project</h2><p>Give the work a home and a clear outcome.</p>
    <label>Name<input autoFocus required value={name} onChange={event=>setName(event.target.value)} placeholder="Project name"/></label>
    <label>Description<textarea value={description} onChange={event=>setDescription(event.target.value)} placeholder="What are we trying to accomplish?"/></label>
    <div className="form-grid"><label>Due date<input type="date" value={due} onChange={event=>setDue(event.target.value)} required/></label><label>Accent<input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label></div>
    <button className="primary full">Create project</button>
  </form></div>
}
