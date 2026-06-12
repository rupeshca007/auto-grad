import { getGuidesAction } from '../actions/evaluationGuide';
import { GuideManager } from '../components/GuideManager';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const guides = await getGuidesAction();

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans w-full">
      <div className="flex flex-col mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">🧠 Knowledge Base</h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mt-2">
          Manage your Answer Keys, Marking Schemes, and Rubrics. OmniLearn will use these to grade papers accurately.
        </p>
      </div>

      <section>
        <GuideManager initialGuides={guides} />
      </section>
    </main>
  );
}
