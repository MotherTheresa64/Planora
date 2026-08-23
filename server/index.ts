import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=express();
const port=Number(process.env.PORT||8787);

app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));

app.get('/api/health',(_req,res)=>res.json({
  status:'ok',
  service:'planora',
  mode:process.env.DATABASE_URL?'production':'demo',
  timestamp:new Date().toISOString()
}));

app.get('/api/config',(_req,res)=>res.json({
  firebase:Boolean(process.env.VITE_FIREBASE_PROJECT_ID),
  database:Boolean(process.env.DATABASE_URL)
}));

const here=path.dirname(fileURLToPath(import.meta.url));
const client=path.resolve(here,'../dist');
app.use(express.static(client,{maxAge:'1h',etag:true}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(client,'index.html')));

app.listen(port,'0.0.0.0',()=>console.log(`Planora listening on ${port}`));
