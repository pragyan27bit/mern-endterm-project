export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch { throw new Error('Cannot reach the server. Check your connection and try again.'); }
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
export const dayISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function addDays(day, n) { const d = new Date(day+'T12:00:00'); d.setDate(d.getDate()+n); return dayISO(d); }
export function prettyDate(day, opts={}) { if (!day) return '—'; return new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',...opts}); }
export function minutesHuman(minutes) { const m=Math.max(0,Math.round(minutes||0)); return m>=60?`${Math.floor(m/60)}h${m%60?` ${m%60}m`:''}`:`${m}m`; }
export const statusText = {todo:'To do',progress:'In progress',done:'Completed'};
export const priorityLabel = {low:'Low',medium:'Medium',high:'High'};
export function initials(name) { return (name||'S').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
