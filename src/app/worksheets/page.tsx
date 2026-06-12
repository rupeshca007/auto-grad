import { getAnalyticsData } from '../actions/analytics';
import { WorksheetGenerator } from '../components/WorksheetGenerator';

export const dynamic = 'force-dynamic';

export default async function WorksheetsPage() {
  const analytics = await getAnalyticsData();

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans w-full">
      <div className="flex flex-col mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">📋 AutoWorksheet Engine</h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mt-2">
          Select a student to automatically generate a personalised, print-ready remediation worksheet targeting their diagnosed weak topics.
        </p>
      </div>

      <section>
        <WorksheetGenerator
          students={analytics.students.map((s: any) => ({
            name: s.name,
            className: s.className,
            averageScore: s.averageScore,
          }))}
        />
      </section>
    </main>
  );
}
