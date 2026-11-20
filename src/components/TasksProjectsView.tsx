import { useState } from 'react';
import { CheckCircle2, Circle, FolderKanban, Plus, Search, Trash2, Sparkles } from 'lucide-react';
import type { CalendarCategory, ClarityAppState, Priority, ProjectItem, TaskItem } from '../types/clarity';

interface TasksViewProps {
  state: ClarityAppState;
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'status'>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TasksView({ state, onAddTask, onToggleTask, onDeleteTask }: TasksViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(today);
  const [minutes, setMinutes] = useState(45);
  const [category, setCategory] = useState<CalendarCategory>('work');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');

  const filtered = state.tasks.filter((t) => {
    if (statusFilter === 'open' && t.status === 'done') return false;
    if (statusFilter === 'done' && t.status !== 'done') return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search.trim() && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title cannot be empty.');
      return;
    }
    onAddTask({
      title: title.trim(),
      priority,
      dueDate,
      estimatedMinutes: Math.max(10, minutes),
      category,
      projectId: projectId || undefined,
    });
    setTitle('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Tasks & Daily Execution
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Organize commitments by priority, project, and realistic session estimates.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label htmlFor="new-task-title" className="sr-only">New task title</label>
            <input
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="Add a clear, actionable task..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-task-priority" className="sr-only">Priority</label>
            <select
              id="new-task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-task-due" className="sr-only">Due date</label>
            <input
              id="new-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-task-proj" className="sr-only">Project</label>
            <select
              id="new-task-proj"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="">No Project</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <input
              type="number"
              min={10}
              max={240}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              aria-label="Estimated minutes"
              className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 font-mono text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            />
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              aria-label="Filter tasks"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
              {(['all', 'open', 'done'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                    statusFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
              aria-label="Filter by priority"
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/15 dark:bg-[#0D111A] dark:text-slate-200"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No tasks match your current filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((task) => {
              const proj = state.projects.find((p) => p.id === task.projectId);
              return (
                <li key={task.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={`Toggle task "${task.title}"`}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          task.status === 'done'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{task.priority}</span> · Due{' '}
                        <span className="font-mono tabular-nums">{task.dueDate}</span> ·{' '}
                        <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                        {proj ? ` · ${proj.title}` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    aria-label={`Delete task "${task.title}"`}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

interface ProjectsViewProps {
  state: ClarityAppState;
  aiConfigured: boolean;
  onAddProject: (project: Omit<ProjectItem, 'id' | 'progress'>) => void;
  onBreakDownProject: (project: ProjectItem) => Promise<void>;
}

export function ProjectsView({ state, aiConfigured, onAddProject, onBreakDownProject }: ProjectsViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetDate, setTargetDate] = useState(today);
  const [breakingId, setBreakingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }
    onAddProject({
      title: title.trim(),
      summary: summary.trim() || 'Structured multi-step initiative.',
      status: 'active',
      targetDate,
      color: '#3B82F6',
    });
    setTitle('');
    setSummary('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-blue-500" aria-hidden="true" />
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Projects & Initiatives
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Track multi-week initiatives and let the Productivity Agent break complex deliverables into realistic work blocks.
        </p>

        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label htmlFor="proj-title" className="sr-only">Project title</label>
            <input
              id="proj-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="New project title..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="proj-summary" className="sr-only">Project summary</label>
            <input
              id="proj-summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief scope or outcome..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="proj-date" className="sr-only">Target date</label>
            <input
              id="proj-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Create Project
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </section>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {state.projects.map((proj) => {
          const linkedTasks = state.tasks.filter((t) => t.projectId === proj.id);
          const doneCount = linkedTasks.filter((t) => t.status === 'done').length;
          const computedPct =
            linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : proj.progress;

          return (
            <article
              key={proj.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]"
            >
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="capitalize">{proj.status}</span> · Target{' '}
                  <span className="font-mono tabular-nums">{proj.targetDate}</span>
                </div>
                <h2 className="mt-1.5 font-display text-base font-semibold text-slate-900 dark:text-white">
                  {proj.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {proj.summary}
                </p>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Progress ({doneCount}/{linkedTasks.length} tasks)</span>
                    <span className="font-mono tabular-nums font-semibold">{computedPct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${computedPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-3.5 dark:border-white/10">
                <button
                  type="button"
                  disabled={breakingId === proj.id || !aiConfigured}
                  onClick={async () => {
                    setBreakingId(proj.id);
                    try {
                      await onBreakDownProject(proj);
                    } finally {
                      setBreakingId(null);
                    }
                  }}
                  title={aiConfigured ? 'Generate 3 realistic tasks via Productivity Agent' : 'Requires GEMINI_API_KEY'}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 dark:text-blue-400"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {breakingId === proj.id ? 'Generating tasks...' : 'Generate AI Task Breakdown'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
