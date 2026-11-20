import { useState } from 'react';
import { CheckCircle2, Circle, Compass, Plus } from 'lucide-react';
import type { ClarityAppState, GoalDomain, GoalItem, Priority } from '../types/clarity';

interface GoalsViewProps {
  state: ClarityAppState;
  onAddGoal: (goal: Omit<GoalItem, 'id' | 'progress'>) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onConvertGoalToTasks: (goal: GoalItem) => void;
}

const GOAL_DOMAINS: GoalDomain[] = [
  'Education',
  'Career',
  'Financial planning',
  'Personal development',
  'Health and wellness',
  'Relationships',
  'Creative projects',
  'Daily responsibilities',
];

export function GoalsView({
  state,
  onAddGoal,
  onToggleMilestone,
  onConvertGoalToTasks,
}: GoalsViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [domainFilter, setDomainFilter] = useState<'All' | GoalDomain>('All');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<GoalDomain>('Personal development');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(today);
  const [priority, setPriority] = useState<Priority>('high');
  const [milestoneText, setMilestoneText] = useState('');
  const [error, setError] = useState('');
  const [convertedMsg, setConvertedMsg] = useState('');

  const visibleGoals =
    domainFilter === 'All'
      ? state.goals
      : state.goals.filter((g) => g.domain === domainFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }
    const rawMilestones = milestoneText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const milestones = (rawMilestones.length > 0 ? rawMilestones : ['Define first milestone', 'Review mid-point progress']).map(
      (m, idx) => ({
        id: `ms_${Date.now()}_${idx}`,
        title: m,
        completed: false,
        dueDate: targetDate,
      })
    );
    onAddGoal({
      title: title.trim(),
      domain,
      description: description.trim() || `Structured action plan for ${domain}.`,
      targetDate,
      priority,
      milestones,
      aiRecommendations: [
        'Break the next incomplete milestone into a 45-minute focus block.',
      ],
    });
    setTitle('');
    setDescription('');
    setMilestoneText('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Life Management & Personal Goals
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Organize meaningful goals across 8 life domains and turn long-term ambitions into realistic action steps.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label htmlFor="goal-title" className="sr-only">Goal title</label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="Goal title..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="goal-domain" className="sr-only">Life domain</label>
            <select
              id="goal-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as GoalDomain)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              {GOAL_DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="goal-milestones" className="sr-only">Milestones comma separated</label>
            <input
              id="goal-milestones"
              type="text"
              value={milestoneText}
              onChange={(e) => setMilestoneText(e.target.value)}
              placeholder="Milestones (comma-separated)..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Goal
            </button>
          </div>
          <div className="sm:col-span-7">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this matters & measurable outcome..."
              aria-label="Goal description"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-3">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              aria-label="Goal target date"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              aria-label="Goal priority"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        {convertedMsg && <p className="mt-2 text-xs text-emerald-500">{convertedMsg}</p>}
      </section>

      {/* Domain Filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', ...GOAL_DOMAINS] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDomainFilter(d)}
            className={`whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              domainFilter === d
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-[#0D111A] dark:text-slate-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {visibleGoals.map((goal) => (
          <article
            key={goal.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{goal.domain} · <span className="capitalize">{goal.priority}</span></span>
                <span className="font-mono tabular-nums">Target {goal.targetDate}</span>
              </div>
              <h2 className="mt-1.5 font-display text-base font-semibold text-slate-900 dark:text-white">
                {goal.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {goal.description}
              </p>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Milestone Completion</span>
                  <span className="font-mono tabular-nums font-semibold">{goal.progress}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {goal.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => onToggleMilestone(goal.id, m.id)}
                      aria-label={`Toggle milestone "${m.title}"`}
                      className="text-slate-400 hover:text-emerald-500"
                    >
                      {m.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={
                        m.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-200'
                      }
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3.5 dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {goal.aiRecommendations[0]}
              </span>
              <button
                type="button"
                onClick={() => {
                  onConvertGoalToTasks(goal);
                  setConvertedMsg(`Added pending milestones from "${goal.title}" to Tasks.`);
                  setTimeout(() => setConvertedMsg(''), 3000);
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 whitespace-nowrap"
              >
                Convert Milestones to Tasks
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
