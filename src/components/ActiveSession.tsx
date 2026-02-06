import { useState, useEffect } from 'react';
import { Play, Pause, Square, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateCognitiveLoad, getRecommendationColor } from '../lib/cognitiveLoad';

interface ActiveSessionProps {
  onSessionEnd: () => void;
}

export default function ActiveSession({ onSessionEnd }: ActiveSessionProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [taskSwitches, setTaskSwitches] = useState(0);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [recommendation, setRecommendation] = useState('');
  const [cognitiveLevel, setCognitiveLevel] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newSeconds = prev + 1;

          if (newSeconds % 60 === 0) {
            const minutes = Math.floor(newSeconds / 60);
            const loadResult = calculateCognitiveLoad({
              durationMinutes: minutes,
              pauseCount,
              taskSwitches,
            });
            setRecommendation(loadResult.recommendation);
            setCognitiveLevel(loadResult.level);
          }

          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, pauseCount, taskSwitches]);

  const startSession = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }

    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    setElapsedSeconds(0);
    setPauseCount(0);
    setTaskSwitches(0);
    setTotalPausedTime(0);

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user!.id,
        subject: subject.trim(),
        start_time: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session');
      setIsActive(false);
    } else {
      setSessionId(data.id);
    }
  };

  const togglePause = async () => {
    if (!sessionId) return;

    const now = new Date();

    if (isPaused) {
      if (pauseStartTime) {
        const pauseDuration = now.getTime() - pauseStartTime.getTime();
        setTotalPausedTime((prev) => prev + pauseDuration);
      }

      await supabase.from('session_events').insert({
        session_id: sessionId,
        event_type: 'pause_end',
        timestamp: now.toISOString(),
      });

      setIsPaused(false);
      setPauseStartTime(null);
    } else {
      setPauseStartTime(now);
      setPauseCount((prev) => prev + 1);

      await supabase.from('session_events').insert({
        session_id: sessionId,
        event_type: 'pause_start',
        timestamp: now.toISOString(),
      });

      setIsPaused(true);
    }
  };

  const changeSubject = async (newSubject: string) => {
    if (!sessionId || !newSubject.trim()) return;

    setTaskSwitches((prev) => prev + 1);

    await supabase.from('session_events').insert({
      session_id: sessionId,
      event_type: 'task_switch',
      metadata: { from: subject, to: newSubject.trim() },
      timestamp: new Date().toISOString(),
    });

    setSubject(newSubject.trim());
  };

  const endSession = async () => {
    if (!sessionId || !startTime) return;

    const now = new Date();
    const actualStudyTime = elapsedSeconds - Math.floor(totalPausedTime / 1000);
    const durationMinutes = Math.floor(actualStudyTime / 60);

    const loadResult = calculateCognitiveLoad({
      durationMinutes,
      pauseCount,
      taskSwitches,
    });

    await supabase
      .from('study_sessions')
      .update({
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        pause_count: pauseCount,
        task_switches: taskSwitches,
        cognitive_load_score: loadResult.score,
      })
      .eq('id', sessionId);

    setIsActive(false);
    setSessionId(null);
    setSubject('');
    setElapsedSeconds(0);
    setPauseCount(0);
    setTaskSwitches(0);
    setRecommendation('');
    onSessionEnd();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Study Session</h2>

      {!isActive ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              What are you studying?
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, Physics, Programming"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={startSession}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Session
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-5xl font-bold text-gray-800 mb-2">
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-gray-600">
              Studying: <span className="font-semibold text-blue-600">{subject}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{pauseCount}</div>
              <div className="text-xs text-gray-600">Pauses</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{taskSwitches}</div>
              <div className="text-xs text-gray-600">Switches</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600">
                {Math.floor(elapsedSeconds / 60)}m
              </div>
              <div className="text-xs text-gray-600">Duration</div>
            </div>
          </div>

          {recommendation && (
            <div className={`border-l-4 p-4 rounded-lg ${getRecommendationColor(cognitiveLevel)}`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm mb-1">AI Recommendation</div>
                  <div className="text-sm">{recommendation}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="changeSubject" className="block text-sm font-medium text-gray-700 mb-1">
                Switch subject
              </label>
              <input
                id="changeSubject"
                type="text"
                placeholder="Enter new subject and press Enter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    changeSubject(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={togglePause}
                className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  isPaused
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                )}
              </button>

              <button
                onClick={endSession}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
