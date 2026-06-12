'use server'

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const LessonPlanSchema = z.object({
  title: z.string().describe('e.g. "10-Minute Re-teach: Newton\'s Third Law — Class 7 CBSE"'),
  topic: z.string(),
  targetClass: z.string(),
  timeRequired: z.string().describe('e.g. "10–12 minutes"'),
  learningObjective: z.string().describe('One clear sentence: what students will understand by the end'),
  commonMisconceptions: z.array(z.object({
    misconception: z.string().describe('What students wrongly believe'),
    correction: z.string().describe('The accurate concept')
  })).describe('2-3 most common misconceptions about this topic among Indian K-12 students'),
  openingHook: z.object({
    question: z.string().describe('One powerful, thought-provoking question to ask the class at the start'),
    expectedStudentResponse: z.string().describe('What students will likely say, and why it reveals the misconception')
  }),
  analogy: z.object({
    analogyText: z.string().describe('A relatable, India-specific analogy that makes the concept click (e.g. cricket, autorickshaw, chai)'),
    howToExplainIt: z.string().describe('Step-by-step how the teacher should deliver this analogy on the whiteboard')
  }),
  whiteboardActivity: z.object({
    title: z.string(),
    steps: z.array(z.string()).describe('3–4 simple steps the teacher writes/draws on the board'),
    keyDiagram: z.string().describe('Description of a simple diagram to draw (teacher can follow this)')
  }),
  checkForUnderstanding: z.array(z.string()).describe('2–3 quick verbal questions to ask individual students to check if the concept landed'),
  exitTicket: z.string().describe('One short written question students answer in their notebooks before the lesson ends, to confirm understanding'),
  homeworkExtension: z.string().describe('One optional real-world application question for advanced students')
});

export type LessonPlanData = z.infer<typeof LessonPlanSchema>;

export async function generateLessonPlanAction(topic: string, className: string, failurePercent: number) {
  try {
    console.log(`[LessonPlan] Generating for topic: "${topic}" | Class: ${className} | Failure: ${failurePercent}%`);

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: LessonPlanSchema,
      messages: [{
        role: 'user',
        content: `You are an expert CBSE/ICSE curriculum trainer helping an Indian K-12 teacher re-teach a topic that their students failed.

CONTEXT:
- Topic: "${topic}"
- Class: ${className}
- Failure Rate: ${failurePercent}% of students made conceptual errors on this topic
- Exam Board: CBSE/ICSE (Indian curriculum)
- Available Time: 10 minutes (must be tight and punchy — teachers are busy)

YOUR TASK:
Generate a crisp, practical, 10-minute micro-lesson plan that a teacher can walk into class with TOMORROW and deliver with zero preparation.

REQUIREMENTS:
1. The analogy MUST use something from everyday Indian life (cricket, street food, autorickshaw, railway, chai, diya, etc.) — NOT Western examples.
2. The opening hook must be a single question that reveals WHY students are confused.
3. The whiteboard activity must be something a teacher can draw in under 2 minutes with just chalk/marker.
4. Tone: Practical, no jargon. Write as if you are briefing a tired teacher in the staffroom before the next period.
5. Set topic to exactly: "${topic}"
6. Set targetClass to exactly: "Class ${className}"`
      }]
    });

    console.log(`[LessonPlan] Success for "${topic}"`);
    return { success: true, lessonPlan: result.object };

  } catch (error: any) {
    console.error('[LessonPlan] Error:', error);
    const msg = error?.message || String(error);
    return {
      success: false,
      error: msg.includes('quota') || msg.includes('busy') || msg.includes('overload')
        ? 'Gemini is busy. Please wait 30 seconds and try again.'
        : `Failed to generate lesson plan: ${msg.slice(0, 120)}`
    };
  }
}
