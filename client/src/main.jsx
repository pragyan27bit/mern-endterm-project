import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, BookOpen, CalendarCheck2, ChevronLeft, ChevronRight, CircleHelp, Command, LayoutDashboard, LogOut, Menu, Plus, Settings2, Sparkles, Timer, WandSparkles, X } from 'lucide-react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Planner from './pages/Planner';
import Focus from './pages/Focus';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TaskForm from './components/TaskForm';
import { Toast, Modal, Button } from './components/UI';
import { api, dayISO, initials } from './lib/api';
import './style.css';
const navigation=[{id:'dashboard',label:'Overview',icon:LayoutDashboard},{id:'tasks',label:'My tasks',icon:BookOpen},{id:'planner',label:'Smart planner',icon:CalendarCheck2},{id:'focus',label:'Focus room',icon:Timer},{id:'analytics',label:'Analytics',icon:BarChart3},{id:'settings',label:'Settings',icon:Settings2}];
function App(){
 const [user,setUser]=useState(null),[initializing,setInitializing]=useState(true),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [page,setPageState]=useState(()=>navigation.some(x=>x.id===location.hash.slice(1))?location.hash.slice(1):'dashboard');
 const [tasks,setTasks]=useState([]),[plan,setPlan]=useState(null),[insights,setInsights]=useState(null),[toast,setToast]=useState(null),[taskModal,setTaskModal]=useState(undefined),[deleteTask,setDeleteTask]=useState(null),[menuOpen,setMenuOpen]=useState(false);
 const notify=useCallback((message,type='success')=>setToast({message,type}),[]);
 const setPage=useCallback(id=>{setPageState(id);window.location.hash=id;setMenuOpen(false);window.scrollTo(0,0);},[]);
 useEffect(()=>{const fn=()=>{const hash=location.hash.slice(1);if(navigation.some(n=>n.id===hash))setPageState(hash);};window.addEventListener('hashchange',fn);return()=>window.removeEventListener('hashchange',fn)},[]);
 const load=useCallback(async()=>{const [a,b,c]=await Promise.all([api('/tasks'),api('/plan'),api(`/insights?day=${dayISO()}`)]);setTasks(a.tasks);setPlan(b.plan);setInsights(c);},[]);
 useEffect(()=>{let mounted=true;api('/auth/me').then(({user})=>{if(mounted)setUser(user);}).catch(()=>{}).finally(()=>{if(mounted)setInitializing(false);});return()=>{mounted=false;};},[]);
 useEffect(()=>{if(!user)return;setLoading(true);load().catch(err=>notify(err.message,'error')).finally(()=>setLoading(false));},[user?.id,load,notify]);
 async function act(action,success){setBusy(true);try{await action();await load();if(success)notify(success);return true;}catch(err){notify(err.message,'error');return false;}finally{setBusy(false);}}
 function onAuth(value){setUser(value);setPage('dashboard');notify(`Welcome ${value.name.split(' ')[0]}! Your workspace is ready.`);}
 async function logout(){try{await api('/auth/logout',{method:'POST'});}catch{}setUser(null);setTasks([]);setPlan(null);setInsights(null);}
 const onStatus=(task,status)=>act(()=>api(`/tasks/${task._id}/status`,{method:'PATCH',body:{status}}),status==='done'?'One more task completed. Nice work!':'Task status updated.');
 const onPlan=()=>act(()=>api('/plan/generate',{method:'POST',body:{startDate:dayISO()}}),'Your 7-day study schedule is ready!');
 const onLog=body=>act(()=>api('/focus',{method:'POST',body:{...body,day:dayISO()}}),'Focus time saved. Keep it up!');
 const onDelete=task=>setDeleteTask(task);
 async function confirmDelete(){if(!deleteTask)return;const done=await act(()=>api(`/tasks/${deleteTask._id}`,{method:'DELETE'}),'Task deleted.');if(done)setDeleteTask(null);}
 const openedModal=taskModal!==undefined;
 if(initializing)return <div className="app-loader"><div className="brand-icon"><Sparkles size={22}/></div><span>PacePilot</span><div className="loader-line"/></div>;
 if(!user)return <><Auth onAuth={onAuth} onError={err=>notify(err,'error')}/><Toast toast={toast} onClose={()=>setToast(null)}/></>;
 let content;
 const common={tasks,insights,user,plan,busy,setPage};
 switch(page){
 case 'tasks':content=<Tasks tasks={tasks} onAdd={()=>setTaskModal(null)} onEdit={setTaskModal} onDelete={onDelete} onStatus={onStatus} busy={busy}/>;break;
 case 'planner':content=<Planner {...common} onPlan={onPlan} onAdd={()=>setTaskModal(null)}/>;break;
 case 'focus':content=<Focus {...common} onLog={onLog} goTasks={()=>setPage('tasks')}/>;break;
 case 'analytics':content=<Analytics insights={insights}/>;break;
 case 'settings':content=<Settings user={user} onSaved={value=>{setUser(value);notify('Preferences saved. Regenerate your plan to apply the change.');}} onError={err=>notify(err,'error')}/>;break;
 default:content=<Dashboard {...common} onAdd={()=>setTaskModal(null)} onPlan={onPlan} onStatus={onStatus}/>;
 }
 return <div className="app-shell"><aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><div className="sidebar-head"><button className="brand" onClick={()=>setPage('dashboard')}><span className="brand-icon"><Sparkles size={22}/></span><span>Pace<span>Pilot</span></span></button><button className="mobile-close" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button></div><div className="sidebar-content"><div className="nav-label">WORKSPACE</div><nav className="nav-links">{navigation.slice(0,5).map(n=><button key={n.id} className={page===n.id?'active':''} onClick={()=>setPage(n.id)}><n.icon size={19}/><span>{n.label}</span>{page===n.id&&<span className="nav-active-dot"/>}</button>)}</nav><div className="nav-label nav-label-bottom">ACCOUNT</div><nav className="nav-links"><button className={page==='settings'?'active':''} onClick={()=>setPage('settings')}><Settings2 size={19}/><span>Settings</span></button></nav><div className="sidebar-promo"><div className="sidebar-promo-star">✳</div><strong>You're capable of more.</strong><p>Your future is built one focused session at a time.</p><button onClick={()=>setPage('focus')}>Get focused <ChevronRight size={15}/></button></div></div><div className="sidebar-footer"><div className="footer-avatar">{initials(user.name)}</div><div className="footer-user"><strong>{user.name}</strong><span>{user.isDemo?'Demo workspace':'My workspace'}</span></div><button title="Sign out" onClick={logout}><LogOut size={19}/></button></div></aside>
 {menuOpen&&<button aria-label="Close navigation" className="mobile-backdrop" onClick={()=>setMenuOpen(false)}/>}
 <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu size={22}/></button><span className="topbar-breadcrumb">Workspace</span><ChevronRight size={15}/><strong>{navigation.find(n=>n.id===page)?.label}</strong></div><div className="topbar-right"><div className="today-label"><span className="today-dot"/> MAKE TODAY COUNT</div><button className="topbar-create" onClick={()=>setTaskModal(null)} title="Add task"><Plus size={19}/></button><button className="topbar-avatar" onClick={()=>setPage('settings')} title="Profile">{initials(user.name)}</button></div></header><main className="main-content">{loading&&!insights?<div className="content-loader"><div className="loader-line"/>Loading your workspace...</div>:content}</main><footer className="app-footer"><span>✳ PacePilot <i>·</i> Your study, in motion.</span><span>Made with intention for students</span></footer></div>
 {openedModal&&<TaskForm task={taskModal} tasks={tasks} onClose={()=>setTaskModal(undefined)} onSaved={message=>{load().then(()=>notify(message)).catch(err=>notify(err.message,'error'));}} onError={err=>notify(err,'error')}/>}
 {deleteTask&&<Modal title="Delete this task?" onClose={()=>setDeleteTask(null)} width={420}><div className="confirm-dialog"><p>You're about to delete <strong>“{deleteTask.title}”</strong>. Any recorded study sessions for it will also be removed, and dependent tasks will be unlinked.</p><div className="modal-actions"><Button kind="secondary" onClick={()=>setDeleteTask(null)}>Keep task</Button><Button kind="danger" busy={busy} onClick={confirmDelete}>Delete permanently</Button></div></div></Modal>}
 <Toast toast={toast} onClose={()=>setToast(null)}/>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
