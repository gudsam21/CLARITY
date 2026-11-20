import type { CalendarEvent, ClarityAppState, EnergyStressLog, TaskItem } from '../types/clarity';
import { timeToMinutes } from './scheduling';

export interface WorkloadAssessment {
  scheduledMinutes: number;
  scheduledHoursLabel: string;
  openTasksCount: number;
  criticalTasksCount: number;
  averageEnergy: number;
  averageStress: number;
  overloaded: boolean;
  statusLabel: 'Balanced' | 'Elevated Load' | 'Recovery Recommended';
  recommendation: string;
}

export function analyzeWorkloadAndEnergy(
  events: CalendarEvent[],
  tasks: TaskItem[],
  energyLogs: EnergyStressLog[],
  targetDate: string
): WorkloadAssessment {
  const dayEvents = events.filter((e) => e.date === targetDate && e.category !== 'break');
  const scheduledMinutes = dayEvents.reduce((acc, ev) => {
    const dur = Math.max(0, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime));
    return acc + dur;
  }, 0);

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const criticalTasksCount = openTasks.filter((t) => t.priority === 'critical' || t.priority === 'high').length;

  const recentLogs = energyLogs.slice(0, 5);
  const averageEnergy =
    recentLogs.length > 0
      ? Number((recentLogs.reduce((s, l) => s + l.energyLevel, 0) / recentLogs.length).toFixed(1))
      : 7.0;
  const averageStress =
    recentLogs.length > 0
      ? Number((recentLogs.reduce((s, l) => s + l.stressLevel, 0) / recentLogs.length).toFixed(1))
      : 4.0;

  const overloaded = scheduledMinutes > 420 || (averageStress >= 7 && openTasks.length >= 5) || criticalTasksCount >= 5;

  let statusLabel: WorkloadAssessment['statusLabel'] = 'Balanced';
  let recommendation = 'Your commitments and recovery buffers are well calibrated for steady focus.';

  if (overloaded && averageStress >= 6.5) {
    statusLabel = 'Recovery Recommended';
    recommendation =
      'Scheduled density and recent stress signals are elevated. Consider moving one low-urgency block and adding a 20-minute non-screen recovery pause.';
  } else if (overloaded || scheduledMinutes > 360) {
    statusLabel = 'Elevated Load';
    recommendation =
      'Your calendar carries substantial commitment density today. Protect transition buffers between focus sessions.';
  }

  const hours = Math.floor(scheduledMinutes / 60);
  const mins = scheduledMinutes % 60;
  const scheduledHoursLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return {
    scheduledMinutes,
    scheduledHoursLabel,
    openTasksCount: openTasks.length,
    criticalTasksCount,
    averageEnergy,
    averageStress,
    overloaded,
    statusLabel,
    recommendation,
  };
}

export interface IntelligenceNode {
  id: string;
  label: string;
  kind: 'core' | 'goal' | 'project' | 'decision' | 'energy' | 'schedule';
  x: number;
  y: number;
  metric: string;
  detail: string;
}

export interface IntelligenceEdge {
  from: string;
  to: string;
  weight: number;
}

function truncateLabel(text: string, maxLen = 22): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

export function buildIntelligenceMapData(state: ClarityAppState): {
  nodes: IntelligenceNode[];
  edges: IntelligenceEdge[];
} {
  const nodes: IntelligenceNode[] = [
    {
      id: 'core',
      label: 'CLARITY CORE',
      kind: 'core',
      x: 360,
      y: 185,
      metric: `${state.tasks.filter((t) => t.status !== 'done').length} Active`,
      detail: 'Central coordination across goals, schedule, decisions, and energy.',
    },
  ];

  const edges: IntelligenceEdge[] = [];

  const topGoal = state.goals[0];
  if (topGoal) {
    nodes.push({
      id: 'goal_1',
      label: truncateLabel(topGoal.title, 22),
      kind: 'goal',
      x: 118,
      y: 78,
      metric: `${topGoal.progress}%`,
      detail: `${topGoal.domain} · Target ${topGoal.targetDate}`,
    });
    edges.push({ from: 'core', to: 'goal_1', weight: 0.9 });
  }

  const secondGoal = state.goals[1];
  if (secondGoal) {
    nodes.push({
      id: 'goal_2',
      label: truncateLabel(secondGoal.title, 22),
      kind: 'goal',
      x: 118,
      y: 288,
      metric: `${secondGoal.progress}%`,
      detail: `${secondGoal.domain} · Target ${secondGoal.targetDate}`,
    });
    edges.push({ from: 'core', to: 'goal_2', weight: 0.75 });
  }

  const activeProject = state.projects[0];
  if (activeProject) {
    nodes.push({
      id: 'project_1',
      label: truncateLabel(activeProject.title, 22),
      kind: 'project',
      x: 360,
      y: 50,
      metric: `${activeProject.progress}%`,
      detail: `${activeProject.status} · Due ${activeProject.targetDate}`,
    });
    edges.push({ from: 'core', to: 'project_1', weight: 0.85 });
    if (topGoal) edges.push({ from: 'goal_1', to: 'project_1', weight: 0.65 });
  }

  const latestDecision = state.decisions[0];
  if (latestDecision) {
    nodes.push({
      id: 'decision_1',
      label: truncateLabel(latestDecision.title, 22),
      kind: 'decision',
      x: 602,
      y: 82,
      metric: `${latestDecision.options.length} Options`,
      detail: latestDecision.selectedOptionId ? 'Option selected' : 'Awaiting your decision',
    });
    edges.push({ from: 'core', to: 'decision_1', weight: 0.8 });
  }

  const latestEnergy = state.energyLogs[0];
  nodes.push({
    id: 'energy_1',
    label: 'Energy & Stress',
    kind: 'energy',
    x: 602,
    y: 286,
    metric: latestEnergy ? `${latestEnergy.energyLevel}/10 · ${latestEnergy.stressLevel}/10` : '7/10 · 4/10',
    detail: 'Guides session duration and break pacing.',
  });
  edges.push({ from: 'core', to: 'energy_1', weight: 0.9 });

  nodes.push({
    id: 'schedule_1',
    label: 'Life OS Schedule',
    kind: 'schedule',
    x: 360,
    y: 320,
    metric: `${state.events.length} Blocks`,
    detail: 'Time-blocked focus, study, personal & recovery periods.',
  });
  edges.push({ from: 'core', to: 'schedule_1', weight: 0.95 });
  edges.push({ from: 'energy_1', to: 'schedule_1', weight: 0.7 });

  return { nodes, edges };
}
