import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
  guideId: { type: String, required: true },
  parentText: { type: String, required: true },
  childText: { type: String, required: true },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', documentChunkSchema);
