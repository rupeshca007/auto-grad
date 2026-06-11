import { connectToDatabase } from '../lib/mongodb';
import { Student } from '../models/Student';

export async function Dashboard({ selectedClass }: { selectedClass?: string }) {
  await connectToDatabase();
  
  const filter = selectedClass ? { className: selectedClass } : {};
  const students = await Student.find(filter).sort({ averageScore: -1 }).lean();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-12">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Real-Time Classroom Analytics</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pre-computed averages using MongoDB Computed Pattern</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Student Name</th>
              <th scope="col" className="px-6 py-3">Class</th>
              <th scope="col" className="px-6 py-3">Total Submissions</th>
              <th scope="col" className="px-6 py-3">Running Average</th>
              <th scope="col" className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No student data available yet. Grade an assignment below to populate.
                </td>
              </tr>
            ) : (
              students.map((student: any) => (
                <tr key={student._id.toString()} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {student.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Class {(student as any).className || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {student.submissionCount}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    <span className={student.averageScore < 70 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      {student.averageScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {student.averageScore < 70 ? (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Needs Intervention</span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">On Track</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
