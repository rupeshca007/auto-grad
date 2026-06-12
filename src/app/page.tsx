import { GradingForm } from './components/GradingForm';
import { getRubricsAction } from './actions/rubric';
import { getAnalyticsData } from './actions/analytics';
import { getGuidesAction } from './actions/evaluationGuide';

export const dynamic = 'force-dynamic';

export default async function GraderDashboard() {
  const [rubrics, analytics, guides] = await Promise.all([
    getRubricsAction(),
    getAnalyticsData(),
    getGuidesAction(),
  ]);

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans w-full">
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Workspace</h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mt-2">Grade new submissions with OmniLearn's Cognitive Engine.</p>
      </div>

      {/* Grading Form */}
      <section>
        <GradingForm
          initialRubrics={rubrics}
          initialGuides={guides}
          allClasses={analytics.allClasses}
        />
      </section>
    </main>
  );
}