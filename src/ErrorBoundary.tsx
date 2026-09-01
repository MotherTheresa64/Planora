import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};

const clearGuestLocalData=()=>{
  if(!window.confirm('Clear only Planora guest data stored in this browser and reload? Signed-in cloud data is not affected.'))return;
  try{
    localStorage.removeItem('planora-workspace-v3:guest');
    localStorage.removeItem('planora-workspace-v2:guest');
    localStorage.removeItem('planora-workspace-v2');
    localStorage.removeItem('planora-workspace-v1');
  }catch{/* storage can be unavailable in hardened browser contexts */}
  window.location.reload();
};

export default class ErrorBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return{failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Planora UI error',error,info)}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#0b1020',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'}}><section style={{maxWidth:'560px',textAlign:'center'}}><div style={{fontSize:'40px',marginBottom:'14px'}}>◇</div><h1 style={{margin:'0 0 10px'}}>Planora hit an unexpected snag.</h1><p style={{opacity:.76,lineHeight:1.6}}>Reload first. If malformed guest browser data is preventing startup, you can clear only the local guest workspace. Signed-in Firestore data is left alone.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginTop:'14px'}}><button onClick={()=>window.location.reload()} style={{border:0,borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer'}}>Reload Planora</button><button onClick={clearGuestLocalData} style={{border:'1px solid #ffffff44',borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer',background:'transparent',color:'#fff'}}>Clear guest local data</button></div></section></main>;
  }
}
