'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { useState } from 'react';

interface Student {
  name: string;
  averageScore: number;
  submissionCount: number;
}

interface WeakTopic {
  topic: string;
  count: number;
  totalOccurrences: number;
}

interface AnalyticsProps {
  students: Student[];
  weakTopicsRanked: WeakTopic[];
  classAverage: number;
  atRiskCount: number;
  totalStudents: number;
}

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

const getUrgencyColor = (count: number, totalStudents: number) => {
  const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
  if (pct >= 60) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-600', label: '🔴 Re-teach Now' };
  if (pct >= 30) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-500', label: '🟠 Review Soon' };
  return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-500', label: '🟡 Monitor' };
};

export function AnalyticsDashboard({ students, weakTopicsRanked, classAverage, atRiskCount, totalStudents }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'topics'>('overview');

  const chartData = students.map(s => ({
    name: s.name.split(' ')[0],
    score: s.averageScore,
    fill: getScoreColor(s.averageScore)
  }));

  const topicsChartData = weakTopicsRanked.slice(0, 6).map(t => ({
    topic: t.topic.length > 18 ? t.topic.slice(0, 18) + '…' : t.topic,
    fullTopic: t.topic,
    students: t.count,
    pct: totalStudents > 0 ? Math.round((t.count / totalStudents) * 100) : 0,
  }));

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'topics', label: '⚠️ Weak Topics' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={totalStudents} icon="🧑‍🎓" color="blue" />
        <StatCard label="Class Average" value={`${classAverage}%`} icon="📈" color={classAverage >= 70 ? 'green' : 'red'} />
        <StatCard label="Need Help" value={atRiskCount} icon="🚨" color={atRiskCount > 0 ? 'red' : 'green'} sub="below 70%" />
        <StatCard label="Weak Topics" value={weakTopicsRanked.length} icon="📚" color="orange" sub="identified" />
      </div>

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Average Score Per Student
              </h3>
              {students.length === 0 ? (
                <EmptyState message="Grade some assignments to see the chart." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' }}
                      formatter={(value) => [`${value}%`, 'Avg Score']}
                    />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="6 3" label={{ value: 'Pass Line (70%)', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
                    {chartData.map((entry, index) => (
                      <Bar key={index} dataKey="score" radius={[6, 6, 0, 0]}>
                        {chartData.map((item, i) => (
                          <Cell key={i} fill={item.fill} />
                        ))}
                      </Bar>
                    ))}
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((item, i) => (
                        <Cell key={i} fill={item.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex gap-4 mt-4 flex-wrap">
                <LegendDot color="#22c55e" label="Excellent (85+)" />
                <LegendDot color="#3b82f6" label="Good (70–84)" />
                <LegendDot color="#f59e0b" label="Average (50–69)" />
                <LegendDot color="#ef4444" label="Needs Help (<50)" />
              </div>
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🏆 Student Rankings</h3>
              {students.length === 0 ? (
                <EmptyState message="No students yet. Grade an assignment to see the leaderboard." />
              ) : (
                <div className="space-y-3">
                  {students.map((student, index) => (
                    <div key={student.name} className={`flex items-center gap-4 p-3 rounded-lg border ${
                      index === 0 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                      index === 1 ? 'border-gray-300 bg-gray-50 dark:bg-gray-800' :
                      index === 2 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                      'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}>
                      <span className="text-2xl w-8 text-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.submissionCount} assignment{student.submissionCount !== 1 ? 's' : ''} graded</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${
                          student.averageScore >= 85 ? 'text-green-600' :
                          student.averageScore >= 70 ? 'text-blue-600' :
                          student.averageScore >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {student.averageScore}%
                        </span>
                      </div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${student.averageScore}%`, backgroundColor: getScoreColor(student.averageScore) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WEAK TOPICS TAB */}
          {activeTab === 'topics' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">⚠️ Class Weak Topics — Re-teach Radar</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Topics where multiple students made conceptual errors. Red = urgent, needs immediate re-teaching.
              </p>
              {weakTopicsRanked.length === 0 ? (
                <EmptyState message="No weak topic data yet. Grade more assignments with image/text uploads so AI can identify conceptual gaps." />
              ) : (
                <div className="space-y-4">
                  {/* Bar Chart for Topics */}
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topicsChartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                      <XAxis type="number" domain={[0, totalStudents || 1]} tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Students', position: 'insideBottom', fill: '#6b7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="topic" tick={{ fontSize: 11, fill: '#6b7280' }} width={120} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' }}
                        formatter={(value, name, props) => [`${value} student(s) (${props.payload.pct}%)`, props.payload.fullTopic]}
                      />
                      <Bar dataKey="students" radius={[0, 6, 6, 0]}>
                        {topicsChartData.map((item, i) => (
                          <Cell key={i} fill={item.pct >= 60 ? '#ef4444' : item.pct >= 30 ? '#f97316' : '#eab308'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed Cards */}
                  <div className="space-y-3 mt-4">
                    {weakTopicsRanked.map((item, i) => {
                      const urgency = getUrgencyColor(item.count, totalStudents);
                      const pct = totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${urgency.bg}`}>
                          <span className={`text-xs font-bold text-white px-2 py-1 rounded-full ${urgency.badge}`}>
                            {urgency.label}
                          </span>
                          <div className="flex-1">
                            <p className={`font-semibold ${urgency.text}`}>{item.topic}</p>
                            <p className="text-xs text-gray-500">{item.count} student{item.count !== 1 ? 's' : ''} struggled ({pct}% of class)</p>
                          </div>
                          <span className={`text-2xl font-black ${urgency.text}`}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: any; icon: string; color: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
