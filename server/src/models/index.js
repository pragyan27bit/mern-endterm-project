import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  dailyCapacity: { type: Number, default: 180, min: 30, max: 720 },
  isDemo: { type: Boolean, default: false }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, required: true, maxlength: 120 },
  course: { type: String, trim: true, required: true, maxlength: 50 },
  description: { type: String, trim: true, default: '', maxlength: 500 },
  dueDate: { type: String, required: true }, // YYYY-MM-DD, local-calendar-neutral
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  estimateMinutes: { type: Number, min: 15, max: 6000, required: true },
  spentMinutes: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['todo', 'progress', 'done'], default: 'todo' },
  dependsOn: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });
taskSchema.index({ owner: 1, dueDate: 1 });

const focusSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  minutes: { type: Number, required: true, min: 1, max: 240 },
  method: { type: String, enum: ['timer', 'manual'], default: 'timer' },
  day: { type: String, required: true }
}, { timestamps: true });
focusSchema.index({ owner: 1, day: 1 });

const planSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  startDate: { type: String, required: true },
  capacity: { type: Number, required: true },
  blocks: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    day: { type: String, required: true },
    minutes: { type: Number, required: true }
  }],
  conflicts: [{ task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, minutes: Number, reason: String }],
  days: [{ type: String }],
  scheduledMinutes: { type: Number, default: 0 },
  unallocatedMinutes: { type: Number, default: 0 },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Focus = mongoose.model('Focus', focusSchema);
export const Plan = mongoose.model('Plan', planSchema);
