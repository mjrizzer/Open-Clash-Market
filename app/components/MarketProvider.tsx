'use client';
import { createContext,useContext,useState,useEffect,useCallback,useRef } from 'react';
export type Listing={id:string;seller_id:string;username:string;coc_id:string;town_hall_level:number;price:number;status:string;created_at:number;sample?:boolean;contact_info?:string};
type State={user:{id:string;username:string}|null;listings:Listing[];aliases:{target_user_id:string;nickname:string}[];rooms:any[];blocks:any[]};
const empty:State={user:null,listings:[],aliases:[],rooms:[],blocks:[]};
const Context=createContext<any>(null);
export async function api(data?:any,query=''):Promise<any> { const r=await fetch('/api/market'+query,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'}); const body:any=await r.json(); if(!r.ok) throw new Error(body.error||'Request failed.'); return body; }
export function MarketProvider({children}:{children:React.ReactNode}) {
  const [state,setState]=useState<State>(empty); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const revision=useRef(0);
  const refresh=useCallback(async()=>{const current=++revision.current; try {const next=await api();if(current===revision.current){setState(next);setError('');}}catch(e:any){if(current===revision.current)setError(e.message);}finally{if(current===revision.current)setLoading(false);}},[]);
  useEffect(()=>{refresh(); const timer=setInterval(refresh,10000); return()=>clearInterval(timer);},[refresh]);
  const mutate=async(data:any)=>{const result=await api(data);await refresh();return result;};
  const displayName=(id:string,username:string)=>state.aliases.find(a=>a.target_user_id===id)?.nickname||username;
  return <Context.Provider value={{...state,loading,error,refresh,mutate,displayName}}>{children}</Context.Provider>;
}
export const useMarket=()=>useContext(Context);
export const samples:Listing[]=[
  [16,425,'DragonForge','Q2PYL09'],[15,280,'ArcherQueen','P0Q8RJJ'],[14,195,'NightRaider','Y2L9G8P'],[13,120,'ElixirKing','L0QY2RP'],[12,85,'VillageChief','G82PYLQ'],[11,55,'GoblinGold','JY2P0QL'],
].map((r,i)=>({id:'sample-'+i,seller_id:'sample-user-'+i,username:String(r[2]),coc_id:'#'+r[3],town_hall_level:Number(r[0]),price:Number(r[1]),status:'available',created_at:0,sample:true}));
