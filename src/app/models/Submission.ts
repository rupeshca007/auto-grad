// src/models/Submission.ts
import mongoose, { Schema, model, models } from 'mongoose';

const SubmissionSchema = new Schema({
  studentName: { type: String, required: true },
  essayText: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Submission = models.Submission || model('Submission', SubmissionSchema);