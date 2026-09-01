import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const roots=['src','server'];
const extensions=new Set(['.ts','.tsx']);
const rules=[
  {label:'debugger statement',pattern:/\bdebugger\s*;/g},
  {label:'unsafe React HTML injection',pattern:/dangerouslySetInnerHTML/g},
  {label:'double unknown cast',pattern:/\bas\s+unknown\s+as\b/g},
  {label:'stale TODO/FIXME marker',pattern:/\b(?:TODO|FIXME)\b/g}
];

async function filesUnder(root){
  const entries=await readdir(root,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const full=path.join(root,entry.name);
    if(entry.isDirectory())files.push(...await filesUnder(full));
    else if(extensions.has(path.extname(entry.name)))files.push(full);
  }
  return files;
}

const failures=[];
for(const root of roots){
  for(const file of await filesUnder(root)){
    const content=await readFile(file,'utf8');
    const lines=content.split(/\r?\n/);
    for(const rule of rules){
      rule.pattern.lastIndex=0;
      let match;
      while((match=rule.pattern.exec(content))){
        const line=content.slice(0,match.index).split(/\r?\n/).length;
        failures.push(`${file}:${line} ${rule.label}`);
      }
    }
    lines.forEach((line,index)=>{
      if(/[ \t]+$/.test(line))failures.push(`${file}:${index+1} trailing whitespace`);
    });
  }
}

if(failures.length){
  console.error('Static quality checks failed:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.info('Static quality checks passed.');
