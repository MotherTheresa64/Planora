type ThemeId='midnight'|'aurora'|'ember'|'daybreak';

type ThemeOption={id:ThemeId;label:string;description:string;colors:[string,string];browserColor:string};

const STORAGE_KEY='planora-theme-v1';
const DEFAULT_THEME:ThemeId='midnight';
const themes:ThemeOption[]=[
  {id:'midnight',label:'Midnight',description:'Deep indigo and electric violet',colors:['#111827','#7c83ff'],browserColor:'#090d18'},
  {id:'aurora',label:'Aurora',description:'Teal shadows with mint highlights',colors:['#08211f','#55e6c1'],browserColor:'#061513'},
  {id:'ember',label:'Ember',description:'Warm graphite with coral energy',colors:['#211412','#ff8568'],browserColor:'#130d0c'},
  {id:'daybreak',label:'Daybreak',description:'Bright, crisp and quietly colorful',colors:['#f6f8ff','#6472f3'],browserColor:'#f6f8ff'}
];

function isTheme(value:string|null):value is ThemeId{return themes.some(theme=>theme.id===value)}
function readTheme():ThemeId{
  try{const saved=localStorage.getItem(STORAGE_KEY);return isTheme(saved)?saved:DEFAULT_THEME}catch{return DEFAULT_THEME}
}
function persistTheme(theme:ThemeId){try{localStorage.setItem(STORAGE_KEY,theme)}catch{/* Keep theme switching usable when storage is blocked. */}}
function setBrowserColor(color:string){
  let meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.append(meta)}
  meta.content=color;
}
function applyTheme(theme:ThemeId){
  const option=themes.find(item=>item.id===theme)??themes[0];
  document.documentElement.dataset.theme=option.id;
  document.documentElement.style.colorScheme=option.id==='daybreak'?'light':'dark';
  setBrowserColor(option.browserColor);
  persistTheme(option.id);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button=>{
    const active=button.dataset.themeChoice===option.id;
    button.setAttribute('aria-pressed',String(active));
    button.classList.toggle('active',active);
  });
  const label=document.querySelector<HTMLElement>('[data-current-theme]');
  if(label)label.textContent=option.label;
}

function createThemeControl(){
  if(document.querySelector('.theme-control'))return;
  const host=document.createElement('div');
  host.className='theme-control';
  host.innerHTML=`<button class="theme-toggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Choose appearance"><span class="theme-toggle-icon" aria-hidden="true">✦</span><span class="theme-toggle-copy"><b>Theme</b><small data-current-theme></small></span><span aria-hidden="true">⌃</span></button><div class="theme-panel" role="dialog" aria-label="Choose Planora theme" hidden><div class="theme-panel-head"><div><b>Make Planora yours</b><small>Appearance is saved on this device.</small></div><button class="theme-close" type="button" aria-label="Close theme picker">×</button></div><div class="theme-options"></div></div>`;
  const options=host.querySelector<HTMLElement>('.theme-options')!;
  themes.forEach(theme=>{
    const button=document.createElement('button');
    button.type='button';button.className='theme-option';button.dataset.themeChoice=theme.id;
    button.innerHTML=`<span class="theme-swatch" style="--swatch-a:${theme.colors[0]};--swatch-b:${theme.colors[1]}"></span><span><b>${theme.label}</b><small>${theme.description}</small></span><span class="theme-check" aria-hidden="true">✓</span>`;
    button.addEventListener('click',()=>{applyTheme(theme.id);close()});
    options.append(button);
  });
  const toggle=host.querySelector<HTMLButtonElement>('.theme-toggle')!;
  const panel=host.querySelector<HTMLElement>('.theme-panel')!;
  const closeButton=host.querySelector<HTMLButtonElement>('.theme-close')!;
  const open=()=>{panel.hidden=false;toggle.setAttribute('aria-expanded','true');requestAnimationFrame(()=>panel.classList.add('open'))};
  const close=()=>{panel.classList.remove('open');toggle.setAttribute('aria-expanded','false');window.setTimeout(()=>{panel.hidden=true},150)};
  toggle.addEventListener('click',()=>panel.hidden?open():close());
  closeButton.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close()});
  document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!host.contains(event.target as Node))close()});
  document.body.append(host);
  applyTheme(readTheme());
}

export function initializeThemes(){
  applyTheme(readTheme());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createThemeControl,{once:true});
  else queueMicrotask(createThemeControl);
}
