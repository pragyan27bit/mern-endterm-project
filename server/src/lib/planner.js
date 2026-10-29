/**
 * Pure scheduling engine. Operates on YYYY-MM-DD dates, integer minutes, and task ids.
 * Earliest-deadline scheduling with urgency, priority and work already logged factored in.
 * A dependency is eligible only after its parent has been completed in the task database.
 * The planner never fabricates extra capacity: unallocated work appears as a conflict.
 */
export function shiftDay(day, delta) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function dateDiff(a, b) {
  return Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
}
export function remainingMinutes(task) {
  return Math.max(0, Number(task.estimateMinutes) - Number(task.spentMinutes || 0));
}
export function scoreTask(task, today) {
  const days = dateDiff(today, task.dueDate);
  const priority = { high: 30, medium: 15, low: 0 }[task.priority] ?? 15;
  const urgency = days < 0 ? 90 : Math.max(0, 65 - days * 8);
  const pressure = Math.min(25, Math.round(remainingMinutes(task) / Math.max(1, days + 1) / 25));
  return urgency + priority + pressure;
}
export function buildPlan(tasks, today, dailyCapacity, horizon = 7) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('Invalid start date');
  if (!Number.isInteger(dailyCapacity) || dailyCapacity < 30 || dailyCapacity > 720) throw new Error('Invalid capacity');
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 31) throw new Error('Invalid horizon');
  const days = Array.from({ length: horizon }, (_, index) => shiftDay(today, index));
  const taskLookup = new Map(tasks.map(t => [String(t._id ?? t.id), t]));
  const blocks = [];
  const conflicts = [];
  const eligible = [];
  for (const task of tasks) {
    if (task.status === 'done' || remainingMinutes(task) === 0) continue;
    const parentId = task.dependsOn ? String(task.dependsOn._id ?? task.dependsOn) : null;
    if (parentId && taskLookup.has(parentId) && taskLookup.get(parentId).status !== 'done') {
      conflicts.push({ task: String(task._id ?? task.id), minutes: remainingMinutes(task), reason: 'Blocked by a prerequisite' });
    } else {
      eligible.push({ ...task, _id: String(task._id ?? task.id), remaining: remainingMinutes(task) });
    }
  }
  // Work that is both urgent and high priority comes first. Sort deterministic on ties.
  eligible.sort((a, b) => scoreTask(b, today) - scoreTask(a, today) || a.dueDate.localeCompare(b.dueDate) || String(a._id).localeCompare(String(b._id)));
  for (const day of days) {
    let left = dailyCapacity;
    // Spread chunks across days; 90 minute limit protects against unwieldy focus blocks.
    while (left > 0) {
      const candidates = eligible.filter(t => t.remaining > 0 && day <= t.dueDate);
      if (!candidates.length) break;
      candidates.sort((a, b) => scoreTask(b, day) - scoreTask(a, day) || a.dueDate.localeCompare(b.dueDate));
      const task = candidates[0];
      const allocation = Math.min(left, task.remaining, 90);
      blocks.push({ task: task._id, day, minutes: allocation });
      task.remaining -= allocation;
      left -= allocation;
    }
  }
  for (const task of eligible) {
    if (task.remaining > 0) {
      conflicts.push({ task: task._id, minutes: task.remaining, reason: task.dueDate < today ? 'Deadline already passed' : 'Not enough time before the deadline' });
    }
  }
  return {
    startDate: today, capacity: dailyCapacity, blocks, conflicts,
    scheduledMinutes: blocks.reduce((sum, b) => sum + b.minutes, 0),
    unallocatedMinutes: conflicts.reduce((sum, c) => sum + c.minutes, 0),
    days
  };
}
