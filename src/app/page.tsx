// src/app/page.tsx
'use client';

import { useState, useTransition } from 'react';
import { gradeSubmissionAction } from './actions/grade';

export default function GraderDashboard() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{score: number, feedback: string} | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const student = formData.get('student') as string;
    const essay = formData.get('essay') as string;
    const rubric = formData.get('rubric') as string;

    startTransition(async () => {
      const response = await gradeSubmissionAction(student, essay, rubric);
      if (response.success && response.score !== undefined) {
        setResult({ score: response.score, feedback: response.feedback! });
      } else {
        alert("There was an error grading the assignment.");
      }
    });
  };

  return (
    <main className="p-10 max-w-3xl mx-auto space-y-8 font-sans">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dumroo.ai | Cognitive Auto-Grader</h1>
      <p className="text-gray-600 dark:text-gray-300">Automated rubric-based assessment powered by Gemini.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <input 
          name="student" 
          placeholder="Student Name" 
          required 
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800" 
        />
        <textarea 
          name="rubric" 
          placeholder="Grading Rubric (e.g., Deduct 5 pts for spelling errors)" 
          required 
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800 h-24" 
        />
        <textarea 
          name="essay" 
          placeholder="Paste student essay here..." 
          required 
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800 h-48" 
        />
        
        <button 
          type="submit" 
          disabled={isPending} 
          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold px-4 py-3 rounded disabled:bg-blue-400"
        >
          {isPending ? '🤖 Gemini is Analyzing...' : 'Grade Assignment'}
        </button>
      </form>

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 border border-green-300 dark:border-green-800 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-400">Score: {result.score}/100</h2>
          <p className="mt-3 text-green-900 dark:text-green-300 leading-relaxed">{result.feedback}</p>
        </div>
      )}
    </main>
  );
}