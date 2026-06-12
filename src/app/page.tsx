import { Dashboard } from './components/Dashboard';
import { GradingForm } from './components/GradingForm';
import { GuideManager } from './components/GuideManager';
import { WorksheetGenerator } from './components/WorksheetGenerator';
import { getRubricsAction } from './actions/rubric';
import { getAnalyticsData } from './actions/analytics';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { getGuidesAction } from './actions/evaluationGuide';

export const dynamic = 'force-dynamic';

export default async function GraderDashboard({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const params = await searchParams;
  const selectedClass = params.class || '';

  const [rubrics, analytics, guides] = await Promise.all([
    getRubricsAction(),
    getAnalyticsData(selectedClass || undefined),
    getGuidesAction(),
  ]);

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Dumroo.ai | OmniLearn</h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mt-2">Cognitive Auto-Grader & Analytics Ecosystem</p>
        </div>
      </div>

      {/* Class Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-1">View Class:</span>
        <a
          href="/"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            !selectedClass
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
          }`}
        >
          All Classes
        </a>
        {analytics.allClasses.map((cls: string) => (
          <a
            key={cls}
            href={`/?class=${encodeURIComponent(cls)}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              selectedClass === cls
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
            }`}
          >
            Class {cls}
          </a>
        ))}
        {analytics.allClasses.length === 0 && (
          <span className="text-xs text-gray-400 italic">No classes yet — grade an assignment to create one</span>
        )}
      </div>

      {selectedClass && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-2 text-sm text-indigo-700 dark:text-indigo-300 font-medium">
          📚 Showing data for <strong>Class {selectedClass}</strong> only —{' '}
          <a href="/" className="underline hover:no-underline">View all classes</a>
        </div>
      )}

      {/* Class Analytics Dashboard */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📊 {selectedClass ? `Class ${selectedClass} Analytics` : 'Class Analytics'}
        </h2>
        <AnalyticsDashboard
          students={analytics.students}
          weakTopicsRanked={analytics.weakTopicsRanked}
          classAverage={analytics.classAverage}
          atRiskCount={analytics.atRiskCount}
          totalStudents={analytics.totalStudents}
        />
      </section>

      {/* Legacy Table Dashboard */}
      <Dashboard selectedClass={selectedClass || undefined} />

      {/* RAG Knowledge Base */}
      <section>
        <GuideManager initialGuides={guides} />
      </section>

      {/* Phase 9: AutoWorksheet Engine */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Phase 9: AutoWorksheet Engine</h2>
          <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">NEW</span>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Select a student to automatically generate a personalised, print-ready remediation worksheet targeting their diagnosed weak topics.
        </p>
        <WorksheetGenerator
          students={analytics.students.map((s: any) => ({
            name: s.name,
            className: s.className || selectedClass || 'General',
            averageScore: s.averageScore,
          }))}
        />
      </section>

      {/* Grading Form */}
      <GradingForm
        initialRubrics={rubrics}
        initialGuides={guides}
        allClasses={analytics.allClasses}
      />
    </main>
  );
}