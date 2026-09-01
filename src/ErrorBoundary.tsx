import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};

const resetLocalData=()=>{
  try{
    const keys=Array.from({length:localStorage.length},(_,index)=>localStorage.key(index)).filter((key):key is string=>Boolean(key));
    keys.filter(key=>key==='planora-workspace-v1'||key==='planora-workspace-v2'||key.startsWith('planora-workspace-v2:')).forEach(key=>localStorage.removeItem(key));
  }catch{/* Storage can be unavailable in hardened/private contexts. */}
  window.location.reload();
};

export default class ErrorBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Planora UI error',error,info)}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'#0b1020',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'}}><section style={{maxWidth:'540px',textAlign:'center'}}><div style={{fontSize:'40px',marginBottom:'14px'}}>◇</div><h1 style={{margin:'0 0 10px'}}>Planora hit an unexpected snag.</h1><p style={{opacity:.72,lineHeight:1.6}}>Reload first. If damaged browser data caused the problem, reset only Planora’s local workspace and reopen a clean demo.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginTop:'14px'}}><button onClick={()=>window.location.reload()} style={{border:0,borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer'}}>Reload Planora</button><button onClick={resetLocalData} style={{border:'1px solid #ffffff44',borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer',background:'transparent',color:'#fff'}}>Reset local workspace</button></div></section></main>;
  }
}
