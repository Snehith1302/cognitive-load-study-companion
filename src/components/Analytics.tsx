import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Brain, Clock, Zap } from 'lucide-react';
import { getScoreColor } from '../lib/cognitiveLoad';

interface SessionData {
  id: string;
  subject: string;
  start_time: string;
  duration_minutes: number;
  cognitive_load_score: number;
  pause_count: number;
  task_switches: number;
}

interface DayStats {
  day: string;
  totalMinutes: number;
  avgCognitiveLoad: number;
  sessionCount: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [avgCognitiveLoad, setAvgCognitiveLoad] = useState(0);
  const [topSubject, setTopSubject] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
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
      console.error('Error loading analytics:', error);
      setLoading(false);
      return;
    }

    setSessions(data || []);

    const total = data?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
    setTotalStudyTime(total);

    const avgLoad = data?.length
      ? data.reduce((sum, s) => sum + s.cognitive_load_score, 0) / data.length
      : 0;
    setAvgCognitiveLoad(Math.round(avgLoad));

    const subjectMap = new Map<string, number>();
    data?.forEach((s) => {
      subjectMap.set(s.subject, (subjectMap.get(s.subject) || 0) + s.duration_minutes);
    });
    const topSubj = Array.from(subjectMap.entries()).sort((a, b) => b[1] - a[1])[0];
    setTopSubject(topSubj ? topSubj[0] : 'N/A');

    const dayMap = new Map<string, { minutes: number; loads: number[]; count: number }>();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      dayMap.set(dayKey, { minutes: 0, loads: [], count: 0 });
    }

    data?.forEach((session) => {
      const dayKey = session.start_time.split('T')[0];
      const stats = dayMap.get(dayKey);
      if (stats) {
        stats.minutes += session.duration_minutes;
        stats.loads.push(session.cognitive_load_score);
        stats.count += 1;
      }
    });

    const weeklyData: DayStats[] = [];
    dayMap.forEach((stats, day) => {
      weeklyData.push({
        day,
        totalMinutes: stats.minutes,
        avgCognitiveLoad: stats.loads.length
          ? Math.round(stats.loads.reduce((a, b) => a + b, 0) / stats.loads.length)
          : 0,
        sessionCount: stats.count,
      });
    });

    weeklyData.sort((a, b) => a.day.localeCompare(b.day));
    setWeeklyStats(weeklyData);

    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const maxMinutes = Math.max(...weeklyStats.map((d) => d.totalMinutes), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Total Study Time</div>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
          </div>
          <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Brain className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">Avg Cognitive Load</div>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(avgCognitiveLoad)}`}>
            {avgCognitiveLoad}
          </div>
          <div className="text-xs text-gray-500 mt-1">Out of 100</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm text-gray-600">Top Subject</div>
          </div>
          <div className="text-2xl font-bold text-gray-800 truncate">{topSubject}</div>
          <div className="text-xs text-gray-500 mt-1">Most studied</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-gray-700" />
          <h3 className="text-xl font-bold text-gray-800">Weekly Focus Trends</h3>
        </div>

        <div className="space-y-3">
          {weeklyStats.map((day) => (
            <div key={day.day} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-gray-600">
                {formatDayName(day.day)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${(day.totalMinutes / maxMinutes) * 100}%` }}
                    >
                      {day.totalMinutes > 0 && (
                        <span className="text-xs font-medium text-white">
                          {day.totalMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  {day.avgCognitiveLoad > 0 && (
                    <div className={`text-sm font-semibold ${getScoreColor(day.avgCognitiveLoad)}`}>
                      CL: {day.avgCognitiveLoad}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Focus Heatmap</h3>
        <div className="grid grid-cols-7 gap-2">
          {weeklyStats.map((day) => (
            <div key={day.day} className="text-center">
              <div className="text-xs text-gray-600 mb-1">{formatDayName(day.day)}</div>
              <div
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                  day.sessionCount === 0
                    ? 'bg-gray-100 text-gray-400'
                    : day.sessionCount === 1
                    ? 'bg-blue-200 text-blue-800'
                    : day.sessionCount === 2
                    ? 'bg-blue-400 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {day.sessionCount || '-'}
              </div>
              <div className="text-xs text-gray-500 mt-1">{day.totalMinutes}m</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <span>1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span>2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>3+</span>
          </div>
          <span>sessions</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No sessions yet</div>
          ) : (
            sessions.slice(0, 10).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{session.subject}</div>
                  <div className="text-sm text-gray-600">
                    {formatDate(session.start_time)} • {session.duration_minutes} min • {session.pause_count} pauses • {session.task_switches} switches
                  </div>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(session.cognitive_load_score)}`}>
                  {Math.round(session.cognitive_load_score)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
