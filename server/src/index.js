import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './routes/api.js';
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.get('/api/health', (_req,res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok':'database_unavailable' }));
app.use('/api', api);
app.use('/api', (_req,res) => res.status(404).json({ error: 'API endpoint not found.' }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'client/dist');
app.use(express.static(dist, { maxAge: '1h' }));
app.get('*', (_req,res) => res.sendFile(path.join(dist, 'index.html'), err => { if (err && !res.headersSent) res.status(404).json({ error: 'Frontend not built. Run npm run build.' }); }));
app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  if (err.code === 11000) return res.status(409).json({ error: 'That value is already taken.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: 'Invalid input. Please check your details.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Missing required configuration: MONGODB_URI and a JWT_SECRET of at least 32 characters.');
  process.exit(1);
}
const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`PacePilot running on port ${port}`)))
  .catch(err => { console.error('Could not connect to MongoDB:', err.message); process.exit(1); });
