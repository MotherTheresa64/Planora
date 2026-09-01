import {initializeApp,getApps} from 'firebase/app';
import {browserLocalPersistence,getAuth,GoogleAuthProvider,onAuthStateChanged,setPersistence,signInWithPopup,signOut,type User} from 'firebase/auth';
import {doc,getDoc,getFirestore,setDoc} from 'firebase/firestore';
import type {Workspace,WorkspaceSnapshot} from './types';
import {emptyWorkspace,normalizeWorkspace} from './domain';

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
  void setPersistence(auth,browserLocalPersistence).catch(()=>undefined);
  return onAuthStateChanged(auth,callback);
}
export async function signInGoogle(){
  const auth=authClient();
  if(!auth)return null;
  await setPersistence(auth,browserLocalPersistence);
  return signInWithPopup(auth,new GoogleAuthProvider());
}
export async function signOutUser(){const auth=authClient();if(auth)await signOut(auth)}

export async function loadCloudWorkspace(uid:string):Promise<WorkspaceSnapshot|null>{
  const app=appClient();if(!app)return null;
  const snap=await getDoc(doc(getFirestore(app),'users',uid,'workspaces','default'));
  if(!snap.exists())return null;
  const data=snap.data();
  const workspace=normalizeWorkspace(data.workspace);
  if(!workspace)return null;
  const savedAt=typeof data.savedAt==='string'&&!Number.isNaN(Date.parse(data.savedAt))?new Date(data.savedAt).toISOString():new Date(0).toISOString();
  return{workspace,savedAt};
}
export async function saveCloudWorkspace(uid:string,workspace:Workspace,savedAt=new Date().toISOString()){
  const app=appClient();if(!app)return;
  const clean=normalizeWorkspace(workspace)??emptyWorkspace();
  await setDoc(doc(getFirestore(app),'users',uid,'workspaces','default'),{workspace:JSON.parse(JSON.stringify(clean)),savedAt,schemaVersion:3},{merge:true});
}
