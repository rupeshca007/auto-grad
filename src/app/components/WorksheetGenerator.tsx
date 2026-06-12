'use client';

import { useState, useTransition, useRef } from 'react';
import { generateWorksheetAction, WorksheetData } from '../actions/generateWorksheet';

interface WorksheetGeneratorProps {
  students: { name: string; className: string; averageScore: number; weakTopicsCount?: number }[];
}

export function WorksheetGenerator({ students }: WorksheetGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [analyzedTopics, setAnalyzedTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    if (!selectedStudent || !selectedClass) return;
    setError(null);
    setWorksheet(null);

    startTransition(async () => {
      const result = await generateWorksheetAction(selectedStudent, selectedClass);
      if (result.success && result.worksheet) {
        setWorksheet(result.worksheet);
        setAnalyzedTopics(result.analyzedTopics || []);
      } else {
        setError(result.error || 'Unknown error');
      }
    });
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${worksheet?.title || 'Worksheet'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 30px; color: #000; font-size: 13px; }
            h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
            h2 { font-size: 15px; background: #f0f0f0; padding: 6px 10px; border-left: 4px solid #333; margin-top: 20px; }
            .meta { text-align: center; color: #555; font-size: 11px; margin-bottom: 12px; }
            .instructions { border: 1px solid #ccc; padding: 8px 12px; background: #fafafa; margin-bottom: 16px; font-style: italic; }
            .question { margin: 12px 0; padding-left: 4px; }
            .answer-box { border: 1px solid #999; min-height: 48px; margin: 6px 0 12px 0; padding: 4px; }
            .hint { color: #888; font-size: 11px; font-style: italic; }
            .marks { float: right; font-weight: bold; color: #555; }
            .answer-key { background: #fff8dc; border: 1px dashed #ccc; padding: 6px; margin-top: 4px; color: #555; font-size: 11px; }
            .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #888; text-align: center; }
            @media print { body { margin: 15px; } }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  // Unique classes from students
  const classOptions = [...new Set(students.map(s => s.className))].sort();
  const studentOptions = students.filter(s => !selectedClass || s.className === selectedClass);

  return (
    <div className="space-y-6">
      {/* Generator Panel */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📋</span>
          <div>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200">AutoWorksheet Engine</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              Generates a personalised, print-ready remediation worksheet targeting each student's diagnosed weak topics.
            </p>
          </div>
        </div>

        {/* Student + Class selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">Class / Section</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }}
              className="w-full border border-indigo-300 dark:border-indigo-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="">All Classes</option>
              {classOptions.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">Select Student</label>
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="w-full border border-indigo-300 dark:border-indigo-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="">Choose a student...</option>
              {studentOptions.map(s => (
                <option key={`${s.name}-${s.className}`} value={s.name}>
                  {s.name} — Avg: {s.averageScore}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedStudent && selectedClass && (
          <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-3 mb-4 text-sm text-indigo-800 dark:text-indigo-300">
            <span className="font-semibold">🧠 How it works:</span> Gemini will scan all of <strong>{selectedStudent}</strong>'s past graded submissions,
            extract the most frequently recurring weak topics, and generate a targeted multi-section worksheet with progressive difficulty and an answer key.
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending || !selectedStudent || !selectedClass}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="animate-spin">⚙️</span>
              Gemini is generating worksheet...
            </>
          ) : (
            <>📋 Generate Personalised Worksheet</>
          )}
        </button>

        {error && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Generated Worksheet */}
      {worksheet && (
        <div className="border-2 border-green-300 dark:border-green-700 rounded-xl overflow-hidden shadow-lg">
          {/* Toolbar */}
          <div className="bg-green-600 dark:bg-green-800 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-white font-bold text-sm">✅ Worksheet Generated!</p>
              <p className="text-green-200 text-xs">Topics addressed: {analyzedTopics.join(' · ')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTeacherKey(!showTeacherKey)}
                className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold text-xs py-1.5 px-3 rounded transition-colors"
              >
                {showTeacherKey ? '🙈 Hide Answer Key' : '🔑 Show Answer Key'}
              </button>
              <button
                onClick={handlePrint}
                className="bg-white hover:bg-gray-100 text-green-800 font-bold text-xs py-1.5 px-4 rounded transition-colors"
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>

          {/* Worksheet Content */}
          <div className="bg-white dark:bg-gray-900 p-6">
            <div ref={printRef}>
              {/* Header */}
              <div className="text-center border-b-2 border-gray-800 dark:border-gray-300 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">{worksheet.title}</h1>
                <div className="flex justify-center gap-6 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 Date: _______________</span>
                  <span>⏱️ Time: {worksheet.estimatedTime}</span>
                  <span>📊 Total Marks: {worksheet.totalMarks}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 italic text-sm text-gray-700 dark:text-gray-300">
                📌 <strong>Instructions:</strong> {worksheet.instructions}
              </div>

              {/* Target Topics Banner */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase self-center">Focus Areas:</span>
                {worksheet.targetTopics.map((t, i) => (
                  <span key={i} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    ⚡ {t}
                  </span>
                ))}
              </div>

              {/* Sections */}
              {worksheet.sections.map((section, si) => (
                <div key={si} className="mb-8">
                  <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-indigo-500 px-4 py-2 rounded-r-lg mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">{section.sectionTitle}</h2>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Target Topic: {section.topic}</p>
                  </div>

                  <div className="space-y-5 pl-2">
                    {section.questions.map((q, qi) => (
                      <div key={qi} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                            <span className="inline-block bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 text-center leading-5 mr-2">
                              {q.number}
                            </span>
                            {q.question}
                          </p>
                          <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            [{q.marks} mark{q.marks > 1 ? 's' : ''}]
                          </span>
                        </div>

                        {/* Hint */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-2">
                          💡 Hint: {q.hint}
                        </p>

                        {/* Answer lines */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded min-h-[60px] bg-gray-50 dark:bg-gray-800/50 p-2">
                          <div className="space-y-2">
                            {[...Array(Math.max(2, q.marks))].map((_, li) => (
                              <div key={li} className="border-b border-gray-300 dark:border-gray-600 h-6" />
                            ))}
                          </div>
                        </div>

                        {/* Teacher's Answer Key (toggleable) */}
                        {showTeacherKey && (
                          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-800 dark:text-yellow-300">
                            <span className="font-bold">🔑 Answer Key: </span>{q.answerKey}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Teacher Note */}
              {showTeacherKey && (
                <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                  <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-1 text-sm">📝 Teacher's Note</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{worksheet.teacherNote}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
                Generated by OmniLearn AutoWorksheet Engine • Personalised for {worksheet.studentName} • github.com/rupeshca007/auto-grad
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
