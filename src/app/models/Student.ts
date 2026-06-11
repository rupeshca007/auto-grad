// src/app/models/Student.ts
import mongoose, { Schema, model, models } from 'mongoose';

const StudentSchema = new Schema({
  name: { type: String, required: true },
  className: { type: String, required: true, default: 'General' },
  parentEmail: { type: String, required: false },
  submissionCount: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

export const Student = models.Student || model('Student', StudentSchema);
