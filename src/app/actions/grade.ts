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
    const subjectMode = (formData.get('subjectMode') as string) || 'general';
    // subjectMode: 'general' | 'math' | 'physics' | 'chemistry' | 'language'

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

    // ── Build the CBSE/ICSE STEM-Optimized System Prompt ────────────────────
    const isSTEM = ['math', 'physics', 'chemistry'].includes(subjectMode);

    const stemOcrRules = isSTEM ? `
CRITICAL OCR & HANDWRITING RULES FOR STEM PAPERS:
1. IGNORE STRIKETHROUGHS: If any text or numbers are crossed out by the student, completely ignore them as if they don't exist.
2. MARGINS & ROUGH WORK: Ignore any work explicitly labelled "Rough Work", "R.W.", or written in the extreme left/right margins.
3. FOLLOW ARROWS: Students use arrows (→, ↓) to show where an answer continues. Follow the visual flow of the answer, not just the top-to-bottom reading order.
4. MATH/SCIENCE NOTATION: Accurately interpret handwritten symbols: integration signs (∫), summation (∑), square roots (√), Greek letters (θ, α, β, λ, μ), subscripts/superscripts (H₂O, E=mc²), and chemical formulas. Convert them to standard notation in your transcription.
5. CHAIN-OF-THOUGHT — TRANSCRIBE FIRST, GRADE SECOND: You MUST first transcribe the entire handwritten answer step-by-step into clean text/LaTeX in the 'transcription' field BEFORE grading. Grading a messy handwritten paper without transcribing first leads to errors.
` : '';

    const stepMarkingRules = isSTEM ? `
STEP-MARKING RULES (CBSE/ICSE PARTIAL CREDIT):
1. For Math/Physics problems, award marks for EACH CORRECT STEP independently.
2. If a student writes the correct formula but makes a calculation error, award marks for the formula step.
3. If a student gets the wrong final answer due to a carry-forward error from a previous correct step, award full marks for subsequent steps that correctly follow their (wrong) intermediate value.
4. In 'stepMarking', list every identifiable step, whether it earned marks or not.
5. NEVER give 0 to a Math/Physics answer just because the final numerical answer is wrong.
` : '';

    const languageRules = subjectMode === 'language' ? `
LANGUAGE PAPER GRADING RULES:
1. Evaluate: Content/Ideas (40%), Organisation/Structure (30%), Language/Grammar (30%).
2. Do NOT penalise for minor spelling errors if the meaning is clear.
3. Award marks for creative expression and original ideas, even if grammar is imperfect.
` : '';

    const systemPrompt = `You are an expert Indian CBSE/ICSE board examiner grading handwritten student papers.
Student: ${studentName} | Class: ${className} | Subject Mode: ${subjectMode}
Rubric / Marking Scheme: ${rubric}
${stemOcrRules}${stepMarkingRules}${languageRules}
${ragContext || 'Use your expert knowledge as the source of truth for factual accuracy.'}`;

    let aiContent: any[] = [
      { type: 'text', text: systemPrompt }
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

    // 1. Call Gemini with Chain-of-Thought schema (Transcribe → Grade)
    const schema = z.object({
      // ── Phase A: Chain-of-Thought Transcription ────────────────────────────
      transcription: z.string().describe(
        'STEM PAPERS: Full clean transcription of the handwritten answer into readable text. ' +
        'Convert all math/science notation to standard text or LaTeX (e.g. x^2, sqrt(x), H_2O). ' +
        'IGNORE all crossed-out text and rough work in margins. ' +
        'For non-STEM/general papers, write a brief summary of what the student wrote.'
      ),

      // ── Phase B: Step Marking (STEM only, empty array for other subjects) ──
      stepMarking: z.array(z.object({
        stepNumber: z.number(),
        stepDescription: z.string().describe('What this step was (e.g. "Applied Newton 2nd Law: F=ma")'),
        marksAwarded: z.number().describe('Marks given for this step'),
        marksAvailable: z.number().describe('Max marks available for this step'),
        isCorrect: z.boolean(),
        note: z.string().describe('Why partial/full/no marks were given')
      })).describe(
        'STEM ONLY: List every identifiable step in the solution and the marks each step earned. ' +
        'For non-STEM papers, return an empty array []'
      ),

      // ── Phase C: Final Grade ───────────────────────────────────────────────
      score: z.number().describe('Final score out of 100 based strictly on the rubric. For STEM, sum from stepMarking.'),
      feedback: z.string().describe('One encouraging paragraph of constructive feedback mentioning specific steps that were right/wrong.'),
      annotatedText: z.string().describe(
        'Use the TRANSCRIPTION (not the raw handwriting) as the base. ' +
        'Wrap incorrect parts in <span class="text-red-600 font-semibold">wrong</span> ' +
        'followed by <span class="text-green-600 font-semibold">(correct)</span>. ' +
        'For STEM, annotate step-by-step. Use <br/><br/> for breaks between steps/questions.'
      ),
      mistakesSummary: z.array(z.object({
        mistake: z.string(),
        correction: z.string(),
        reason: z.string()
      })).describe('List of specific mistakes with corrections and reason for mark deduction.'),
      weakTopics: z.array(z.string()).describe(
        'List 1-3 specific academic concepts the student clearly does not understand. ' +
        'Be specific (e.g. "Conservation of Momentum", "Ionic Bonding"). ' +
        'Return empty array [] if no major gaps found.'
      ),

      // ── Phase D: Academic Integrity ────────────────────────────────────────
      aiSuspicionScore: z.number().min(0).max(100).describe(
        'Score 0-100 for likelihood that this answer was AI-generated or copied. ' +
        '0 = definitely handwritten/human. 100 = definitely AI-generated text. ' +
        'For image/PDF uploads of handwritten papers, always return 0. ' +
        'For typed text: check for uniform sentence length, lack of personal voice, and overly formal language.'
      ),
      subjectDetected: z.string().describe('The subject/topic you detected from the submission (e.g. "Physics - Kinematics", "Chemistry - Periodic Table", "English Essay")')
    });

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
      transcription: object.transcription,
      stepMarking: object.stepMarking || [],
      mistakesSummary: object.mistakesSummary,
      weakTopics: object.weakTopics || [],
      aiSuspicionScore: object.aiSuspicionScore ?? 0,
      subjectDetected: object.subjectDetected || subjectMode,
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
      transcription: object.transcription,
      stepMarking: object.stepMarking,
      mistakesSummary: object.mistakesSummary,
      weakTopics: object.weakTopics,
      aiSuspicionScore: object.aiSuspicionScore,
      subjectDetected: object.subjectDetected,
    };
    
  } catch (error) {
    console.error("Grading Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}