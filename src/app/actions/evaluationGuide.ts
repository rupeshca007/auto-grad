'use server'

import { connectToDatabase } from '../lib/mongodb';
import { EvaluationGuide } from '../models/EvaluationGuide';
import { revalidatePath } from 'next/cache';

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

export async function saveGuideAction(name: string, subject: string, content: string) {
  if (!name || !subject || !content) {
    throw new Error('Name, subject, and content are all required.');
  }
  await connectToDatabase();
  await EvaluationGuide.create({ name, subject, content });
  revalidatePath('/');
  return { success: true };
}

export async function deleteGuideAction(id: string) {
  await connectToDatabase();
  await EvaluationGuide.findByIdAndDelete(id);
  revalidatePath('/');
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
