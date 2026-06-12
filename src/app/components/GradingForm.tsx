'use client';

import { useState, useTransition } from 'react';
import { gradeSubmissionAction } from '../actions/grade';
import { sendParentReport } from '../actions/notify';
import { saveRubricAction } from '../actions/rubric';
import { useRouter } from 'next/navigation';

export function GradingForm({ initialRubrics = [], initialGuides = [], allClasses = [] }: { initialRubrics?: any[], initialGuides?: any[], allClasses?: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDispatching, startDispatch] = useTransition();
  const [isSavingRubric, startSavingRubric] = useTransition();
  
  const [rubrics, setRubrics] = useState<any[]>(initialRubrics);
  const [rubricText, setRubricText] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState("");

  const [result, setResult] = useState<{ 
    studentName: string, 
    score: number, 
    feedback: string,
    annotatedText?: string,
    transcription?: string,
    stepMarking?: any[],
    mistakesSummary?: any[],
    weakTopics?: string[],
    aiSuspicionScore?: number,
    subjectDetected?: string,
  } | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [subjectMode, setSubjectMode] = useState('general');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const student = formData.get('student') as string;

    startTransition(async () => {
      setDispatchStatus(null);
      // We pass the entire FormData object to the server action now
      const response = await gradeSubmissionAction(formData);
      
      if (response.success && response.score !== undefined) {
        setResult({ 
          studentName: student, 
          score: response.score, 
          feedback: response.feedback!,
          annotatedText: response.annotatedText,
          transcription: response.transcription,
          stepMarking: response.stepMarking,
          mistakesSummary: response.mistakesSummary,
          weakTopics: response.weakTopics,
          aiSuspicionScore: response.aiSuspicionScore,
          subjectDetected: response.subjectDetected,
        });
        router.refresh(); 
      } else {
        alert("There was an error grading the assignment: " + response.error);
      }
    });
  };

  const handleDispatch = () => {
    if (!result) return;
    startDispatch(async () => {
      const response = await sendParentReport(result.studentName, result.score, result.feedback);
      setDispatchStatus(response.message);
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Submit New Assignment</h2>
        <p className="text-gray-600 dark:text-gray-300">Upload an image of the student's work OR paste the text below.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <input 
          name="student" 
          placeholder="Student Name" 
          required 
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800" 
        />

        {/* Class Selector */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Class / Section</label>
            <div className="flex gap-2">
              {allClasses.length > 0 && (
                <select
                  onChange={e => {
                    const input = document.querySelector('input[name="className"]') as HTMLInputElement;
                    if (input && e.target.value) input.value = e.target.value;
                  }}
                  className="border border-gray-300 dark:border-gray-700 p-2.5 rounded text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                  defaultValue=""
                >
                  <option value="" disabled>Pick class...</option>
                  {allClasses.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              )}
              <input
                name="className"
                placeholder={allClasses.length > 0 ? 'or type new class (e.g. 7A)' : 'Class name (e.g. 6, 7A, 8B)'}
                required
                className="flex-1 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-black dark:text-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Subject Mode Selector */}
        <div className="p-3 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
            🧪 Subject Mode (CBSE/ICSE Optimizer)
          </label>
          <select
            name="subjectMode"
            value={subjectMode}
            onChange={e => setSubjectMode(e.target.value)}
            className="w-full border border-amber-300 dark:border-amber-700 p-2 rounded text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
          >
            <option value="general">📝 General (Essays, Language Arts)</option>
            <option value="language">📖 Language Paper (Content 40% / Structure 30% / Grammar 30%)</option>
            <option value="math">📐 Mathematics (Step Marking + Partial Credit)</option>
            <option value="physics">⚛️ Physics (Formula + Step Marking + Rough Work ignored)</option>
            <option value="chemistry">🧪 Chemistry (Chemical Formula + Equation Steps)</option>
          </select>
          {['math','physics','chemistry'].includes(subjectMode) && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
              ✅ STEM mode: AI will transcribe handwriting first, then award partial credit per step. Crossed-out text & rough work ignored.
            </p>
          )}
        </div>

        {/* RAG Guide Selector */}
        <div className={`p-3 rounded-lg border-2 transition-colors ${
          selectedGuideId
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1.5">
            🧠 Apply Evaluation Guide (RAG)
          </label>
          <select
            name="guideId"
            value={selectedGuideId}
            onChange={e => setSelectedGuideId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
          >
            <option value="">No guide — use Gemini's general knowledge</option>
            {initialGuides.map((g: any) => (
              <option key={g._id} value={g._id}>📋 {g.name} ({g.subject})</option>
            ))}
          </select>
          {selectedGuideId && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1.5 font-medium">
              ✅ Gemini will grade STRICTLY against your answer key — not its own knowledge.
            </p>
          )}
        </div>
        
        <div className="space-y-2 bg-blue-50/50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/50 rounded-lg">
          <select 
            className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 font-medium"
            onChange={(e) => {
              const selected = rubrics.find(r => r._id === e.target.value);
              if (selected) setRubricText(selected.content);
            }}
            defaultValue=""
          >
            <option value="" disabled>Load a Pre-Saved Rubric Template...</option>
            {rubrics.map(r => (
              <option key={r._id} value={r._id}>📋 {r.name}</option>
            ))}
          </select>
          
          <textarea 
            name="rubric" 
            placeholder="Type your grading rubric here, or select a template above..." 
            value={rubricText}
            onChange={(e) => setRubricText(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800 h-24 mt-2" 
          />
          
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isSavingRubric || !rubricText.trim()}
              onClick={() => {
                const name = prompt("Enter a name for this new rubric template (e.g., '5th Grade Science'):");
                if (name) {
                  startSavingRubric(async () => {
                    try {
                      await saveRubricAction(name, rubricText);
                      setRubrics([...rubrics, { _id: Date.now().toString(), name, content: rubricText }]);
                      alert("Template saved successfully!");
                    } catch (e: any) {
                      alert(e.message);
                    }
                  });
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold disabled:opacity-50"
            >
              {isSavingRubric ? "Saving..." : "💾 Save as New Template"}
            </button>
          </div>
        </div>
        
        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800/50">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload Image(s) or PDF(s) of Assignment (Optional)
          </label>
          <input 
            type="file" 
            name="files" 
            accept="image/*,application/pdf"
            multiple
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-200"
          />
        </div>

        <div className="flex items-center justify-center space-x-4">
          <span className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></span>
          <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">OR</span>
          <span className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></span>
        </div>

        <textarea 
          name="essay" 
          placeholder="Paste student essay text here (if no image uploaded)..." 
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-black dark:text-white dark:bg-gray-800 h-32" 
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
        <div className="bg-green-50 dark:bg-green-900/20 p-6 border border-green-300 dark:border-green-800 rounded-lg shadow-sm space-y-4">
          {/* Score header + AI Integrity badge */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-400">Score: {result.score}/100</h2>
              {result.subjectDetected && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📚 Detected: {result.subjectDetected}</p>
              )}
            </div>
            {/* AI Suspicion Badge */}
            {result.aiSuspicionScore !== undefined && (
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                result.aiSuspicionScore >= 70
                  ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                  : result.aiSuspicionScore >= 35
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {result.aiSuspicionScore >= 70 ? '🔴 High AI Risk' 
                  : result.aiSuspicionScore >= 35 ? '🟡 Review Recommended' 
                  : '🟢 Likely Human Written'}
                <span className="ml-1 font-normal opacity-75">({result.aiSuspicionScore}%)</span>
              </div>
            )}
          </div>

          <p className="text-green-900 dark:text-green-300 leading-relaxed">{result.feedback}</p>
          
          {/* Transcription panel - shown for STEM */}
          {result.transcription && result.transcription.length > 20 && (
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🔍 AI Transcription (what Gemini read)</h3>
              <div className="bg-gray-50 dark:bg-gray-800/70 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                {result.transcription}
              </div>
            </div>
          )}

          {/* Step Marking table - STEM only */}
          {result.stepMarking && result.stepMarking.length > 0 && (
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">📊 Step-by-Step Marking (CBSE Partial Credit)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Step</th>
                      <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Description</th>
                      <th className="text-center p-2 border border-gray-200 dark:border-gray-700">Marks</th>
                      <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.stepMarking.map((step: any, i: number) => (
                      <tr key={i} className={step.isCorrect ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}>
                        <td className="p-2 border border-gray-200 dark:border-gray-700 font-bold text-center">{step.stepNumber}</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700">{step.stepDescription}</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700 text-center font-mono">
                          <span className={step.marksAwarded === step.marksAvailable ? 'text-green-600 font-bold' : step.marksAwarded > 0 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>
                            {step.marksAwarded}/{step.marksAvailable}
                          </span>
                        </td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700 text-xs text-gray-500">{step.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.annotatedText && (
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Annotated Submission:</h3>
              <div 
                className="max-w-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 leading-loose"
                dangerouslySetInnerHTML={{ __html: result.annotatedText }}
              />
            </div>
          )}

          {result.mistakesSummary && result.mistakesSummary.length > 0 && (
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Deductions Breakdown:</h3>
              <ul className="space-y-3">
                {result.mistakesSummary.map((mistake: any, i: number) => (
                  <li key={i} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-600 font-bold line-through">{mistake.mistake}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-green-600 font-bold">{mistake.correction}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{mistake.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t border-green-200 dark:border-green-800">
            <button 
              onClick={handleDispatch}
              disabled={isDispatching || !!dispatchStatus}
              className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-semibold px-4 py-2 rounded disabled:bg-indigo-400"
            >
              {isDispatching ? 'Sending...' : (dispatchStatus ? 'Dispatched' : 'Dispatch to Parent')}
            </button>
            {dispatchStatus && (
              <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-400 font-medium">{dispatchStatus}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
