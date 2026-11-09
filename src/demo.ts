import type {Workspace} from './types';

const today=new Date();
const localISO=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
const day=(offset:number)=>{const value=new Date(today.getFullYear(),today.getMonth(),today.getDate());value.setDate(value.getDate()+offset);return localISO(value)};
const stamp=(hoursAgo:number)=>{const value=new Date();value.setHours(value.getHours()-hoursAgo);return value.toISOString()};
const now=stamp(0);

/* Demo dates are relative to the day the app is opened, so the sample always
   looks like a live workspace: a couple of overdue items, work due today, and
   milestones still ahead. */
export const demoWorkspace:Workspace={
  plans:[
    {id:'p1',name:'Full-stack learning path',emoji:'⌘',description:'Build practical full-stack confidence through focused weekly milestones.',goal:'Become comfortable building and deploying a complete full-stack application.',color:'#7f8cff',startDate:day(-30),targetDate:day(45),priority:'High',status:'On Track',category:'Career',tags:['learning','development'],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:stamp(720)},
    {id:'p2',name:'Home office refresh',emoji:'◇',description:'Create a calmer, more functional workspace without overspending.',goal:'Finish a practical home-office refresh with better organization and ergonomics.',color:'#44cfa5',startDate:day(-21),targetDate:day(18),priority:'Medium',status:'Active',category:'Home',tags:['home','organization'],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:stamp(504)},
    {id:'p3',name:'Portfolio case study',emoji:'↗',description:'Turn one finished project into a concise portfolio case study.',goal:'Publish a polished case study that clearly explains the problem, process, and outcome.',color:'#f0aa62',startDate:day(-14),targetDate:day(10),priority:'High',status:'At Risk',category:'Career',tags:['portfolio','writing'],collaborators:[{id:'owner',name:'You',initials:'YOU',role:'Owner'}],createdAt:stamp(336)}
  ],
  milestones:[
    {id:'m1',planId:'p1',name:'Foundations',description:'Refresh the core browser, TypeScript, and API concepts needed for the build.',status:'In Progress',targetDate:day(-7),order:1,dependencies:[]},
    {id:'m2',planId:'p1',name:'Build a complete app',description:'Ship an end-to-end application with authentication and persistence.',status:'Not Started',targetDate:day(20),order:2,dependencies:['m1']},
    {id:'m3',planId:'p1',name:'Deploy and review',description:'Deploy, test, document lessons, and identify the next skill gap.',status:'Not Started',targetDate:day(45),order:3,dependencies:['m2']},
    {id:'m4',planId:'p2',name:'Plan the space',description:'Measure, prioritize, and create a realistic purchase list.',status:'In Progress',targetDate:day(-2),order:1,dependencies:[]},
    {id:'m5',planId:'p2',name:'Set up and organize',description:'Install the essentials and remove clutter.',status:'Not Started',targetDate:day(18),order:2,dependencies:['m4']},
    {id:'m6',planId:'p3',name:'Draft the story',description:'Capture the project problem, decisions, implementation, and result.',status:'In Progress',targetDate:day(2),order:1,dependencies:[]},
    {id:'m7',planId:'p3',name:'Publish',description:'Polish visuals, proofread, and publish the final case study.',status:'Not Started',targetDate:day(10),order:2,dependencies:['m6']}
  ],
  tasks:[
    {id:'t1',planId:'p1',milestoneId:'m1',title:'Review TypeScript narrowing and generics',status:'Complete',priority:'Medium',assignee:'You',dueDate:day(-12),estimate:2,tags:['typescript'],subtasks:[],dependencies:[],createdAt:stamp(720),completedAt:stamp(168)},
    {id:'t2',planId:'p1',milestoneId:'m1',title:'Build a small REST API exercise',status:'In Progress',priority:'High',assignee:'You',dueDate:day(-1),estimate:3,tags:['api','backend'],notes:'Keep the exercise small enough to finish in one focused session.',subtasks:[{id:'s1',title:'Define routes',complete:true},{id:'s2',title:'Add validation',complete:false}],dependencies:[],createdAt:stamp(700)},
    {id:'t3',planId:'p1',milestoneId:'m1',title:'Connect a React form to persisted data',status:'To Do',priority:'High',assignee:'You',dueDate:day(0),estimate:3,tags:['react','data'],subtasks:[],dependencies:['t2'],createdAt:stamp(640)},
    {id:'t4',planId:'p1',milestoneId:'m2',title:'Choose the capstone scope',status:'Backlog',priority:'Medium',assignee:'You',dueDate:day(9),estimate:1,tags:['planning'],subtasks:[],dependencies:['t3'],createdAt:stamp(520)},
    {id:'t5',planId:'p2',milestoneId:'m4',title:'Measure desk and wall space',status:'Complete',priority:'Medium',assignee:'You',dueDate:day(-10),estimate:1,tags:['home'],subtasks:[],dependencies:[],createdAt:stamp(500),completedAt:stamp(120)},
    {id:'t6',planId:'p2',milestoneId:'m4',title:'Prioritize the purchase list',status:'To Do',priority:'Medium',assignee:'You',dueDate:day(0),estimate:1,tags:['budget'],subtasks:[],dependencies:[],createdAt:stamp(480)},
    {id:'t7',planId:'p2',milestoneId:'m5',title:'Create a cable-management layout',status:'Backlog',priority:'Low',assignee:'You',dueDate:day(7),estimate:1,tags:['organization'],subtasks:[],dependencies:['t6'],createdAt:stamp(430)},
    {id:'t8',planId:'p3',milestoneId:'m6',title:'Outline the case-study narrative',status:'Blocked',priority:'Urgent',assignee:'You',dueDate:day(-3),estimate:2,tags:['writing'],notes:'Blocked until the final screenshots are selected.',subtasks:[],dependencies:[],createdAt:stamp(320)},
    {id:'t9',planId:'p3',milestoneId:'m6',title:'Select final product screenshots',status:'In Progress',priority:'Urgent',assignee:'You',dueDate:day(-1),estimate:1,tags:['portfolio','visuals'],subtasks:[],dependencies:[],createdAt:stamp(300)},
    {id:'t10',planId:'p3',milestoneId:'m7',title:'Publish and verify mobile layout',status:'Backlog',priority:'High',assignee:'You',dueDate:day(8),estimate:2,tags:['portfolio','qa'],subtasks:[],dependencies:['t8','t9'],createdAt:stamp(260)}
  ],
  resources:[
    {id:'r1',planId:'p1',milestoneId:'m1',title:'TypeScript handbook',kind:'Documentation',url:'https://www.typescriptlang.org/docs/handbook/intro.html',notes:'Reference for language fundamentals.',createdAt:stamp(690)},
    {id:'r2',planId:'p3',title:'Case study outline',kind:'Note',notes:'Problem → constraints → decisions → implementation → outcome → lessons.',createdAt:stamp(240)}
  ],
  notes:[
    {id:'n1',planId:'p1',title:'Learning rule',body:'Prefer small completed exercises over large unfinished tutorials.',createdAt:stamp(660),updatedAt:stamp(60)}
  ],
  activity:[
    {id:'a1',type:'task',message:'Completed “Review TypeScript narrowing and generics”.',createdAt:stamp(6),planId:'p1',taskId:'t1'},
    {id:'a2',type:'plan',message:'Portfolio case study moved to At Risk.',createdAt:stamp(2),planId:'p3'}
  ],
  settings:{weekStartsOn:'monday',defaultTaskEstimate:2,compactMode:false,notifications:true}
};
