'use server'

import { connectToDatabase } from '../lib/mongodb';
import { Student } from '../models/Student';
import { Submission } from '../models/Submission';

export async function getAnalyticsData(filterClass?: string) {
  await connectToDatabase();

  // 1. Get all unique class names for the tab bar
  const allClassDocs = await Student.distinct('className');
  const allClasses: string[] = allClassDocs.sort();

  // 2. Build DB filter
  const filter = filterClass ? { className: filterClass } : {};

  // 3. Fetch students sorted by averageScore descending (leaderboard)
  const students = await Student.find(filter).sort({ averageScore: -1 }).lean();

  // 4. Aggregate weak topics across filtered submissions
  const subFilter = filterClass ? { className: filterClass, weakTopics: { $exists: true, $ne: [] } } : { weakTopics: { $exists: true, $ne: [] } };
  const allSubmissions = await Submission.find(subFilter).lean();

  const topicCounts: Record<string, number> = {};
  const topicStudents: Record<string, Set<string>> = {};

  for (const sub of allSubmissions) {
    const topics = (sub as any).weakTopics || [];
    for (const topic of topics) {
      const key = topic.trim();
      if (!key) continue;
      topicCounts[key] = (topicCounts[key] || 0) + 1;
      if (!topicStudents[key]) topicStudents[key] = new Set();
      topicStudents[key].add((sub as any).studentName);
    }
  }

  const weakTopicsRanked = Object.entries(topicStudents)
    .map(([topic, studentSet]) => ({
      topic,
      count: studentSet.size,
      totalOccurrences: topicCounts[topic]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 5. Class-wide stats
  const classAverage = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length * 10) / 10
    : 0;

  const atRiskCount = students.filter(s => s.averageScore < 70).length;

  return {
    allClasses,
    students: students.map((s: any) => ({
      name: s.name,
      className: s.className,
      averageScore: s.averageScore,
      submissionCount: s.submissionCount,
    })),
    weakTopicsRanked,
    classAverage,
    atRiskCount,
    totalStudents: students.length,
  };
}
