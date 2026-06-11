import mongoose, { Schema, model, models } from 'mongoose';

const RubricSchema = new Schema({
  name: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Rubric = models.Rubric || model('Rubric', RubricSchema);
