import { useState } from 'react';
import {
  BrainCircuit,
  CalendarClock,
  CheckSquare,
  HeartPulse,
  GraduationCap,
  MessageSquareHeart,
  MonitorSmartphone,
  Play,
  Plus,
} from 'lucide-react';
import type { AgentId, ClarityAppState, NavSection } from '../types/clarity';
import { analyzeWorkloadAndEnergy } from '../utils/intelligence';

interface AgentsViewProps {
  state: ClarityAppState;
  aiConfigured: boolean;
  onRunAgent: (
    agentId: AgentId,
    input: string
  ) => Promise<{
    agentId: AgentId;
    headline: string;
    guidance: string[];
    structuredActions: Array<{ label: string; detail: string }>;
    cautionNote?: string;
  }>;
  onQuickAddTask: (title: string, category: 'focus' | 'study' | 'work' | 'health') => void;
  onLogEnergy: (energy: number, stress: number, note: string) => void;
  onNavigate: (section: NavSection) => void;
}

const AGENT_DEFS: Array<{
  id: AgentId;
  name: string;
  summary: string;
  responsibilities: string[];
  defaultPrompt: string;
  icon: typeof BrainCircuit;
}> = [
  {
    id: 'decision',
    name: 'Decision Intelligence Agent',
    summary: 'Breaks complex dilemmas into options, risks, consequences, and uncertainty bounds.',
    responsibilities: [
      'Compare options & trade-offs',
      'Distinguish facts vs. assumptions',
      'Highlight missing information & uncertainty',
    ],
    defaultPrompt: 'Evaluate whether to start a focused side research project this quarter given my current milestone load.',
    icon: BrainCircuit,
  },
  {
    id: 'productivity',
    name: 'Productivity Agent',
    summary: 'Decomposes large projects into realistic work sessions and surfaces priority conflicts.',
    responsibilities: [
      'Break large projects into tasks',
      'Prioritize upcoming deadlines',
      'Detect overloaded task queues',
    ],
    defaultPrompt: 'Break my Autonomous Navigation Architecture project into 3 realistic work sessions for this week.',
    icon: CheckSquare,
  },
  {
    id: 'calendar',
    name: 'Calendar & Scheduling Agent',
    summary: 'Finds open windows, prevents overlaps, schedules breaks, and protects commitments.',
    responsibilities: [
      'Locate conflict-free time windows',
      'Schedule mindful breaks',
      'Propose reschedules with confirmation',
    ],
    defaultPrompt: 'Review my schedule density today and suggest where to insert a 25-minute recovery walk.',
    icon: CalendarClock,
  },
  {
    id: 'stress',
    name: 'Stress & Energy Agent',
    summary: 'Tracks energy and stress trends, spots overcommitment, and encourages balanced pacing.',
    responsibilities: [
      'Log energy, stress, and clarity',
      'Identify workload strain patterns',
      'Recommend non-medical recovery habits',
    ],
    defaultPrompt: 'Review my recent energy and stress logs and recommend pacing adjustments for tomorrow.',
    icon: HeartPulse,
  },
  {
    id: 'learning',
    name: 'Learning Agent',
    summary: 'Designs structured study plans, active recall quizzes, and spaced revision intervals.',
    responsibilities: [
      'Create modular study plans',
      'Generate quick revision quizzes',
      'Schedule spaced repetition blocks',
    ],
    defaultPrompt: 'Create a 3-question active recall quiz and revision plan for Decision Trees & Value of Information.',
    icon: GraduationCap,
  },
  {
    id: 'relationship',
    name: 'Relationship & Communication Agent',
    summary: 'Clarifies interpersonal dynamics, boundary-setting opportunities, and respectful phrasing.',
    responsibilities: [
      'Prepare difficult conversations',
      'Identify healthy boundary phrasing',
      'Encourage balanced communication',
    ],
    defaultPrompt: 'Help me prepare a respectful boundary message pushing back on an unscheduled Thursday scope addition.',
    icon: MessageSquareHeart,
  },
  {
    id: 'digital',
    name: 'Digital Environment Agent',
    summary: 'Audits digital habits, pinpoints context-switching distractions, and refines routines.',
    responsibilities: [
      'Evaluate distraction triggers',
      'Design calmer notification routines',
      'Protect evening wind-down hours',
    ],
    defaultPrompt: 'Suggest a practical routine to cut down unscheduled Slack context switching during my 08:30–11:30 peak.',
    icon: MonitorSmartphone,
  },
];

export function AgentsView({
  state,
  aiConfigured,
  onRunAgent,
  onQuickAddTask,
  onLogEnergy,
  onNavigate,
}: AgentsViewProps) {
  const [selectedId, setSelectedId] = useState<AgentId>('decision');
  const [promptInput, setPromptInput] = useState(AGENT_DEFS[0].defaultPrompt);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [output, setOutput] = useState<{
    agentId: AgentId;
    headline: string;
    guidance: string[];
    structuredActions: Array<{ label: string; detail: string }>;
    cautionNote?: string;
  } | null>(null);

  const [stressVal, setStressVal] = useState(4);
  const [energyVal, setEnergyVal] = useState(7);
  const [stressNote, setStressNote] = useState('');

  const activeDef = AGENT_DEFS.find((a) => a.id === selectedId) ?? AGENT_DEFS[0];
  const today = new Date().toISOString().slice(0, 10);
  const workload = analyzeWorkloadAndEnergy(state.events, state.tasks, state.energyLogs, today);

  const handleSelectAgent = (id: AgentId) => {
    setSelectedId(id);
    const def = AGENT_DEFS.find((a) => a.id === id);
    if (def) setPromptInput(def.defaultPrompt);
    setErrorMsg('');
    setOutput(null);
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || running) return;
    setRunning(true);
    setErrorMsg('');
    try {
      const res = await onRunAgent(selectedId, promptInput.trim());
      setOutput(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to execute agent.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Selector Rail */}
      <aside className="lg:col-span-4 space-y-2.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0D111A]">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Specialized AI Agents
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select an agent to inspect its responsibilities and run live workspace tools.
          </p>
        </div>

        <div className="space-y-2" role="tablist" aria-label="Specialized AI Agents">
          {AGENT_DEFS.map((ag) => {
            const Icon = ag.icon;
            const active = ag.id === selectedId;
            return (
              <button
                key={ag.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectAgent(ag.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-blue-500 bg-blue-600/10 dark:bg-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#0D111A] dark:hover:border-white/20'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-blue-500' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{ag.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{ag.summary}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Dedicated Agent Console */}
      <section className="lg:col-span-8 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0D111A]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                {activeDef.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activeDef.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Coordinate via CLARITY CORE
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Core Responsibilities
            </h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {activeDef.responsibilities.map((r, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Agent-Specific Quick State Tools */}
          {selectedId === 'stress' && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Energy & Stress Check-In (Non-Medical Pacing)
                </h3>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Current Status: {workload.statusLabel}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="ag-energy" className="text-xs text-slate-600 dark:text-slate-300">
                    Energy: <span className="font-mono">{energyVal}/10</span>
                  </label>
                  <input
                    id="ag-energy"
                    type="range"
                    min={1}
                    max={10}
                    value={energyVal}
                    onChange={(e) => setEnergyVal(Number(e.target.value))}
                    className="mt-1 w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="ag-stress" className="text-xs text-slate-600 dark:text-slate-300">
                    Stress: <span className="font-mono">{stressVal}/10</span>
                  </label>
                  <input
                    id="ag-stress"
                    type="range"
                    min={1}
                    max={10}
                    value={stressVal}
                    onChange={(e) => setStressVal(Number(e.target.value))}
                    className="mt-1 w-full accent-violet-600"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <input
                    type="text"
                    value={stressNote}
                    onChange={(e) => setStressNote(e.target.value)}
                    placeholder="Context note..."
                    aria-label="Energy log context note"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onLogEnergy(energyVal, stressVal, stressNote || 'Agent check-in');
                      setStressNote('');
                    }}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedId === 'digital' && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Deep Focus Today</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {state.digitalHabits.focusHoursToday}h
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Distraction Drift</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {state.digitalHabits.distractionMinutesToday}m
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Wind-Down Target</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {state.digitalHabits.eveningWindDownTime}
                </div>
              </div>
            </div>
          )}

          {selectedId === 'learning' && state.learningTracks[0] && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                <span>Active Study Track: {state.learningTracks[0].subject}</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  Next Revision: {state.learningTracks[0].nextRevisionDate}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {state.learningTracks[0].modules.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span>{m.completed ? 'Completed:' : 'Upcoming:'} {m.title}</span>
                    <span className="font-mono tabular-nums">{m.durationMins}m</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Execution Form */}
          <form onSubmit={handleRun} className="mt-5 space-y-3">
            <label htmlFor="agent-prompt-box" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Instruct {activeDef.name}
            </label>
            <textarea
              id="agent-prompt-box"
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {aiConfigured ? 'Connected to server-side Gemini orchestration' : 'Requires GEMINI_API_KEY for live agent synthesis'}
              </span>
              <button
                type="submit"
                disabled={running || !promptInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {running ? 'Executing...' : 'Run Agent'}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {output && (
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 dark:border-white/10">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {output.headline}
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {output.guidance.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
              {output.structuredActions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Recommended Actions (Click to add to Tasks)
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {output.structuredActions.map((act, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">{act.label}</div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{act.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onQuickAddTask(act.label, selectedId === 'learning' ? 'study' : 'work')}
                          className="mt-2.5 inline-flex items-center gap-1 self-start text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add to Tasks
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {output.cautionNote && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{output.cautionNote}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
