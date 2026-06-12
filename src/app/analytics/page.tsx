import { getAnalyticsData } from '../actions/analytics';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { Dashboard } from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const params = await searchParams;
  const selectedClass = params.class || '';

  const analytics = await getAnalyticsData(selectedClass || undefined);

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans w-full">
      <div className="flex flex-col mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">📊 Class Analytics</h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mt-2">Identify weak topics, view class performance, and plan remediation.</p>
      </div>

      {/* Class Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-1">View Class:</span>
        <a
          href="/analytics"
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
            href={`/analytics?class=${encodeURIComponent(cls)}`}
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
          <a href="/analytics" className="underline hover:no-underline">View all classes</a>
        </div>
      )}

      {/* Class Analytics Dashboard (Graphs + Weak Topics) */}
      <section>
        <AnalyticsDashboard
          students={analytics.students}
          weakTopicsRanked={analytics.weakTopicsRanked}
          classAverage={analytics.classAverage}
          atRiskCount={analytics.atRiskCount}
          totalStudents={analytics.totalStudents}
        />
      </section>

      {/* Real-Time Classroom Analytics (Legacy Table) */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🗂️ Student Roster</h2>
        <Dashboard selectedClass={selectedClass || undefined} />
      </section>
    </main>
  );
}
