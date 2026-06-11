'use server'

import { connectToDatabase } from '../lib/mongodb';
import { Rubric } from '../models/Rubric';

export async function getRubricsAction() {
  await connectToDatabase();
  
  // Fetch all rubrics, sorted alphabetically by name
  const rubrics = await Rubric.find().sort({ name: 1 }).lean();
  
  // Convert _id to string for serialization
  return rubrics.map(r => ({
    _id: r._id.toString(),
    name: r.name,
    content: r.content
  }));
}

export async function saveRubricAction(name: string, content: string) {
  if (!name || !content) {
    throw new Error('Name and content are required to save a rubric.');
  }

  await connectToDatabase();
  
  // Check if a rubric with this name already exists
  const existing = await Rubric.findOne({ name });
  if (existing) {
    throw new Error(`A rubric template named "${name}" already exists.`);
  }

  const newRubric = new Rubric({ name, content });
  await newRubric.save();
  
  return { success: true };
}
