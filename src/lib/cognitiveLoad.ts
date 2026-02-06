export interface CognitiveLoadFactors {
  durationMinutes: number;
  pauseCount: number;
  taskSwitches: number;
}

export interface CognitiveLoadResult {
  score: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: string;
}

export function calculateCognitiveLoad(factors: CognitiveLoadFactors): CognitiveLoadResult {
  const { durationMinutes, pauseCount, taskSwitches } = factors;

  const DURATION_WEIGHT = 0.45;
  const PAUSE_WEIGHT = 0.30;
  const SWITCH_WEIGHT = 0.25;

  const OPTIMAL_SESSION_DURATION = 45;
  const MAX_SESSION_DURATION = 120;

  const durationScore = Math.min(
    (durationMinutes / OPTIMAL_SESSION_DURATION) * 50,
    100
  );

  const pauseScore = Math.min(pauseCount * 8, 100);

  const switchScore = Math.min(taskSwitches * 15, 100);

  const rawScore =
    durationScore * DURATION_WEIGHT +
    pauseScore * PAUSE_WEIGHT +
    switchScore * SWITCH_WEIGHT;

  let adjustedScore = rawScore;
  if (durationMinutes > MAX_SESSION_DURATION) {
    const excessMinutes = durationMinutes - MAX_SESSION_DURATION;
    adjustedScore += excessMinutes * 0.5;
  }

  const finalScore = Math.min(Math.round(adjustedScore), 100);

  let level: 'low' | 'moderate' | 'high' | 'critical';
  let recommendation: string;

  if (finalScore < 30) {
    level = 'low';
    recommendation = 'You are in an optimal focus state. Keep up the great work!';
  } else if (finalScore < 50) {
    level = 'moderate';
    recommendation = 'Your cognitive load is building up. Consider a short 3-5 minute break soon.';
  } else if (finalScore < 75) {
    level = 'high';
    recommendation = 'High mental load detected. Take a 7-10 minute break to refresh.';
  } else {
    level = 'critical';
    recommendation = 'Critical cognitive fatigue detected! Take a 15-20 minute break or switch to a lighter task.';
  }

  if (taskSwitches > 3) {
    recommendation += ' Try to minimize task switching to maintain deeper focus.';
  }

  if (durationMinutes > MAX_SESSION_DURATION) {
    recommendation = 'Excessive study duration detected. Please take an extended break (20-30 minutes).';
  }

  return {
    score: finalScore,
    level,
    recommendation,
  };
}

export function getRecommendationColor(level: string): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'moderate':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 'high':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'critical':
      return 'bg-red-100 border-red-300 text-red-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
}

export function getScoreColor(score: number): string {
  if (score < 30) return 'text-green-600';
  if (score < 50) return 'text-yellow-600';
  if (score < 75) return 'text-orange-600';
  return 'text-red-600';
}
