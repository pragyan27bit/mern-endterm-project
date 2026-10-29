import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { User, Task, Focus, Plan } from '../models/index.js';
import { requireAuth, issueCookie, safeUser } from '../lib/auth.js';
import { buildPlan, scoreTask, shiftDay, remainingMinutes } from '../lib/planner.js';
const router = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const idOk = id => mongoose.isValidObjectId(id);
const trim = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit + 1) : '';
const validDay = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sendErr = (res, status, message) => res.status(status).json({ error: message });
const todayUTC = () => new Date().toISOString().slice(0, 10);

router.post('/auth/register', authLimit, async (req, res) => {
  const name = trim(req.body?.name, 60); const email = trim(req.body?.email, 160).toLowerCase(); const password = req.body?.password;
  if (name.length < 2 || name.length > 60) return sendErr(res, 400, 'Name must contain 2–60 characters.');
  if (!emailRe.test(email) || email.length > 160) return sendErr(res, 400, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return sendErr(res, 400, 'Password must have 8–128 characters.');
  if (await User.exists({ email })) return sendErr(res, 409, 'An account with that email already exists.');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  issueCookie(res, user); res.status(201).json({ user: safeUser(user) });
});
router.post('/auth/login', authLimit, async (req, res) => {
  const email = trim(req.body?.email, 160).toLowerCase(); const password = req.body?.password;
  if (!emailRe.test(email) || typeof password !== 'string') return sendErr(res, 400, 'Invalid email or password.');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return sendErr(res, 401, 'Invalid email or password.');
  issueCookie(res, user); res.json({ user: safeUser(user) });
});
router.post('/auth/logout', (req, res) => {
  res.clearCookie('pacepilot_session', { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }); res.json({ success: true });
});
router.get('/auth/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

router.post('/auth/demo', authLimit, async (req, res) => {
  if (process.env.ENABLE_DEMO === 'false') return sendErr(res, 404, 'Demo is not enabled.');
  const demoEmail = 'demo@pacepilot.example';
  let user = await User.findOne({ email: demoEmail });
  if (!user) {
    try { user = await User.create({ name: 'Alex Morgan', email: demoEmail, passwordHash: await bcrypt.hash(randomUUID(), 10), isDemo: true }); }
    catch (err) { if (err?.code === 11000) user = await User.findOne({ email: demoEmail }); else throw err; }
  }
  // Reset demo data on each login so evaluators have an immediately useful walkthrough.
  await Promise.all([Task.deleteMany({ owner: user._id }), Focus.deleteMany({ owner: user._id }), Plan.deleteOne({ owner: user._id })]);
  const day = validDay(req.body?.day) && req.body.day >= shiftDay(todayUTC(), -1) && req.body.day <= shiftDay(todayUTC(), 1) ? req.body.day : todayUTC();
  const tasks = await Task.insertMany([
    { owner: user._id, title: 'Build REST API endpoints', course: 'Web Engineering', dueDate: shiftDay(day, 2), priority: 'high', estimateMinutes: 240, status: 'progress', spentMinutes: 60, description: 'Authentication, input validation and CRUD endpoints' },
    { owner: user._id, title: 'Create database schema', course: 'Web Engineering', dueDate: shiftDay(day, 1), priority: 'high', estimateMinutes: 120, status: 'done', completedAt: new Date(), spentMinutes: 120 },
    { owner: user._id, title: 'Train regression baseline', course: 'Machine Learning', dueDate: shiftDay(day, 4), priority: 'medium', estimateMinutes: 210, status: 'todo', description: 'Prepare dataset, train baseline and evaluate RMSE' },
    { owner: user._id, title: 'Prepare network routing notes', course: 'Computer Networks', dueDate: shiftDay(day, 3), priority: 'high', estimateMinutes: 150, status: 'todo' },
    { owner: user._id, title: 'Record project demo', course: 'Web Engineering', dueDate: shiftDay(day, 6), priority: 'medium', estimateMinutes: 90, status: 'todo' },
    { owner: user._id, title: 'Revise linear algebra', course: 'Mathematics', dueDate: shiftDay(day, 7), priority: 'low', estimateMinutes: 180, status: 'todo' }
  ]);
  await Task.updateOne({ _id: tasks[4]._id }, { dependsOn: tasks[0]._id });
  await Focus.insertMany([
    { owner: user._id, task: tasks[1]._id, minutes: 45, method: 'manual', day: shiftDay(day, -3) },
    { owner: user._id, task: tasks[1]._id, minutes: 75, method: 'manual', day: shiftDay(day, -2) },
    { owner: user._id, task: tasks[0]._id, minutes: 60, method: 'manual', day: shiftDay(day, -1) }
  ]);
  issueCookie(res, user); res.json({ user: safeUser(user) });
});

router.use(requireAuth);
router.patch('/profile', async (req, res) => {
  const minutes = Number(req.body?.dailyCapacity);
  const name = req.body?.name === undefined ? req.user.name : trim(req.body.name, 60);
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 720 || minutes % 15 !== 0) return sendErr(res, 400, 'Daily study capacity must be 30–720 minutes in 15-minute steps.');
  if (name.length < 2 || name.length > 60) return sendErr(res, 400, 'Please enter a valid name.');
  req.user.dailyCapacity = minutes; req.user.name = name; await req.user.save();
  res.json({ user: safeUser(req.user) });
});
router.get('/tasks', async (req, res) => {
  const tasks = await Task.find({ owner: req.user._id }).sort({ dueDate: 1, createdAt: -1 }).lean();
  res.json({ tasks });
});
const parseTask = req => {
  const b = req.body ?? {};
  const title = trim(b.title, 120); const course = trim(b.course, 50); const description = trim(b.description ?? '', 500);
  const dueDate = b.dueDate; const priority = b.priority || 'medium';
  const estimateMinutes = Number(b.estimateMinutes);
  if (title.length < 3 || title.length > 120) return { error: 'Task title must contain 3–120 characters.' };
  if (!course || course.length > 50) return { error: 'Course must contain 1–50 characters.' };
  if (description.length > 500) return { error: 'Description is too long.' };
  if (!validDay(dueDate)) return { error: 'Choose a valid due date.' };
  if (!['low','medium','high'].includes(priority)) return { error: 'Invalid priority.' };
  if (!Number.isInteger(estimateMinutes) || estimateMinutes < 15 || estimateMinutes > 6000 || estimateMinutes % 15) return { error: 'Estimate must be 15–6000 minutes in 15-minute steps.' };
  return { value: { title, course, description, dueDate, priority, estimateMinutes } };
};
async function dependencyFrom(req, res, currentId = null) {
  const dep = req.body?.dependsOn;
  if (!dep) return { value: null };
  if (!idOk(dep) || String(dep) === String(currentId)) return { error: 'Choose a valid prerequisite.' };
  const predecessor = await Task.findOne({ _id: dep, owner: req.user._id }).lean();
  if (!predecessor) return { error: 'Prerequisite does not belong to you.' };
  // Only one prerequisite per task, but still prevent longer cycles when editing.
  let next = predecessor; const seen = new Set([String(currentId)]);
  while (next?.dependsOn) {
    const id = String(next.dependsOn);
    if (seen.has(id)) return { error: 'This dependency would create a cycle.' };
    seen.add(id);
    next = await Task.findOne({ _id: id, owner: req.user._id }).lean();
  }
  return { value: predecessor._id };
}
router.post('/tasks', async (req, res) => {
  const result = parseTask(req);
  if (result.error) return sendErr(res, 400, result.error);
  const dep = await dependencyFrom(req, res);
  if (dep.error) return sendErr(res, 400, dep.error);
  const task = await Task.create({ ...result.value, owner: req.user._id, dependsOn: dep.value });
  res.status(201).json({ task });
});
router.patch('/tasks/:id', async (req, res) => {
  if (!idOk(req.params.id)) return sendErr(res, 400, 'Invalid task ID.');
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) return sendErr(res, 404, 'Task not found.');
  const result = parseTask(req);
  if (result.error) return sendErr(res, 400, result.error);
  const dep = await dependencyFrom(req, res, task._id);
  if (dep.error) return sendErr(res, 400, dep.error);
  Object.assign(task, result.value, { dependsOn: dep.value });
  await task.save(); res.json({ task });
});
router.patch('/tasks/:id/status', async (req, res) => {
  if (!idOk(req.params.id)) return sendErr(res, 400, 'Invalid task ID.');
  const status = req.body?.status;
  if (!['todo', 'progress', 'done'].includes(status)) return sendErr(res, 400, 'Invalid status.');
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) return sendErr(res, 404, 'Task not found.');
  if (status === 'done' && task.dependsOn) {
    const parent = await Task.findOne({ _id: task.dependsOn, owner: req.user._id });
    if (!parent || parent.status !== 'done') return sendErr(res, 409, 'Complete the prerequisite task first.');
  }
  if (status !== 'done' && task.status === 'done') {
    const doneChildren = await Task.exists({ owner: req.user._id, dependsOn: task._id, status: 'done' });
    if (doneChildren) return sendErr(res, 409, 'This task has completed dependents. Reopen those first.');
  }
  task.status = status; task.completedAt = status === 'done' ? new Date() : null;
  await task.save(); res.json({ task });
});
router.delete('/tasks/:id', async (req, res) => {
  if (!idOk(req.params.id)) return sendErr(res, 400, 'Invalid task ID.');
  const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!task) return sendErr(res, 404, 'Task not found.');
  await Promise.all([
    Task.updateMany({ owner: req.user._id, dependsOn: task._id }, { $set: { dependsOn: null } }),
    Focus.deleteMany({ owner: req.user._id, task: task._id }),
    Plan.deleteOne({ owner: req.user._id })
  ]);
  res.json({ success: true });
});
router.post('/plan/generate', async (req, res) => {
  const startDate = req.body?.startDate || todayUTC();
  if (!validDay(startDate)) return sendErr(res, 400, 'Invalid schedule start date.');
  const tasks = await Task.find({ owner: req.user._id }).lean();
  const result = buildPlan(tasks, startDate, req.user.dailyCapacity);
  const plan = await Plan.findOneAndUpdate({ owner: req.user._id }, { ...result, owner: req.user._id, generatedAt: new Date() }, { upsert: true, new: true, runValidators: true }).lean();
  res.json({ plan });
});
router.get('/plan', async (req, res) => {
  const plan = await Plan.findOne({ owner: req.user._id }).lean(); res.json({ plan });
});
router.post('/focus', async (req, res) => {
  const taskId = req.body?.task; const minutes = Number(req.body?.minutes); const method = req.body?.method ?? 'timer';
  const day = req.body?.day || todayUTC();
  if (!idOk(taskId)) return sendErr(res, 400, 'Select a task.');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return sendErr(res, 400, 'Log between 1 and 240 minutes.');
  if (!validDay(day) || day > shiftDay(todayUTC(), 1)) return sendErr(res, 400, 'Choose today or an earlier date.');
  if (!['timer','manual'].includes(method)) return sendErr(res, 400, 'Invalid session method.');
  const task = await Task.findOne({ _id: taskId, owner: req.user._id });
  if (!task) return sendErr(res, 404, 'Task not found.');
  if (task.status === 'done') return sendErr(res, 409, 'Choose an unfinished task to focus on.');
  const session = await Focus.create({ owner: req.user._id, task: task._id, minutes, method, day });
  task.spentMinutes += minutes;
  if (task.status === 'todo') task.status = 'progress';
  await task.save(); res.status(201).json({ session, task });
});
router.get('/insights', async (req, res) => {
  const [tasks, sessions] = await Promise.all([
    Task.find({ owner: req.user._id }).lean(),
    Focus.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(500).lean()
  ]);
  const today = validDay(req.query?.day) && req.query.day >= shiftDay(todayUTC(), -1) && req.query.day <= shiftDay(todayUTC(), 1) ? req.query.day : todayUTC();
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, minutes: sessions.filter(s => s.day === day).reduce((sum, s) => sum + s.minutes, 0) };
  });
  const dueSoon = tasks.filter(t => t.status !== 'done' && t.dueDate >= today && t.dueDate <= shiftDay(today, 3)).length;
  const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  let streak = 0;
  const active = new Set(sessions.map(s => s.day));
  let cursor = active.has(today) ? today : shiftDay(today, -1);
  for (let i = 0; i < 365 && active.has(cursor); i++) { streak++; cursor = shiftDay(cursor, -1); }
  const byCourse = Object.values(tasks.reduce((acc, t) => {
    const key = t.course; if (!acc[key]) acc[key] = { name: key, total: 0, done: 0 };
    acc[key].total++; if (t.status === 'done') acc[key].done++; return acc;
  }, {}));
  const nextUp = tasks.filter(t => t.status !== 'done').map(t => ({ ...t, score: scoreTask(t, today), remaining: remainingMinutes(t) })).sort((a,b) => b.score-a.score).slice(0,5);
  res.json({
    stats: { tasks: tasks.length, completed, dueSoon, overdue, totalMinutes, sessions: sessions.length, streak,
      completionRate: tasks.length ? Math.round(completed / tasks.length * 100) : 0 },
    week, byCourse, nextUp,
    recentSessions: sessions.slice(0, 10).map(s => ({ ...s, taskTitle: tasks.find(t => String(t._id) === String(s.task))?.title || 'Deleted task' }))
  });
});
export default router;
