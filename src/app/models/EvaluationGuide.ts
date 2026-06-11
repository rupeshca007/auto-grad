import mongoose, { Schema, model, models } from 'mongoose';

const EvaluationGuideSchema = new Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const EvaluationGuide = models.EvaluationGuide || model('EvaluationGuide', EvaluationGuideSchema);
