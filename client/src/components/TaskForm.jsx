import React, { useEffect, useState } from 'react';
import { api, addDays, dayISO } from '../lib/api';
import { Modal, Button, Field } from './UI';
export default function TaskForm({task,tasks,onClose,onSaved,onError}) {
  const [data,setData]=useState(()=>({title:task?.title||'',course:task?.course||'',description:task?.description||'',dueDate:task?.dueDate||addDays(dayISO(),3),priority:task?.priority||'medium',estimateMinutes:task?.estimateMinutes||90,dependsOn:task?.dependsOn||''}));
  const [busy,setBusy]=useState(false);
  const courses=[...new Set(tasks.map(t=>t.course))];
  async function save(e){e.preventDefault(); setBusy(true); try {await api(task?`/tasks/${task._id}`:'/tasks',{method:task?'PATCH':'POST',body:{...data,estimateMinutes:Number(data.estimateMinutes)}}); onSaved(task?'Task updated successfully.':'New task added to your workspace.'); onClose();}catch(err){onError(err.message);}finally{setBusy(false);}}
  return <Modal title={task?'Edit task':'Create a new task'} onClose={onClose}>
    <form className="task-form" onSubmit={save}>
      <Field label="Task name"><input required minLength={3} maxLength={120} placeholder="e.g. Build authentication API" value={data.title} onChange={e=>setData({...data,title:e.target.value})}/></Field>
      <div className="form-grid"><Field label="Course / project"><input list="courses" required maxLength={50} placeholder="e.g. Web Engineering" value={data.course} onChange={e=>setData({...data,course:e.target.value})}/><datalist id="courses">{courses.map(x=><option key={x} value={x}/>)}</datalist></Field>
      <Field label="Due date"><input required type="date" value={data.dueDate} onChange={e=>setData({...data,dueDate:e.target.value})}/></Field></div>
      <div className="form-grid"><Field label="Priority"><select value={data.priority} onChange={e=>setData({...data,priority:e.target.value})}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></Field><Field label="Estimated time (minutes)"><input required type="number" min="15" max="6000" step="15" value={data.estimateMinutes} onChange={e=>setData({...data,estimateMinutes:e.target.value})}/></Field></div>
      <Field label="Prerequisite (optional)"><select value={data.dependsOn||''} onChange={e=>setData({...data,dependsOn:e.target.value})}><option value="">No prerequisite</option>{tasks.filter(t=>t._id!==task?._id).map(t=><option key={t._id} value={t._id}>{t.title}{t.status==='done'?' ✓':''}</option>)}</select><small>This task cannot be completed or scheduled until the prerequisite is done.</small></Field>
      <Field label="Notes (optional)"><textarea rows={3} maxLength={500} placeholder="A little more context..." value={data.description} onChange={e=>setData({...data,description:e.target.value})}/></Field>
      <div className="modal-actions"><Button type="button" kind="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} type="submit">{task?'Save changes':'Create task'}</Button></div>
    </form>
  </Modal>;
}
