// src/actions/grade.ts
'use server'

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { connectToDatabase } from '../lib/mongodb';
import { Submission } from '../models/Submission';

export async function gradeSubmissionAction(studentName: string, essayText: string, rubric: string) {
  try {
    // 1. Call Gemini and force a structured JSON response
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        score: z.number().describe('The final score out of 100 based strictly on the rubric.'),
        feedback: z.string().describe('A single, encouraging paragraph of constructive feedback.'),
      }),
      prompt: `You are an expert K-12 teacher grading a student submission. 
      Student: ${studentName}
      Submission: ${essayText}
      Rubric Rules: ${rubric}
      
      Evaluate the submission strictly against the rubric rules.`,
    });

    // 2. Connect to DB and save the result
    await connectToDatabase();
    await Submission.create({
      studentName,
      essayText,
      score: object.score,
      feedback: object.feedback,
    });

    // 3. Return success payload to the frontend
    return { success: true, score: object.score, feedback: object.feedback };
    
  } catch (error) {
    console.error("Grading Error:", error);
    // Expose the error message for easier debugging during development
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}