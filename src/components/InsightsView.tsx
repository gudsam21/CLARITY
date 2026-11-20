import { useState } from 'react';
import { Award, BarChart3, Network, Sparkles } from 'lucide-react';
import type { ClarityAppState } from '../types/clarity';
import { buildIntelligenceMapData } from '../utils/intelligence';
import { BADGE_CATALOG, evaluateConsistency, getLevelInfo, LEVELS } from '../utils/progression';
import { timeToMinutes } from '../utils/scheduling';

interface InsightsViewProps {
  state: ClarityAppState;
  onCompleteDailyChallenge: () => void;
  onToggleGamification: (enabled: boolean) => void;
}

export function InsightsView({
  state,
  onCompleteDailyChallenge,
  onToggleGamification,
}: InsightsViewProps) {
  const mapData = buildIntelligenceMapData(state);
  const [selectedNodeId, setSelectedNodeId] = useState('core');
  const selectedNode = mapData.nodes.find((n) => n.id === selectedNodeId) ?? mapData.nodes[0];

  const levelInfo = getLevelInfo(state.gamification.xp);
  const consistency = evaluateConsistency(state.gamification.completedDates);

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Time allocation by category
  const categoryTotals: Record<string, number> = {};
  for (const ev of state.events) {
    const mins = Math.max(0, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime));
    categoryTotals[ev.category] = (categoryTotals[ev.category] ?? 0) + mins;
  }
  const allocationEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxAllocationMins = Math.max(60, ...allocationEntries.map(([, m]) => m));

  const recentEnergy = [...state.energyLogs]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-6);

  return (
    <div className="space-y-6">
      {/* Personal Intelligence Map */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-blue-500" aria-hidden="true" />
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Personal Intelligence Map
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual connections between your goals, projects, schedule, decisions, and energy state.
              </p>
            </div>
          </div>
          {selectedNode && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
              <span className="font-semibold text-slate-900 dark:text-white">{selectedNode.label}:</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">{selectedNode.detail}</span>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox="0 0 720 370"
            className="mx-auto h-[320px] w-full max-w-[820px]"
            role="img"
            aria-label="Personal Intelligence Map connecting CLARITY CORE to goals, projects, schedule, decisions, and energy"
          >
            {mapData.edges.map((edge, idx) => {
              const fromNode = mapData.nodes.find((n) => n.id === edge.from);
              const toNode = mapData.nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={idx}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="currentColor"
                  className="text-blue-500/35 dark:text-blue-400/30"
                  strokeWidth={edge.weight * 2.5}
                />
              );
            })}

            {mapData.nodes.map((node) => {
              const active = node.id === selectedNodeId;
              const isCore = node.kind === 'core';
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label} (${node.metric})`}
                >
                  <rect
                    x={isCore ? -88 : -94}
                    y={-28}
                    width={isCore ? 176 : 188}
                    height={56}
                    rx={12}
                    className={
                      active
                        ? 'fill-blue-600 stroke-blue-400'
                        : 'fill-slate-100 stroke-slate-300 dark:fill-[#141A26] dark:stroke-white/15'
                    }
                    strokeWidth={1.5}
                  />
                  <text
                    textAnchor="middle"
                    y={-5}
                    className={`text-[11px] font-semibold ${
                      active ? 'fill-white' : 'fill-slate-900 dark:fill-slate-100'
                    }`}
                  >
                    {node.label}
                  </text>
                  <text
                    textAnchor="middle"
                    y={14}
                    className={`font-mono text-[10px] ${
                      active ? 'fill-blue-100' : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {node.metric}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Time Allocation & Completion */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Time Allocation & Execution
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
              {doneTasks}/{totalTasks} Tasks ({completionRate}%)
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {allocationEntries.map(([cat, mins]) => {
              const pct = Math.round((mins / maxAllocationMins) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs">
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-200">{cat}</span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {(mins / 60).toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Energy & Stress Trends */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Energy & Stress Rhythm
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Wellbeing is never reduced to a productivity score
            </span>
          </div>

          {recentEnergy.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Log your first energy check-in on the Command Center to view trends.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex justify-around gap-3 items-end h-36 pt-4 px-2">
                {recentEnergy.map((log) => (
                  <div key={log.id} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
                    <div className="flex w-full items-end justify-center gap-1 h-24">
                      <div
                        className="w-3 rounded-t bg-emerald-500"
                        style={{ height: `${log.energyLevel * 10}%` }}
                        title={`Energy ${log.energyLevel}/10`}
                      />
                      <div
                        className="w-3 rounded-t bg-violet-500"
                        style={{ height: `${log.stressLevel * 10}%` }}
                        title={`Stress ${log.stressLevel}/10`}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                      {log.timestamp.slice(5, 10)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-300">
                <span>Green bar: Energy (1–10)</span>
                <span>Violet bar: Stress (1–10)</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Gamification & Personal Development */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Personal Growth & Progression
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optional, non-punitive progression celebrating meaningful routines and learning.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleGamification(!state.settings.gamificationEnabled)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {state.settings.gamificationEnabled ? 'Disable Gamification' : 'Enable Gamification'}
          </button>
        </div>

        {!state.settings.gamificationEnabled ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Progression & XP are currently hidden per your preference. Analytics and Goal tracking remain fully active.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-xs text-slate-500 dark:text-slate-400">Current Level</div>
                <div className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Level {levelInfo.level}: {levelInfo.title}
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full bg-blue-600" style={{ width: `${levelInfo.progressPercent}%` }} />
                </div>
                <div className="mt-1.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {levelInfo.xp} XP {levelInfo.nextLevelXp ? `· Next at ${levelInfo.nextLevelXp} XP` : '· Max Tier'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-xs text-slate-500 dark:text-slate-400">Consistency Rhythm</div>
                <div className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {consistency.rhythmLabel}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono tabular-nums">{consistency.totalActiveDays}</span> meaningful active days · Zero penalties for rest days.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-xs text-slate-500 dark:text-slate-400">Daily Challenge & Weekly Mission</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Protect a 20-minute recovery pause today
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    Weekly: {state.gamification.weeklyMissionProgress}/{state.gamification.weeklyMissionTarget}
                  </span>
                  <button
                    type="button"
                    disabled={state.gamification.dailyChallengeCompleted}
                    onClick={onCompleteDailyChallenge}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {state.gamification.dailyChallengeCompleted ? 'Completed (+40 XP)' : 'Claim +40 XP'}
                  </button>
                </div>
              </div>
            </div>

            {/* Level Progression Ladder */}
            <div className="grid gap-2 sm:grid-cols-6">
              {LEVELS.map((lvl) => {
                const reached = levelInfo.level >= lvl.level;
                return (
                  <div
                    key={lvl.level}
                    className={`rounded-lg border p-2.5 text-xs ${
                      reached
                        ? 'border-blue-500/40 bg-blue-500/[0.08] text-slate-900 dark:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="font-mono text-[11px] tabular-nums">L{lvl.level}</div>
                    <div className="font-semibold">{lvl.title}</div>
                  </div>
                );
              })}
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                Achievement Badges ({state.gamification.unlockedBadgeIds.length}/{BADGE_CATALOG.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BADGE_CATALOG.map((badge) => {
                  const unlocked = state.gamification.unlockedBadgeIds.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-lg border p-3.5 ${
                        unlocked
                          ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
                          : 'border-slate-200 bg-slate-50 opacity-65 dark:border-white/10 dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{badge.title}</span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {unlocked ? 'Unlocked' : badge.criteriaLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{badge.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
