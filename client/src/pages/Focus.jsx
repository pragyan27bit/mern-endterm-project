import React,{useEffect,useRef,useState} from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Coffee, Flame, Headphones, Pause, Play, Plus, RotateCcw, Save, Sparkles, Timer, Zap } from 'lucide-react';
import { Button, Empty, Field, PageHeader } from '../components/UI';
import { minutesHuman } from '../lib/api';
export default function Focus({tasks,insights,onLog,goTasks,busy}){
 const available=tasks.filter(t=>t.status!=='done');
 const [selected,setSelected]=useState(''),[length,setLength]=useState(25),[seconds,setSeconds]=useState(25*60),[active,setActive]=useState(false),[manual,setManual]=useState(30);
 const lastTick=useRef(null);
 useEffect(()=>{if(!selected&&available.length)setSelected(available[0]._id);},[available.length,selected]);
 useEffect(()=>{if(!active)return;lastTick.current=Date.now();const interval=setInterval(()=>{const now=Date.now(),delta=Math.floor((now-lastTick.current)/1000);if(delta>0){lastTick.current+=delta*1000;setSeconds(s=>Math.max(0,s-delta));}},500);return()=>clearInterval(interval);},[active]);
 useEffect(()=>{if(seconds===0)setActive(false);},[seconds]);
 const elapsed=Math.max(0,length*60-seconds),logged=Math.floor(elapsed/60);
 function changeLength(value){setActive(false);setLength(value);setSeconds(value*60);}
 async function saveTimer(){if(logged<1)return;const success=await onLog({task:selected,minutes:logged,method:'timer'});if(success){setActive(false);setSeconds(length*60);}}
 async function saveManual(e){e.preventDefault();await onLog({task:selected,minutes:Number(manual),method:'manual'});}
 const clock=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 const selectedTask=available.find(t=>t._id===selected);
 return <div className="page-enter"><PageHeader eyebrow="DEEP WORK MODE" title="Focus room" description="Quiet the noise. One task, one session, one step closer." actions={<span className="focus-pill"><span/> PROGRESS OVER PERFECTION</span>}/>
 <div className="focus-grid"><section className="panel timer-panel"><div className="focus-top"><div className="eyebrow">TIME TO LOCK IN</div><h2>Find your flow state.</h2><p>Pick a task, hit play, and give it your full attention.</p></div>
 <div className="duration-tabs">{[25,50,90].map(n=><button disabled={active} key={n} className={length===n?'active':''} onClick={()=>changeLength(n)}>{n} min</button>)}</div>
 <div className="timer-ring" style={{'--percent':`${Math.min(100,elapsed/(length*60)*100)}%`}}><div className="timer-inner"><span>FOCUS SESSION</span><strong>{clock}</strong><small>{active?'You’re doing great. Keep going.':seconds===0?'Session complete!':'Ready when you are'}</small></div></div>
 <div className="timer-task"><label htmlFor="timer-task-select">WORKING ON</label><div><BookOpen size={18}/><select id="timer-task-select" value={selected} onChange={e=>{setSelected(e.target.value);setActive(false);setSeconds(length*60);}}><option value="">Select a task</option>{available.map(t=><option key={t._id} value={t._id}>{t.title}</option>)}</select></div></div>
 <div className="timer-actions"><Button disabled={!selected||seconds===0} icon={active?Pause:Play} onClick={()=>setActive(!active)}>{active?'Pause session':elapsed?'Resume focus':'Start focusing'}</Button><Button kind="secondary" icon={RotateCcw} onClick={()=>{setActive(false);setSeconds(length*60);}}>Reset</Button>{elapsed>=60&&<Button kind="outline" icon={Save} busy={busy} onClick={saveTimer}>Save {logged} min</Button>}</div><p className="timer-hint">Sessions of at least 1 minute can be saved. The timer counts only while this page remains open.</p>
 </section>
 <aside className="focus-side"><div className="focus-tip"><div className="tip-head"><Headphones size={21}/><span>THE FOCUS ZONE</span></div><h3>Small sessions.<br/>Big outcomes.</h3><p>You'll be surprised what 25 minutes of undistracted effort can do.</p><div className="focus-tip-art">✦ <span>◎</span> ✦</div></div>
 <div className="panel manual-panel"><div className="manual-heading"><div className="manual-icon"><Clock3 size={19}/></div><div><h3>Log study time</h3><p>Already studied offline?</p></div></div><form onSubmit={saveManual}><Field label="Minutes spent"><input required type="number" min="1" max="240" value={manual} onChange={e=>setManual(e.target.value)}/></Field><Button type="submit" icon={Plus} busy={busy} disabled={!selected} className="full-width">Add study session</Button></form></div>
 <div className="panel mini-history"><div className="mini-history-title"><h3>Recent sessions</h3><Flame size={19}/></div>{insights?.recentSessions?.length?insights.recentSessions.slice(0,4).map(s=><div className="session-line" key={s._id}><span className="session-dot"><Zap size={15}/></span><div><strong>{s.taskTitle}</strong><small>{s.day}</small></div><b>{minutesHuman(s.minutes)}</b></div>):<p className="mini-placeholder">Your focus history will appear here.</p>}</div>
 </aside></div></div>
}
