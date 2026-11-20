import type { ClarityAppState, Priority } from '../types/clarity';

export interface LevelDefinition {
  level: number;
  title: string;
  minXp: number;
  nextXp: number | null;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Explorer', minXp: 0, nextXp: 250 },
  { level: 2, title: 'Organizer', minXp: 250, nextXp: 600 },
  { level: 3, title: 'Strategist', minXp: 600, nextXp: 1100 },
  { level: 4, title: 'Analyst', minXp: 1100, nextXp: 1800 },
  { level: 5, title: 'Architect', minXp: 1800, nextXp: 2700 },
  { level: 6, title: 'Master Planner', minXp: 2700, nextXp: null },
];

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  criteriaLabel: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'first_clarity',
    title: 'Clear Horizon',
    description: 'Completed your first prioritized task inside CLARITY.',
    criteriaLabel: '1+ completed task',
  },
  {
    id: 'decision_architect',
    title: 'Structured Thinker',
    description: 'Evaluated a multi-option decision with facts, risks, and consequences.',
    criteriaLabel: '1+ decision analysis',
  },
  {
    id: 'balanced_rhythm',
    title: 'Mindful Pacing',
    description: 'Logged energy and stress check-ins to calibrate your workload.',
    criteriaLabel: '3+ energy check-ins',
  },
  {
    id: 'life_designer',
    title: 'Goal Architect',
    description: 'Established milestones across personal life management goals.',
    criteriaLabel: '2+ active goals',
  },
  {
    id: 'time_weaver',
    title: 'Time Weaver',
    description: 'Planned structured focus or study blocks on the Life OS Calendar.',
    criteriaLabel: '4+ scheduled events',
  },
  {
    id: 'steady_momentum',
    title: 'Steady Momentum',
    description: 'Maintained thoughtful progress across multiple days without burnout.',
    criteriaLabel: '5+ active days',
  },
];

export function getLevelInfo(xp: number): {
  level: number;
  title: string;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  let active = LEVELS[0];
  for (const lvl of LEVELS) {
    if (safeXp >= lvl.minXp) {
      active = lvl;
    }
  }

  if (active.nextXp === null) {
    return {
      level: active.level,
      title: active.title,
      xp: safeXp,
      currentLevelXp: safeXp - active.minXp,
      nextLevelXp: null,
      progressPercent: 100,
    };
  }

  const span = active.nextXp - active.minXp;
  const gained = safeXp - active.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));

  return {
    level: active.level,
    title: active.title,
    xp: safeXp,
    currentLevelXp: gained,
    nextLevelXp: active.nextXp,
    progressPercent,
  };
}

export function calculateTaskXp(priority: Priority, estimatedMinutes = 30): number {
  const baseByPriority: Record<Priority, number> = {
    low: 20,
    medium: 35,
    high: 55,
    critical: 80,
  };
  const durationBonus = Math.min(40, Math.floor(Math.max(0, estimatedMinutes) / 30) * 10);
  return baseByPriority[priority] + durationBonus;
}

export function evaluateConsistency(completedDates: string[]): {
  totalActiveDays: number;
  recentWeekCount: number;
  rhythmLabel: string;
} {
  const uniqueDates = Array.from(new Set(completedDates)).sort();
  const totalActiveDays = uniqueDates.length;
  const recentWeekCount = Math.min(7, uniqueDates.slice(-7).length);

  let rhythmLabel = 'Getting Started';
  if (totalActiveDays >= 10) rhythmLabel = 'Deeply Consistent';
  else if (totalActiveDays >= 5) rhythmLabel = 'Steady Rhythm';
  else if (totalActiveDays >= 2) rhythmLabel = 'Building Momentum';

  return {
    totalActiveDays,
    recentWeekCount,
    rhythmLabel,
  };
}

export function evaluateUnlockedBadges(state: Pick<ClarityAppState, 'tasks' | 'decisions' | 'energyLogs' | 'goals' | 'events' | 'gamification'>): string[] {
  const unlocked = new Set<string>(state.gamification.unlockedBadgeIds);

  if (state.tasks.some((t) => t.status === 'done')) unlocked.add('first_clarity');
  if (state.decisions.length >= 1) unlocked.add('decision_architect');
  if (state.energyLogs.length >= 3) unlocked.add('balanced_rhythm');
  if (state.goals.length >= 2) unlocked.add('life_designer');
  if (state.events.length >= 4) unlocked.add('time_weaver');
  if (new Set(state.gamification.completedDates).size >= 5) unlocked.add('steady_momentum');

  return Array.from(unlocked);
}
