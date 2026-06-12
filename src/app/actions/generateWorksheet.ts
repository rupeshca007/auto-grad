'use server'

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { connectToDatabase } from '../lib/mongodb';
import { Submission } from '../models/Submission';
import { Student } from '../models/Student';

const WorksheetSchema = z.object({
  title: z.string().describe('Worksheet title, e.g. "Personalised Practice: Photosynthesis & Newton\'s Laws — Arjun Singh"'),
  studentName: z.string(),
  targetTopics: z.array(z.string()).describe('The weak topics this worksheet targets'),
  instructions: z.string().describe('A short, encouraging instruction paragraph for the student'),
  sections: z.array(z.object({
    sectionTitle: z.string().describe('Section heading, e.g. "Section A: Short Answer (2 marks each)"'),
    topic: z.string().describe('Which weak topic this section targets'),
    questions: z.array(z.object({
      number: z.number(),
      question: z.string().describe('The full question text'),
      marks: z.number().describe('Marks available for this question'),
      hint: z.string().describe('A subtle hint for the student, not giving away the answer'),
      answerKey: z.string().describe('The model answer for the teacher\'s copy')
    }))
  })),
  totalMarks: z.number(),
  estimatedTime: z.string().describe('e.g. "20-25 minutes"'),
  teacherNote: z.string().describe('A note to the teacher about what to watch for when marking')
});

export type WorksheetData = z.infer<typeof WorksheetSchema>;

export async function generateWorksheetAction(studentName: string, className: string) {
  try {
    await connectToDatabase();

    // 1. Fetch all of this student's recent submissions to aggregate weak topics
    const submissions = await Submission.find({ studentName, className })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (!submissions || submissions.length === 0) {
      return { success: false, error: `No graded submissions found for ${studentName} in Class ${className}. Grade at least one assignment first.` };
    }

    // 2. Aggregate weak topics — count frequency across all submissions
    const topicFrequency: Record<string, number> = {};
    for (const sub of submissions) {
      const topics = (sub as any).weakTopics || [];
      for (const topic of topics) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    }

    // Sort by frequency, take top 3 most persistent weak topics
    const sortedTopics = Object.entries(topicFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic)
      .slice(0, 3);

    if (sortedTopics.length === 0) {
      return { success: false, error: `No weak topics detected for ${studentName}. Gemini found no knowledge gaps in their graded submissions.` };
    }

    const studentRecord = await Student.findOne({ name: studentName, className }).lean() as any;
    const averageScore = studentRecord?.averageScore || 0;

    // 3. Generate the targeted worksheet using Gemini
    console.log(`[Worksheet] Generating for ${studentName} | Weak topics: ${sortedTopics.join(', ')}`);

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: WorksheetSchema,
      messages: [{
        role: 'user',
        content: `You are an expert CBSE/ICSE curriculum designer. Create a personalised remediation worksheet for the following student.

STUDENT PROFILE:
- Name: ${studentName}
- Class: ${className}
- Current Average Score: ${averageScore}/100
- Diagnosed Weak Topics (most frequent to least): ${sortedTopics.join(', ')}
- Number of graded submissions analysed: ${submissions.length}

WORKSHEET REQUIREMENTS:
1. Create ONE focused section per weak topic (max 3 sections).
2. Each section should have 3-4 questions that progressively increase in difficulty (Easy → Medium → Hard).
3. Question types should be mixed: 1 fill-in-the-blank, 1 short answer, 1 application/scenario question.
4. All questions must be appropriate for the student's class level (Class ${className}).
5. The 'hint' must be a Socratic nudge (e.g. "Think about what role chlorophyll plays in the process...") — NOT a direct answer.
6. The 'answerKey' must be a complete model answer suitable for a teacher's marking scheme.
7. The tone must be encouraging and growth-oriented. This student needs confidence.
8. Total marks should be between 15-25.
9. Set studentName to exactly: "${studentName}"

Generate a complete, print-ready worksheet now.`
      }]
    });

    console.log(`[Worksheet] Successfully generated for ${studentName}`);
    return { success: true, worksheet: result.object, analyzedTopics: sortedTopics };

  } catch (error: any) {
    console.error('[Worksheet] Generation error:', error);
    const msg = error?.message || String(error);
    return { success: false, error: msg.includes('quota') || msg.includes('busy') 
      ? 'Gemini is busy. Please wait 30 seconds and try again.' 
      : `Failed to generate worksheet: ${msg}` };
  }
}
