// src/models/Submission.ts
import mongoose, { Schema, model, models } from 'mongoose';

const SubmissionSchema = new Schema({
  studentName: { type: String, required: true },
  className: { type: String, required: true, default: 'General' },
  essayText: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  annotatedText: { type: String },
  mistakesSummary: { type: Array },
  weakTopics: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const Submission = models.Submission || model('Submission', SubmissionSchema);