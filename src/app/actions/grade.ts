'use server'

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { connectToDatabase } from '../lib/mongodb';
import { Submission } from '../models/Submission';
import { Student } from '../models/Student';
import { getGuideByIdAction } from './evaluationGuide';

export async function gradeSubmissionAction(formData: FormData) {
  try {
    const studentName = formData.get('student') as string;
    const className = (formData.get('className') as string) || 'General';
    const rubric = formData.get('rubric') as string;
    const essayText = formData.get('essay') as string;
    const files = formData.getAll('files') as File[];
    const guideId = formData.get('guideId') as string | null;

    // --- RAG: Fetch teacher's evaluation guide if selected ---
    let ragContext = '';
    if (guideId) {
      const guide = await getGuideByIdAction(guideId);
      if (guide) {
        ragContext = `
========================================================
TEACHER'S OFFICIAL ANSWER KEY / EVALUATION GUIDE
Subject: ${guide.subject} | Guide: ${guide.name}
========================================================
${guide.content}
========================================================
CRITICAL RAG INSTRUCTION: The above is the ONLY source of truth.
You MUST grade the student's submission STRICTLY against this answer key.
Even if the student's answer differs from your general AI training knowledge,
if it matches the teacher's key above — it is CORRECT.
If it contradicts the key — it is WRONG, regardless of general knowledge.
Do NOT use your own knowledge to override the teacher's guide.
========================================================
`;
      }
    }

    let aiContent: any[] = [
      { 
        type: 'text', 
        text: ragContext 
          ? `${ragContext}\n\nNow apply the Rubric Rules below and grade accordingly:\nRubric: ${rubric}\nStudent: ${studentName}\n\nFACTUAL ACCURACY INSTRUCTION: Also check for factual errors compared to the answer key above.`
          : `You are an expert K-12 teacher grading a student submission.\nStudent: ${studentName}\nRubric Rules: ${rubric}\n\nCRITICAL INSTRUCTION: You MUST evaluate the submission for BOTH the provided Rubric Rules AND factual accuracy. If the student makes factually incorrect statements (e.g. "cows produce orange juice"), you must mark them as mistakes, deduct points appropriately, and provide the factual correction, even if their spelling and grammar are perfect.`
      }
    ];

    let dbEssayText = essayText;
    let hasFiles = false;

    // Handle Documents/Images if uploaded
    for (const file of files) {
      if (file && file.size > 0) {
        hasFiles = true;
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        if (file.type === 'application/pdf') {
          aiContent.push({ type: 'file', data: uint8Array, mimeType: 'application/pdf' });
        } else if (file.type.startsWith('image/')) {
          aiContent.push({ type: 'image', image: uint8Array });
        }
      }
    }

    if (hasFiles) {
      aiContent.push({ type: 'text', text: "Submission files (images/PDFs) attached above. Treat all files as pages of a single submission." });
      dbEssayText = essayText ? `[Files Included]\n\n${essayText}` : '[File Submission]';
    } 
    
    // Handle Text if provided
    if (essayText) {
      aiContent.push({ type: 'text', text: `Submission Text: ${essayText}` });
    }

    if (!essayText && !hasFiles) {
      throw new Error("Please provide either text or a file submission.");
    }

    // 1. Call Gemini and force a structured JSON response using messages for multimodal
    // Retry gemini-2.5-flash up to 3 times with delay (only model that works with this API key)
    const MAX_RETRIES = 3;
    let object: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Grading] Attempt ${attempt}/${MAX_RETRIES} with gemini-2.5-flash`);
        const result = await generateObject({
          model: google('gemini-2.5-flash'),
          schema,
          messages: [{ role: 'user', content: aiContent }]
        });
        object = result.object;
        console.log(`[Grading] Success on attempt ${attempt}`);
        break;
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || String(err)).toLowerCase();
        const isFatal = msg.includes('api_key') || msg.includes('invalid key') || msg.includes('authentication') || msg.includes('permission denied') || msg.includes('not found');
        if (isFatal || attempt === MAX_RETRIES) {
          throw err;
        }
        const delay = attempt * 4000; // 4s, 8s between retries
        console.warn(`[Grading] Overloaded, waiting ${delay}ms before retry ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!object) {
      throw new Error(`Gemini is too busy right now. Please wait 30 seconds and try again.`);
    }

    // 2. Connect to DB and save the result
    await connectToDatabase();
    await Submission.create({
      studentName,
      className,
      essayText: dbEssayText,
      score: object.score,
      feedback: object.feedback,
      annotatedText: object.annotatedText,
      mistakesSummary: object.mistakesSummary,
      weakTopics: object.weakTopics || [],
    });

    // 3. Computed Pattern: Update the Student's running average
    // Use findOneAndUpdate with upsert to avoid duplicate key issues
    const existingStudent = await Student.findOne({ name: studentName, className });
    if (existingStudent) {
      const currentCount = existingStudent.submissionCount;
      const currentAverage = existingStudent.averageScore;
      const newAverage = ((currentAverage * currentCount) + object.score) / (currentCount + 1);
      await Student.findOneAndUpdate(
        { name: studentName, className },
        {
          $inc: { submissionCount: 1 },
          $set: {
            averageScore: Math.round(newAverage * 10) / 10,
            lastUpdated: new Date()
          }
        }
      );
    } else {
      await Student.create({
        name: studentName,
        className,
        parentEmail: `${studentName.toLowerCase().replace(/\s+/g, '')}@example-parents.com`,
        submissionCount: 1,
        averageScore: object.score,
        lastUpdated: new Date(),
      });
    }

    // 4. Return success payload to the frontend
    return { 
      success: true, 
      score: object.score, 
      feedback: object.feedback,
      annotatedText: object.annotatedText,
      mistakesSummary: object.mistakesSummary,
      weakTopics: object.weakTopics
    };
    
  } catch (error) {
    console.error("Grading Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}