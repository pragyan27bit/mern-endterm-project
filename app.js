import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'node:path';
import api from './server/src/routes/api.js';

// Vercel runs this Express app as a function, not as a permanent listening server.
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// Reuse established connections across invocations on warm function instances.
let connecting = null;
async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 12000 })
      .catch(err => { connecting = null; throw err; });
  }
  await connecting;
}

app.use('/api', async (_req, res, next) => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Server environment variables are missing.' });
  }
  try { await ensureMongo(); next(); }
  catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(503).json({ error: 'Database is temporarily unavailable.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

// Serve built static assets if requests reach Express, with fallback to index.html for SPA
const pub = path.join(process.cwd(), 'public');
app.use(express.static(pub, { maxAge: '1h' }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(pub, 'index.html'), err => {
    if (err && !res.headersSent) next();
  });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  if (err.code === 11000) return res.status(409).json({ error: 'That value is already taken.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: 'Invalid input. Please check your details.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
