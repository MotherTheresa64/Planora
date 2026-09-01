import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=express();
const port=Number(process.env.PORT||8787);

app.disable('x-powered-by');
app.use((_req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'","script-src 'self'","style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","font-src 'self' data: https://fonts.gstatic.com","img-src 'self' data: https:","connect-src 'self' https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com","frame-src https://accounts.google.com https://*.firebaseapp.com"].join('; '));
  next();
});
app.use(express.json({limit:'1mb',strict:true}));
app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next()});

app.get('/api/health',(_req,res)=>res.json({
  status:'ok',
  service:'planora',
  mode:process.env.VITE_FIREBASE_PROJECT_ID?'cloud-ready':'demo',
  timestamp:new Date().toISOString()
}));

app.get('/api/config',(_req,res)=>res.json({
  firebase:Boolean(process.env.VITE_FIREBASE_PROJECT_ID)
}));

app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found'}));

const here=path.dirname(fileURLToPath(import.meta.url));
const client=path.resolve(here,'../dist');

app.use('/assets',express.static(path.join(client,'assets'),{maxAge:'1y',immutable:true,fallthrough:false}));
app.use(express.static(client,{maxAge:0,index:false}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(client,'index.html'),{headers:{'Cache-Control':'no-cache, no-store, must-revalidate'}}));

const server=app.listen(port,'0.0.0.0',()=>console.log(`Planora listening on ${port}`));
const shutdown=()=>server.close(()=>process.exit(0));
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
