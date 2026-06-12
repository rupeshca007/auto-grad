// src/models/Submission.ts
import mongoose, { Schema, model, models } from 'mongoose';

const StepMarkSchema = new Schema({
  stepNumber: { type: Number },
  stepDescription: { type: String },
  marksAwarded: { type: Number },
  marksAvailable: { type: Number },
  isCorrect: { type: Boolean },
  note: { type: String },
}, { _id: false });

const SubmissionSchema = new Schema({
  studentName: { type: String, required: true },
  className: { type: String, required: true, default: 'General' },
  essayText: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  annotatedText: { type: String },
  // ── STEM Optimizer fields ─────────────────────────────
  transcription: { type: String, default: '' },           // Chain-of-Thought clean text
  stepMarking: { type: [StepMarkSchema], default: [] },   // Per-step partial credit
  subjectDetected: { type: String, default: 'general' },  // Auto-detected subject
  // ── Academic Integrity ────────────────────────────────
  aiSuspicionScore: { type: Number, default: 0, min: 0, max: 100 },
  // ── Original fields ───────────────────────────────────
  mistakesSummary: { type: Array },
  weakTopics: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const Submission = models.Submission || model('Submission', SubmissionSchema);