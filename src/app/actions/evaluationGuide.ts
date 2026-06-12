'use server'

import { connectToDatabase } from '../lib/mongodb';
import { EvaluationGuide } from '../models/EvaluationGuide';
import { DocumentChunk } from '../models/DocumentChunk';
import { revalidatePath } from 'next/cache';
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';
import pdfParse from 'pdf-parse';

export async function getGuidesAction() {
  await connectToDatabase();
  const guides = await EvaluationGuide.find().sort({ createdAt: -1 }).lean();
  return guides.map((g: any) => ({
    _id: g._id.toString(),
    name: g.name,
    subject: g.subject,
    content: g.content,
    createdAt: g.createdAt?.toISOString(),
  }));
}

export async function saveGuideAction(formData: FormData) {
  const name = formData.get('name') as string;
  const subject = formData.get('subject') as string;
  const textContent = formData.get('content') as string;
  const file = formData.get('file') as File | null;

  if (!name || !subject) {
    throw new Error('Name and subject are required.');
  }

  let finalContent = textContent || '';

  // Process File Upload
  if (file && file.size > 0) {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse(buffer);
      finalContent = data.text;
    } else if (file.type === 'text/plain') {
      finalContent = await file.text();
    } else {
      throw new Error("Only PDF and TXT files are supported for RAG parsing.");
    }
  }

  if (!finalContent.trim()) {
    throw new Error("No content found to index.");
  }

  await connectToDatabase();

  // Create Guide
  const guide = await EvaluationGuide.create({ 
    name, 
    subject, 
    content: finalContent.substring(0, 1000) + (finalContent.length > 1000 ? '\n\n...[Content truncated in preview, fully indexed in Vector DB]' : '')
  });

  const guideId = guide._id.toString();

  // --- HIERARCHICAL CHUNKING & EMBEDDING ALGORITHM ---
  // 1. Parent Chunking: Split by paragraphs/double newlines.
  const parentChunksRaw = finalContent.split(/\n\s*\n/).filter(c => c.trim().length > 20);
  
  const parentChunks: string[] = [];
  // Merge small parent chunks to ensure context window is decent (e.g., target 500-1000 chars)
  let currentParent = "";
  for (const p of parentChunksRaw) {
    if (currentParent.length + p.length > 1500) {
      parentChunks.push(currentParent.trim());
      currentParent = p;
    } else {
      currentParent += "\n\n" + p;
    }
  }
  if (currentParent.trim()) parentChunks.push(currentParent.trim());

  // 2. Child Chunking: Split parents into sentences/small chunks for precise embedding
  const childChunks: { parent: string, child: string }[] = [];
  for (const parent of parentChunks) {
    // Split by sentence roughly
    const sentences = parent.match(/[^.!?]+[.!?]+/g) || [parent];
    let currentChild = "";
    for (const s of sentences) {
      if (currentChild.length + s.length > 250) {
        childChunks.push({ parent, child: currentChild.trim() });
        currentChild = s;
      } else {
        currentChild += " " + s;
      }
    }
    if (currentChild.trim()) childChunks.push({ parent, child: currentChild.trim() });
  }

  // 3. Generate Embeddings using Gemini text-embedding-004
  if (childChunks.length > 0) {
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel('text-embedding-004'),
      values: childChunks.map(c => c.child),
    });

    // 4. Save to Vector Database (MongoDB)
    const dbChunks = childChunks.map((c, i) => ({
      guideId,
      parentText: c.parent,
      childText: c.child,
      embedding: embeddings[i]
    }));

    await DocumentChunk.insertMany(dbChunks);
  }

  revalidatePath('/');
  revalidatePath('/knowledge');
  return { success: true };
}

export async function deleteGuideAction(id: string) {
  await connectToDatabase();
  await EvaluationGuide.findByIdAndDelete(id);
  // Also delete associated vector chunks
  await DocumentChunk.deleteMany({ guideId: id });
  revalidatePath('/');
  revalidatePath('/knowledge');
  return { success: true };
}

export async function getGuideByIdAction(id: string) {
  await connectToDatabase();
  const guide = await EvaluationGuide.findById(id).lean() as any;
  if (!guide) return null;
  return {
    _id: guide._id.toString(),
    name: guide.name,
    subject: guide.subject,
    content: guide.content,
  };
}
