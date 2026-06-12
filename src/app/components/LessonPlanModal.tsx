'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { generateLessonPlanAction, LessonPlanData } from '../actions/generateLessonPlan';

interface LessonPlanModalProps {
  topic: string;
  className: string;
  failurePercent: number;
  onClose: () => void;
}

export function LessonPlanModal({ topic, className, failurePercent, onClose }: LessonPlanModalProps) {
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<LessonPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-generate lesson plan when modal opens
  useEffect(() => {
    startTransition(async () => {
      const result = await generateLessonPlanAction(topic, className, failurePercent);
      if (result.success && result.lessonPlan) {
        setPlan(result.lessonPlan);
      } else {
        setError(result.error || 'Unknown error');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${plan?.title || 'Lesson Plan'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #111; font-size: 13px; line-height: 1.6; }
    h1 { font-size: 17px; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 4px; }
    h2 { font-size: 13px; font-weight: bold; color: #1e40af; margin: 16px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 13px; font-weight: bold; margin: 10px 0 4px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
    .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
    .red { border-left: 4px solid #ef4444; background: #fef2f2; }
    .blue { border-left: 4px solid #3b82f6; background: #eff6ff; }
    .green { border-left: 4px solid #22c55e; background: #f0fdf4; }
    .yellow { border-left: 4px solid #f59e0b; background: #fffbeb; }
    .purple { border-left: 4px solid #8b5cf6; background: #f5f3ff; }
    ul { margin: 4px 0; padding-left: 18px; }
    li { margin-bottom: 3px; }
    .badge { display: inline-block; background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 99px; }
    .footer { margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; text-align: center; }
    @media print { body { margin: 15px; } }
  </style>
</head>
<body>${printRef.current.innerHTML}</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-t-2xl px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">🔴 RED ZONE</span>
              <span className="text-white/80 text-xs">{failurePercent}% of class failed this topic</span>
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">✨ Remedial Lesson Plan</h2>
            <p className="text-orange-100 text-sm mt-0.5">{topic}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none ml-4">✕</button>
        </div>

        {/* Loading State */}
        {isPending && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4 animate-bounce">🧠</div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Gemini is crafting your lesson plan...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Designing a 10-minute micro-lesson for "{topic}"</p>
          </div>
        )}

        {/* Error State */}
        {error && !isPending && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">❌</div>
            <p className="text-red-600 font-semibold">{error}</p>
            <button onClick={onClose} className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">Close</button>
          </div>
        )}

        {/* Lesson Plan Content */}
        {plan && !isPending && (
          <>
            {/* Print Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>⏱️ {plan.timeRequired}</span>
                <span>·</span>
                <span>📚 {plan.targetClass}</span>
              </div>
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
              >
                🖨️ Print Lesson Plan
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div ref={printRef}>

                {/* Print Header (hidden in modal, shown in print) */}
                <div className="hidden">
                  <h1>{plan.title}</h1>
                  <p className="meta">Topic: {plan.topic} | {plan.targetClass} | Time: {plan.timeRequired}</p>
                </div>

                {/* Learning Objective */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">🎯 Learning Objective</p>
                  <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{plan.learningObjective}</p>
                </div>

                {/* Common Misconceptions */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    ⚠️ Common Misconceptions to Clear Up First
                  </h3>
                  <div className="space-y-2">
                    {plan.commonMisconceptions.map((m, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">❌ Students wrongly think:</p>
                          <p className="text-red-800 dark:text-red-300">{m.misconception}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">✅ Correct understanding:</p>
                          <p className="text-green-800 dark:text-green-300">{m.correction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opening Hook */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">
                    🎣 Step 1 — Opening Hook (1 min)
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 border border-purple-100 dark:border-purple-900">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">ASK THE CLASS:</p>
                    <p className="text-gray-900 dark:text-white font-medium italic">"{plan.openingHook.question}"</p>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    <span className="font-bold">What to expect:</span> {plan.openingHook.expectedStudentResponse}
                  </p>
                </div>

                {/* Analogy */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                    💡 Step 2 — The India-Specific Analogy (3 min)
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-amber-100 dark:border-amber-900">
                    <p className="text-gray-800 dark:text-gray-200 text-sm">{plan.analogy.analogyText}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">How to deliver it:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{plan.analogy.howToExplainIt}</p>
                  </div>
                </div>

                {/* Whiteboard Activity */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    🖊️ Step 3 — Whiteboard Activity: {plan.whiteboardActivity.title} (4 min)
                  </h3>
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">DRAW / WRITE THIS:</p>
                    <ol className="space-y-1.5">
                      {plan.whiteboardActivity.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="shrink-0 bg-gray-800 dark:bg-gray-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">DIAGRAM TO DRAW:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">{plan.whiteboardActivity.keyDiagram}</p>
                  </div>
                </div>

                {/* Check for Understanding */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">
                    🙋 Step 4 — Check for Understanding (1 min)
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-500 mb-2">Ask individual students — cold call, don't accept chorus answers:</p>
                  <ul className="space-y-1.5">
                    {plan.checkForUnderstanding.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="shrink-0 text-green-500 font-bold">Q{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exit Ticket */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-2">
                    📝 Exit Ticket (1 min — write in notebook)
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900">
                    <p className="text-gray-800 dark:text-gray-200 text-sm font-medium italic">"{plan.exitTicket}"</p>
                  </div>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">Collect notebooks — any student who can't answer this needs 1-on-1 follow-up.</p>
                </div>

                {/* Homework Extension */}
                {plan.homeworkExtension && (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                      🏠 Optional Homework (Advanced Students)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{plan.homeworkExtension}"</p>
                  </div>
                )}

                {/* Print Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
                  Generated by OmniLearn Lesson Plan Engine • github.com/rupeshca007/auto-grad
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex justify-between items-center">
              <p className="text-xs text-gray-500">💡 Tip: Click "Print" → "Save as PDF" to keep this for tomorrow's class</p>
              <button onClick={onClose} className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
