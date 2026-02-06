import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Download, FileText } from 'lucide-react';

export default function WeeklyReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!user) return;

    setLoading(true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', sevenDaysAgo.toISOString())
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error loading sessions:', error);
      alert('Failed to generate report');
      setLoading(false);
      return;
    }

    const sessions = data || [];
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const avgCognitiveLoad = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + s.cognitive_load_score, 0) / sessions.length)
      : 0;
    const totalPauses = sessions.reduce((sum, s) => sum + s.pause_count, 0);
    const totalSwitches = sessions.reduce((sum, s) => sum + s.task_switches, 0);

    const subjectMap = new Map<string, { minutes: number; sessions: number }>();
    sessions.forEach((s) => {
      const current = subjectMap.get(s.subject) || { minutes: 0, sessions: 0 };
      current.minutes += s.duration_minutes;
      current.sessions += 1;
      subjectMap.set(s.subject, current);
    });

    const subjectStats = Array.from(subjectMap.entries())
      .map(([subject, stats]) => ({ subject, ...stats }))
      .sort((a, b) => b.minutes - a.minutes);

    const reportContent = `
COGNITIVE LOAD-AWARE STUDY COMPANION
Weekly Productivity Summary
Generated: ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 OVERALL STATISTICS (Last 7 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Study Time: ${totalHours}h ${remainingMinutes}m
Total Sessions: ${totalSessions}
Average Cognitive Load: ${avgCognitiveLoad}/100
Total Breaks Taken: ${totalPauses}
Total Task Switches: ${totalSwitches}

${sessions.length > 0 ? `Average Session Duration: ${Math.round(totalMinutes / sessions.length)} minutes` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 SUBJECT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${subjectStats.length > 0
  ? subjectStats
      .map(
        (s, i) =>
          `${i + 1}. ${s.subject}
   Time: ${Math.floor(s.minutes / 60)}h ${s.minutes % 60}m
   Sessions: ${s.sessions}
   Avg per session: ${Math.round(s.minutes / s.sessions)} min`
      )
      .join('\n\n')
  : 'No study sessions recorded this week.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 COGNITIVE LOAD INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${avgCognitiveLoad < 30
  ? '✓ Excellent! You maintained a healthy cognitive load throughout the week.'
  : avgCognitiveLoad < 50
  ? '⚠ Moderate cognitive load. Consider taking more breaks during study sessions.'
  : avgCognitiveLoad < 75
  ? '⚠ High cognitive load detected. You may be pushing yourself too hard. Increase break frequency.'
  : '⚠⚠ Critical cognitive load levels! Please ensure adequate rest between sessions.'}

Break Frequency: ${sessions.length > 0 ? (totalPauses / sessions.length).toFixed(1) : '0'} breaks per session
${totalPauses / sessions.length < 2
  ? 'Recommendation: Try taking at least 2-3 short breaks per session.'
  : 'Good break habits! Keep maintaining regular breaks.'}

Task Switching: ${sessions.length > 0 ? (totalSwitches / sessions.length).toFixed(1) : '0'} switches per session
${totalSwitches / sessions.length > 2
  ? 'Recommendation: Excessive task switching detected. Try to maintain focus on one subject per session.'
  : 'Great focus! You maintain good concentration on individual subjects.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 RECOMMENDATIONS FOR NEXT WEEK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${generateRecommendations(avgCognitiveLoad, totalPauses / sessions.length, totalSwitches / sessions.length, sessions.length > 0 ? totalMinutes / sessions.length : 0)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 DETAILED SESSION LOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sessions.length > 0
  ? sessions
      .map((s, i) => {
        const date = new Date(s.start_time);
        return `Session ${i + 1} - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
Subject: ${s.subject}
Duration: ${s.duration_minutes} minutes
Cognitive Load: ${Math.round(s.cognitive_load_score)}/100
Breaks: ${s.pause_count} | Switches: ${s.task_switches}`;
      })
      .join('\n\n')
  : 'No sessions recorded.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by Cognitive Load-Aware Study Companion
Keep tracking, keep improving!
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Weekly Report</h3>
          <p className="text-sm text-gray-600">Download your productivity summary</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Report includes:</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• Overall study time and session statistics</li>
          <li>• Subject-wise breakdown</li>
          <li>• Cognitive load analysis</li>
          <li>• Personalized recommendations</li>
          <li>• Detailed session logs</li>
        </ul>
      </div>

      <button
        onClick={generateReport}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        {loading ? 'Generating...' : 'Download Weekly Report'}
      </button>
    </div>
  );
}

function generateRecommendations(
  avgLoad: number,
  avgPauses: number,
  avgSwitches: number,
  avgDuration: number
): string {
  const recommendations: string[] = [];

  if (avgLoad > 60) {
    recommendations.push('1. Reduce session duration or increase break frequency to lower cognitive load');
  }

  if (avgPauses < 2) {
    recommendations.push(`${recommendations.length + 1}. Take at least 2-3 short breaks (5 min) per study session`);
  }

  if (avgSwitches > 2) {
    recommendations.push(`${recommendations.length + 1}. Focus on one subject per session to minimize task switching costs`);
  }

  if (avgDuration > 90) {
    recommendations.push(`${recommendations.length + 1}. Keep sessions under 90 minutes for optimal retention`);
  } else if (avgDuration < 25) {
    recommendations.push(`${recommendations.length + 1}. Try extending sessions to 25-45 minutes for deeper focus`);
  }

  if (avgLoad < 30 && avgPauses >= 2) {
    recommendations.push(`${recommendations.length + 1}. Excellent balance! Maintain your current study patterns`);
  }

  recommendations.push(`${recommendations.length + 1}. Use the Pomodoro technique: 25 min focus + 5 min break`);
  recommendations.push(`${recommendations.length + 1}. Stay hydrated and maintain good posture during sessions`);

  return recommendations.join('\n');
}
