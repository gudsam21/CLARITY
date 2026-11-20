import { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  RefreshCw,
  Send,
  Sparkles,
  Bell,
  Activity,
} from 'lucide-react';
import type { ClarityAppState, NavSection } from '../types/clarity';
import { analyzeWorkloadAndEnergy } from '../utils/intelligence';
import { getLevelInfo } from '../utils/progression';
import { UI_COPY } from '../utils/i18n';
import { ClarityCore3D } from './ClarityCore3D';

interface CommandCenterViewProps {
  state: ClarityAppState;
  aiConfigured: boolean;
  onNavigate: (section: NavSection) => void;
  onQuickCommand: (prompt: string) => Promise<void>;
  onToggleTask: (taskId: string) => void;
  onLogQuickEnergy: (energy: number, stress: number) => void;
  onRefreshBriefing: () => Promise<void>;
}

const AGENT_OVERVIEW = [
  { id: 'decision', name: 'Decision Intelligence', role: 'Options, risks & clarity' },
  { id: 'productivity', name: 'Productivity', role: 'Priorities & task breakdown' },
  { id: 'calendar', name: 'Calendar & Scheduling', role: 'Time-blocking & conflicts' },
  { id: 'stress', name: 'Stress & Energy', role: 'Pacing & recovery' },
  { id: 'learning', name: 'Learning', role: 'Study plans & recall' },
  { id: 'relationship', name: 'Communication', role: 'Boundaries & phrasing' },
  { id: 'digital', name: 'Digital Environment', role: 'Distraction & habit audit' },
];

export function CommandCenterView({
  state,
  aiConfigured,
  onNavigate,
  onQuickCommand,
  onToggleTask,
  onLogQuickEnergy,
  onRefreshBriefing,
}: CommandCenterViewProps) {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [coreMode, setCoreMode] = useState<'balanced' | 'focus' | 'decision' | 'recovery'>('balanced');
  const [energyInput, setEnergyInput] = useState(state.energyLogs[0]?.energyLevel ?? 7);
  const [stressInput, setStressInput] = useState(state.energyLogs[0]?.stressLevel ?? 4);
  const [energySavedMsg, setEnergySavedMsg] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const copy = UI_COPY[state.settings.language];
  const workload = analyzeWorkloadAndEnergy(state.events, state.tasks, state.energyLogs, today);
  const levelInfo = getLevelInfo(state.gamification.xp);

  const todaysEvents = state.events
    .filter((e) => e.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const priorityTasks = state.tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 5);

  const completedTasksCount = state.tasks.filter((t) => t.status === 'done').length;
  const totalTasksCount = state.tasks.length;
  const completionPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const unreadReminders = state.notifications.filter((n) => !n.read).slice(0, 3);
  const isBeginner = state.settings.interfaceMode === 'beginner';

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onQuickCommand(quickPrompt.trim());
      setQuickPrompt('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBriefingRefresh = async () => {
    setRefreshingBriefing(true);
    try {
      await onRefreshBriefing();
    } finally {
      setRefreshingBriefing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick-Access Command Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {copy.welcomePrefix}, {state.profile.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {today} · {state.profile.role} · {workload.statusLabel}
            </p>
          </div>

          {state.settings.gamificationEnabled && (
            <button
              type="button"
              onClick={() => onNavigate('insights')}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-left hover:border-blue-500/40 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Level {levelInfo.level} · {levelInfo.title}
                </div>
                <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  {levelInfo.xp} XP
                </div>
              </div>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </button>
          )}
        </div>

        <form onSubmit={handleQuickSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="quick-command-input" className="sr-only">
            Command CLARITY CORE
          </label>
          <input
            id="quick-command-input"
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder={copy.quickCommandPlaceholder}
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={submitting || !quickPrompt.trim()}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Routing...' : copy.executeCommand}
          </button>
        </form>
      </section>

      {/* Primary Asymmetric Grid: 3D CLARITY CORE + Daily Briefing */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ClarityCore3D
            theme={state.settings.theme}
            activeAgentsCount={7}
            workloadStatus={workload.statusLabel}
            focusMode={coreMode}
            onSelectMode={setCoreMode}
          />
        </div>

        <section className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {copy.dailyBriefingTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleBriefingRefresh}
                disabled={refreshingBriefing || !aiConfigured}
                title={aiConfigured ? 'Refresh briefing with CLARITY CORE' : 'Requires GEMINI_API_KEY'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingBriefing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
                {state.dailyBriefing.headline}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {state.dailyBriefing.summary}
              </p>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-3.5">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Recommended Next Focus
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {state.dailyBriefing.focusRecommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Productivity & Energy Snapshot */}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Task Progress</div>
              <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                {completionPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Today Load</div>
              <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                {workload.scheduledHoursLabel}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Energy Avg</div>
              <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                {workload.averageEnergy}/10
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mid Grid: Today's Schedule, Priority Tasks, Energy Check-in */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Today's Schedule */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {copy.todaysSchedule}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Open Calendar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {todaysEvents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No commitments scheduled today.</p>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Plan With Smart Scheduler
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {todaysEvents.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {ev.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{ev.category}</span> · <span className="capitalize">{ev.priority}</span>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {ev.startTime}–{ev.endTime}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Priority Tasks */}
        <section className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {copy.priorityTasks}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              All Tasks
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {priorityTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              All prioritized tasks are complete.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {priorityTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`Mark "${task.title}" complete`}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {task.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{task.priority}</span> · Due {task.dueDate} ·{' '}
                      <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Energy, Stress & Reminders */}
        <section className="lg:col-span-3 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <Activity className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {copy.energyWorkload}
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="dash-energy" className="text-slate-600 dark:text-slate-300">Energy Level</label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">{energyInput}/10</span>
                </div>
                <input
                  id="dash-energy"
                  type="range"
                  min={1}
                  max={10}
                  value={energyInput}
                  onChange={(e) => setEnergyInput(Number(e.target.value))}
                  className="mt-1 w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="dash-stress" className="text-slate-600 dark:text-slate-300">Stress Level</label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">{stressInput}/10</span>
                </div>
                <input
                  id="dash-stress"
                  type="range"
                  min={1}
                  max={10}
                  value={stressInput}
                  onChange={(e) => setStressInput(Number(e.target.value))}
                  className="mt-1 w-full accent-violet-600"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onLogQuickEnergy(energyInput, stressInput);
                  setEnergySavedMsg('Check-in saved');
                  setTimeout(() => setEnergySavedMsg(''), 2500);
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-100 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-200 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-colors"
              >
                {energySavedMsg || 'Log Check-In'}
              </button>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {workload.recommendation}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Bell className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Reminders ({unreadReminders.length})
            </div>
            {unreadReminders.length > 0 ? (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {unreadReminders[0].title}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No unread alerts.</p>
            )}
          </div>
        </section>
      </div>

      {/* Specialized Agents Strip (hidden in Beginner mode unless navigated) */}
      {!isBeginner && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {copy.activeAgents}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('agents')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Open Agent Consoles
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {AGENT_OVERVIEW.map((ag) => (
              <button
                key={ag.id}
                type="button"
                onClick={() => onNavigate('agents')}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-500/40 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{ag.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ag.role}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
