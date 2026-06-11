'use client';

import { useState, useTransition } from 'react';
import { saveGuideAction, deleteGuideAction } from '../actions/evaluationGuide';
import { useRouter } from 'next/navigation';

interface Guide {
  _id: string;
  name: string;
  subject: string;
  content: string;
}

export function GuideManager({ initialGuides }: { initialGuides: Guide[] }) {
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>(initialGuides);
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [guideFile, setGuideFile] = useState<File | null>(null);

  const handleSave = () => {
    if (!name || !subject || (!content && !guideFile)) {
      alert('Please fill in Name, Subject, and either paste the answer key text or upload a file.');
      return;
    }

    startSaving(async () => {
      try {
        let finalContent = content;

        // If a file was uploaded, read it as text or note it
        if (guideFile) {
          if (guideFile.type === 'text/plain') {
            finalContent = await guideFile.text();
          } else {
            // For PDF/images we note the filename; actual reading happens in grade.ts via Gemini
            finalContent = content
              ? `[Attached File: ${guideFile.name}]\n\n${content}`
              : `[Attached File: ${guideFile.name}]`;
          }
        }

        await saveGuideAction(name, subject, finalContent);
        const newGuide: Guide = { _id: Date.now().toString(), name, subject, content: finalContent };
        setGuides([newGuide, ...guides]);
        setName(''); setSubject(''); setContent(''); setGuideFile(null);
        setShowForm(false);
        router.refresh();
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this evaluation guide?')) return;
    startDeleting(async () => {
      await deleteGuideAction(id);
      setGuides(guides.filter(g => g._id !== id));
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-sm overflow-hidden">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">RAG Evaluation Knowledge Base</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload your answer keys so Gemini grades against <strong>your rules</strong>, not its own knowledge
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold px-2.5 py-1 rounded-full">
            {guides.length} guide{guides.length !== 1 ? 's' : ''} saved
          </span>
          <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-purple-100 dark:border-purple-900/30 p-5 space-y-4">

          {/* How it works callout */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-sm text-purple-800 dark:text-purple-300">
            <p className="font-bold mb-1">⚡ How it works</p>
            <p>When you select a guide while grading, Gemini reads <strong>your answer key first</strong> and treats it as the only source of truth. Student answers are judged against <em>your</em> key — not general AI knowledge.</p>
          </div>

          {/* Saved Guides List */}
          {guides.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Saved Guides</h3>
              {guides.map(guide => (
                <div key={guide._id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-xl mt-0.5">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{guide.name}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">{guide.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{guide.content.slice(0, 100)}...</p>
                  </div>
                  <button
                    onClick={() => handleDelete(guide._id)}
                    disabled={isDeleting}
                    className="text-red-400 hover:text-red-600 text-sm font-medium flex-shrink-0"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Guide */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg text-purple-600 dark:text-purple-400 font-semibold text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              + Add New Evaluation Guide / Answer Key
            </button>
          ) : (
            <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3 bg-purple-50/50 dark:bg-purple-900/10">
              <h3 className="font-bold text-gray-900 dark:text-white">New Evaluation Guide</h3>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Guide Name (e.g. Class 7 Science Ch.5)"
                  className="col-span-2 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-sm text-black dark:text-white dark:bg-gray-800"
                />
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject (e.g. Science)"
                  className="border border-gray-300 dark:border-gray-700 p-2.5 rounded text-sm text-black dark:text-white dark:bg-gray-800"
                />
                <div className="border border-gray-300 dark:border-gray-700 p-2 rounded bg-white dark:bg-gray-800">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.txt"
                    onChange={e => setGuideFile(e.target.files?.[0] || null)}
                    className="text-xs text-gray-500 w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">Upload PDF, image, or .txt of answer key</p>
                </div>
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Paste your answer key or marking scheme here...\n\nExample:\nQ1: The water cycle has 4 stages: Evaporation, Condensation, Precipitation, Collection. (2 marks)\nQ2: Photosynthesis requires sunlight, water, and CO2. (3 marks)\n...`}
                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded text-sm text-black dark:text-white dark:bg-gray-800 h-36 font-mono"
              />

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:underline">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : '💾 Save Guide'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
