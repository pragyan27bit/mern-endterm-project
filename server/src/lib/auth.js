import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
export function issueCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('pacepilot_session', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
  });
}
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.pacepilot_session;
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
}
export function safeUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, dailyCapacity: user.dailyCapacity, isDemo: user.isDemo };
}
