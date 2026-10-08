'use client';
import {useState,useEffect,useRef} from 'react';
import {Pencil,ShieldBan,Send,MessageSquare,ArrowLeft,Lock,Check} from 'lucide-react';
import {useMarket,api} from './MarketProvider';
export default function ChatInterface({room,onBack}:{room:any;onBack:()=>void}) {
 const {user,displayName,aliases,mutate}=useMarket(); const [state,setState]=useState<any>({messages:[],blocked:false,blockedByMe:false});
 const [connected,setConnected]=useState(false),[draft,setDraft]=useState(''),[editing,setEditing]=useState(false),[nickname,setNickname]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false); const end=useRef<HTMLDivElement>(null);
 const name=displayName(room.other_id,room.username);
 useEffect(()=>{const events=new EventSource('/api/events?room='+encodeURIComponent(room.id));events.onmessage=e=>{setState(JSON.parse(e.data));setConnected(true);};events.onerror=()=>setConnected(false);events.addEventListener('unavailable',()=>{setConnected(false);events.close();setError('Session expired. Please reload and log in again.');});return()=>events.close();},[room.id]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[state.messages.length]);
 async function action(data:any){setBusy(true);setError('');try{await mutate(data);const next=await api(undefined,'?room='+encodeURIComponent(room.id));setState(next);return true;}catch(e:any){setError(e.message);return false;}finally{setBusy(false);}}
 return <section className="chat-panel">
  <header className="chat-header"><button className="icon-btn mobile-back" aria-label="Back to conversations" onClick={onBack}><ArrowLeft size={19}/></button><div className="avatar">{name[0]?.toUpperCase()}</div><div className="grow min-w-0"><h3 className="truncate">{name}</h3><span className="muted text-xs">@{room.username} · {connected?'Live conversation':'Connecting…'}</span></div><button className="icon-btn" title="Set nickname" aria-label="Set nickname" onClick={()=>{setNickname(aliases.find((a:any)=>a.target_user_id===room.other_id)?.nickname||'');setEditing(!editing);}}><Pencil size={18}/></button><button disabled={busy} className="icon-btn danger" title={state.blockedByMe?'Unblock user':'Block user'} aria-label={state.blockedByMe?'Unblock user':'Block user'} onClick={()=>action({action:state.blockedByMe?'unblock':'block',target_user_id:room.other_id})}><ShieldBan size={18}/></button></header>
  <div className="chat-listing"><span className="th-mini">TH {room.town_hall_level}</span><span>Town Hall {room.town_hall_level} account</span><strong>${Number(room.price).toLocaleString()}</strong></div>
  {editing&&<form className="nickname-box" onSubmit={async e=>{e.preventDefault();if(await action({action:'alias',target_user_id:room.other_id,nickname}))setEditing(false);}}><label htmlFor="nickname"><Pencil size={14}/> A name just for you</label><div className="flex gap-2"><input autoFocus id="nickname" maxLength={40} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={room.username}/><button className="btn primary" disabled={busy}>Save</button><button type="button" className="icon-btn" onClick={()=>setEditing(false)}>×</button></div><small>Only you see this nickname. Clear it to restore their username.</small></form>}
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation messages">
   <div className="chat-start"><Lock size={13}/> Only conversation participants can read these messages.</div>
   {state.messages.length===0&&<div className="empty-chat"><MessageSquare/><h3>Every good deal starts with hello.</h3><p>Ask {name} about their village or make an offer.</p></div>}
   {state.messages.map((m:any)=><article key={m.id} className={'bubble '+(m.sender_id===user.id?'mine':'')}><small>{m.sender_id===user.id?'You':name}</small><p>{m.content}</p><time>{new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{m.sender_id===user.id&&<Check size={12}/>}</time></article>)}<div ref={end}/>
  </div>
  {state.blocked&&<p className="blocked-note"><ShieldBan size={16}/> Messages are disabled because a participant has blocked the other.</p>}
  <form className="chat-compose" onSubmit={async e=>{e.preventDefault();if(!draft.trim()||state.blocked)return;if(await action({action:'message',room_id:room.id,content:draft}))setDraft('');}}><input aria-label="Message" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy||state.blocked} placeholder="Say hello. Make an offer."/><button className="btn primary" aria-label="Send message" disabled={busy||state.blocked||!draft.trim()}><Send size={18}/></button></form>
 </section>;
}
