import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,type User} from 'firebase/auth';
import {doc,getDoc,getFirestore,setDoc} from 'firebase/firestore';
import type {Workspace} from './types';
import {normalizeWorkspace} from './storage';

const config={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseReady=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
function appClient(){if(!firebaseReady)return null;return getApps()[0]??initializeApp(config)}
export function authClient(){const app=appClient();return app?getAuth(app):null}
export function firstName(user:User|null){return user?.displayName?.trim().split(/\s+/)[0]||'You'}
export function subscribeAuth(callback:(user:User|null)=>void){
  const auth=authClient();
  if(!auth){callback(null);return()=>undefined}
  return onAuthStateChanged(auth,callback);
}
export async function signInGoogle(){const auth=authClient();if(!auth)return null;return signInWithPopup(auth,new GoogleAuthProvider())}
export async function signOutUser(){const auth=authClient();if(auth)await signOut(auth)}
export async function loadCloudWorkspace(uid:string):Promise<Workspace|null>{
  const app=appClient();if(!app)return null;
  const snap=await getDoc(doc(getFirestore(app),'users',uid,'workspaces','default'));
  return snap.exists()?normalizeWorkspace(snap.data().workspace):null;
}
export async function saveCloudWorkspace(uid:string,workspace:Workspace){
  const app=appClient();if(!app)return;
  const clean=JSON.parse(JSON.stringify(workspace)) as Workspace;
  await setDoc(doc(getFirestore(app),'users',uid,'workspaces','default'),{workspace:clean,updatedAt:new Date().toISOString()},{merge:true});
}
