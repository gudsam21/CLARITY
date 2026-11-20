import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Bell,
  Bot,
  Calendar,
  CheckSquare,
  Compass,
  FolderKanban,
  Home,
  Menu,
  Moon,
  Scale,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import type {
  AgentId,
  CalendarEvent,
  ClarityAppState,
  GoalItem,
  MemoryItem,
  NavSection,
  ProjectItem,
  ScheduleProposal,
  TaskItem,
} from './types/clarity';
import { createInitialSeedState } from './data/seedData';
import { calculateTaskXp } from './utils/progression';
import { UI_COPY } from './utils/i18n';
import { LandingGate } from './components/LandingGate';
import { CommandCenterView } from './components/CommandCenterView';
import { AssistantView } from './components/AssistantView';
import { AgentsView } from './components/AgentsView';
import { CalendarView } from './components/CalendarView';
import { TasksView, ProjectsView } from './components/TasksProjectsView';
import { DecisionsView } from './components/DecisionsView';
import { GoalsView } from './components/GoalsView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';

const NAV_ITEMS: Array<{ id: NavSection; icon: typeof Home }> = [
  { id: 'home', icon: Home },
  { id: 'assistant', icon: Sparkles },
  { id: 'agents', icon: Bot },
  { id: 'calendar', icon: Calendar },
  { id: 'tasks', icon: CheckSquare },
  { id: 'decisions', icon: Scale },
  { id: 'projects', icon: FolderKanban },
  { id: 'goals', icon: Compass },
  { id: 'insights', icon: Activity },
  { id: 'settings', icon: Settings },
];

export default function App() {
  const [state, setState] = useState<ClarityAppState>(() => createInitialSeedState());
  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const notifyToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  }, []);

  // Load initial persisted state from Express backend
  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then((res) => res.json())
      .then((data: { state?: ClarityAppState; aiConfigured?: boolean }) => {
        if (!active) return;
        if (data.state) {
          setState(
            autostart && !data.state.profile.onboarded
              ? { ...data.state, profile: { ...data.state.profile, onboarded: true } }
              : data.state
          );
        }
        setAiConfigured(Boolean(data.aiConfigured));
      })
      .catch(() => {
        // Keep initial seed state if backend is momentarily unavailable
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [autostart]);

  // Sync theme and text-size attributes on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-text-size', state.settings.textSize);
    root.lang = state.settings.language;
  }, [state.settings.theme, state.settings.textSize, state.settings.language]);

  const persistState = useCallback((updater: (prev: ClarityAppState) => ClarityAppState) => {
    setState((prev) => {
      const next = updater(prev);
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  }, []);

  const handleOnboardingComplete = (config: {
    name: string;
    role: string;
    interfaceMode: ClarityAppState['settings']['interfaceMode'];
    theme: ClarityAppState['settings']['theme'];
  }) => {
    persistState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: config.name,
        role: config.role,
        onboarded: true,
      },
      settings: {
        ...prev.settings,
        interfaceMode: config.interfaceMode,
        theme: config.theme,
      },
    }));
  };

  // Assistant Chat
  const handleSendAssistantMessage = async (message: string) => {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'CLARITY CORE could not complete that request.');
    }
    if (data.state) setState(data.state);
    setAiConfigured(Boolean(data.aiConfigured));
  };

  const handleQuickCommand = async (prompt: string) => {
    setActiveSection('assistant');
    await handleSendAssistantMessage(prompt);
  };

  // Calendar Proposals & Events
  const handleProposeSchedule = async (prompt: string): Promise<ScheduleProposal> => {
    const res = await fetch('/api/calendar/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not propose schedule.');
    return data.proposal as ScheduleProposal;
  };

  const handleApproveProposal = async (proposal: ScheduleProposal) => {
    const res = await fetch('/api/calendar/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.conflicts?.join(' ') || data.error || 'Unable to save schedule.');
    }
    if (data.state) {
      const updatedChat = (data.state as ClarityAppState).chatHistory.map((m) =>
        m.proposedSchedule?.id === proposal.id
          ? { ...m, proposedSchedule: { ...m.proposedSchedule, status: 'approved' as const } }
          : m
      );
      const synced = { ...(data.state as ClarityAppState), chatHistory: updatedChat };
      setState(synced);
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(synced),
      }).catch(() => {});
    }
    notifyToast(`Added ${data.addedCount} scheduled session(s) to Calendar.`);
  };

  const handleDismissProposal = (proposalId: string) => {
    persistState((prev) => ({
      ...prev,
      chatHistory: prev.chatHistory.map((m) =>
        m.proposedSchedule?.id === proposalId
          ? { ...m, proposedSchedule: { ...m.proposedSchedule, status: 'dismissed' } }
          : m
      ),
    }));
  };

  const handleAddEvent = (event: Omit<CalendarEvent, 'id'>) => {
    persistState((prev) => ({
      ...prev,
      events: [...prev.events, { ...event, id: `ev_${Date.now()}` }],
    }));
    notifyToast(`Scheduled "${event.title}".`);
  };

  const handleMoveEvent = (eventId: string, newDate: string) => {
    persistState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, date: newDate } : e)),
    }));
    notifyToast(`Moved event to ${newDate}.`);
  };

  const handleDeleteEvent = (eventId: string) => {
    persistState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  };

  // Tasks & Projects
  const handleAddTask = (task: Omit<TaskItem, 'id' | 'createdAt' | 'status'>) => {
    const now = new Date().toISOString();
    persistState((prev) => ({
      ...prev,
      tasks: [
        {
          ...task,
          id: `task_${Date.now()}`,
          status: 'todo',
          createdAt: now,
        },
        ...prev.tasks,
      ],
    }));
    notifyToast(`Task added: ${task.title}`);
  };

  const handleToggleTask = (taskId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    persistState((prev) => {
      const target = prev.tasks.find((t) => t.id === taskId);
      if (!target) return prev;
      const completing = target.status !== 'done';
      const xpGain =
        completing && prev.settings.gamificationEnabled
          ? calculateTaskXp(target.priority, target.estimatedMinutes)
          : 0;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: completing ? 'done' : 'todo',
                completedAt: completing ? new Date().toISOString() : undefined,
              }
            : t
        ),
        gamification: {
          ...prev.gamification,
          xp: prev.gamification.xp + xpGain,
          completedDates:
            completing && !prev.gamification.completedDates.includes(today)
              ? [...prev.gamification.completedDates, today]
              : prev.gamification.completedDates,
        },
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    persistState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleAddProject = (proj: Omit<ProjectItem, 'id' | 'progress'>) => {
    persistState((prev) => ({
      ...prev,
      projects: [{ ...proj, id: `proj_${Date.now()}`, progress: 0 }, ...prev.projects],
    }));
    notifyToast(`Project "${proj.title}" created.`);
  };

  const handleBreakDownProject = async (proj: ProjectItem) => {
    const res = await fetch('/api/agents/productivity/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: `Break the project "${proj.title}" (${proj.summary}) into 3 concrete, actionable tasks due before ${proj.targetDate}.`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notifyToast(data.error || 'Could not break down project.');
      return;
    }
    const actions: Array<{ label: string; detail: string }> = data.result?.structuredActions ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const generatedTasks: TaskItem[] = actions.slice(0, 3).map((act, idx) => ({
      id: `task_${Date.now()}_${idx}`,
      title: act.label,
      description: act.detail,
      priority: 'high',
      status: 'todo',
      dueDate: proj.targetDate || today,
      estimatedMinutes: 60,
      projectId: proj.id,
      category: 'work',
      createdAt: now,
    }));
    persistState((prev) => ({
      ...prev,
      tasks: [...generatedTasks, ...prev.tasks],
    }));
    notifyToast(`Added ${generatedTasks.length} AI-generated tasks to "${proj.title}".`);
  };

  // Decisions
  const handleAnalyzeDecision = async (title: string, context: string) => {
    const res = await fetch('/api/decisions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, context }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Decision analysis failed.');
    if (data.state) setState(data.state);
    notifyToast('Decision analysis complete.');
  };

  const handleSelectDecisionOption = (decisionId: string, optionId: string) => {
    persistState((prev) => ({
      ...prev,
      decisions: prev.decisions.map((d) =>
        d.id === decisionId ? { ...d, selectedOptionId: optionId } : d
      ),
    }));
    notifyToast('Your final choice has been recorded.');
  };

  // Goals
  const handleAddGoal = (goal: Omit<GoalItem, 'id' | 'progress'>) => {
    persistState((prev) => ({
      ...prev,
      goals: [{ ...goal, id: `goal_${Date.now()}`, progress: 0 }, ...prev.goals],
    }));
    notifyToast(`Goal "${goal.title}" added.`);
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    persistState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const done = milestones.filter((m) => m.completed).length;
        const progress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;
        return { ...g, milestones, progress };
      }),
    }));
  };

  const handleConvertGoalToTasks = (goal: GoalItem) => {
    const now = new Date().toISOString();
    const pending = goal.milestones.filter((m) => !m.completed);
    const created: TaskItem[] = pending.map((m, idx) => ({
      id: `task_goal_${Date.now()}_${idx}`,
      title: m.title,
      description: `Milestone for goal: ${goal.title}`,
      priority: goal.priority,
      status: 'todo',
      dueDate: m.dueDate || goal.targetDate,
      estimatedMinutes: 45,
      goalId: goal.id,
      category: goal.domain === 'Education' ? 'study' : goal.domain === 'Health and wellness' ? 'health' : 'work',
      createdAt: now,
    }));
    if (created.length > 0) {
      persistState((prev) => ({
        ...prev,
        tasks: [...created, ...prev.tasks],
      }));
    }
  };

  // Energy & Agents
  const handleLogEnergy = (energyLevel: number, stressLevel: number, note = 'Command Center check-in') => {
    persistState((prev) => ({
      ...prev,
      energyLogs: [
        {
          id: `en_${Date.now()}`,
          timestamp: new Date().toISOString(),
          energyLevel,
          stressLevel,
          focusClarity: Math.max(1, Math.min(10, Math.round((energyLevel + (10 - stressLevel)) / 2))),
          note,
        },
        ...prev.energyLogs,
      ],
    }));
    notifyToast(`Energy (${energyLevel}/10) & Stress (${stressLevel}/10) logged.`);
  };

  const handleRunAgent = async (agentId: AgentId, input: string) => {
    const res = await fetch(`/api/agents/${agentId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Agent execution failed.');
    if (data.state) setState(data.state);
    return data.result;
  };

  const handleRefreshBriefing = async () => {
    const res = await fetch('/api/briefing/refresh', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.state) {
      setState(data.state);
      notifyToast('Daily briefing refreshed.');
    }
  };

  const handleCompleteDailyChallenge = () => {
    const today = new Date().toISOString().slice(0, 10);
    persistState((prev) => {
      if (prev.gamification.dailyChallengeCompleted) return prev;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          xp: prev.gamification.xp + 40,
          dailyChallengeCompleted: true,
          weeklyMissionProgress: Math.min(
            prev.gamification.weeklyMissionTarget,
            prev.gamification.weeklyMissionProgress + 1
          ),
          completedDates: prev.gamification.completedDates.includes(today)
            ? prev.gamification.completedDates
            : [...prev.gamification.completedDates, today],
        },
      };
    });
    notifyToast('Earned +40 XP for protecting recovery.');
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/state/reset', { method: 'POST' });
    const data = await res.json();
    if (data.state) {
      setState({ ...data.state, profile: { ...data.state.profile, onboarded: true } });
      notifyToast('Workspace reset to default demo state.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#090B10] dark:text-slate-100">
        <div className="text-center">
          <div className="font-display text-xl font-semibold tracking-tight">CLARITY</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loading Personal Intelligence OS...</p>
        </div>
      </div>
    );
  }

  if (!state.profile.onboarded && !autostart) {
    return (
      <LandingGate
        initialName={state.profile.name}
        initialRole={state.profile.role}
        initialMode={state.settings.interfaceMode}
        initialTheme={state.settings.theme}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  const copy = UI_COPY[state.settings.language];
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090B10] dark:text-slate-100 clarity-grid-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white/95 dark:border-white/10 dark:bg-[#0B0E16]/95">
        <div className="flex h-16 items-center px-6 border-b border-slate-200 dark:border-white/10">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            CLARITY
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{copy.nav[item.id]}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={state.profile.avatarUrl}
              alt={state.profile.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover border border-slate-300 dark:border-white/15"
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {state.profile.name}
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {state.settings.interfaceMode === 'beginner' ? 'Beginner Mode' : 'Advanced Mode'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white dark:bg-[#0B0E16] border-r border-slate-200 dark:border-white/10">
            <div className="flex h-14 items-center justify-between px-5 border-b border-slate-200 dark:border-white/10">
              <span className="font-display text-base font-bold text-slate-900 dark:text-white">CLARITY</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{copy.nav[item.id]}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex flex-1 flex-col lg:pl-60 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 sm:px-6 dark:border-white/10 dark:bg-[#090B10]/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              {copy.nav[activeSection]}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={() =>
                persistState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
                  },
                }))
              }
              aria-label={`Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} theme`}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {state.settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 font-mono text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('assistant')}
              className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Ask CLARITY CORE
            </button>

            {/* Notifications Popover */}
            {notifOpen && (
              <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/15 dark:bg-[#0D111A]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-white/10">
                  <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      persistState((prev) => ({
                        ...prev,
                        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
                      }))
                    }
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {state.notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          persistState((prev) => ({
                            ...prev,
                            notifications: prev.notifications.map((item) =>
                              item.id === n.id ? { ...item, read: true } : item
                            ),
                          }));
                          if (n.actionSection) setActiveSection(n.actionSection);
                          setNotifOpen(false);
                        }}
                        className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors ${
                          n.read
                            ? 'border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]'
                            : 'border-blue-500/30 bg-blue-500/[0.06]'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <div className="mt-0.5 text-slate-600 dark:text-slate-400">{n.message}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>

        {/* Action Toast */}
        {toastMessage && (
          <div
            role="status"
            className="mx-auto mt-3 rounded-lg border border-blue-500/30 bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-md"
          >
            {toastMessage}
          </div>
        )}

        {/* Active View Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {activeSection === 'home' && (
            <CommandCenterView
              state={state}
              aiConfigured={aiConfigured}
              onNavigate={setActiveSection}
              onQuickCommand={handleQuickCommand}
              onToggleTask={handleToggleTask}
              onLogQuickEnergy={(e, s) => handleLogEnergy(e, s)}
              onRefreshBriefing={handleRefreshBriefing}
            />
          )}

          {activeSection === 'assistant' && (
            <AssistantView
              state={state}
              aiConfigured={aiConfigured}
              onSendMessage={handleSendAssistantMessage}
              onApproveProposal={handleApproveProposal}
              onDismissProposal={handleDismissProposal}
            />
          )}

          {activeSection === 'agents' && (
            <AgentsView
              state={state}
              aiConfigured={aiConfigured}
              onRunAgent={handleRunAgent}
              onQuickAddTask={(title, category) =>
                handleAddTask({
                  title,
                  priority: 'medium',
                  dueDate: new Date().toISOString().slice(0, 10),
                  estimatedMinutes: 45,
                  category,
                })
              }
              onLogEnergy={(e, s, note) => handleLogEnergy(e, s, note)}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'calendar' && (
            <CalendarView
              state={state}
              onProposeSchedule={handleProposeSchedule}
              onApproveProposal={handleApproveProposal}
              onAddEvent={handleAddEvent}
              onMoveEvent={handleMoveEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {activeSection === 'tasks' && (
            <TasksView
              state={state}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeSection === 'decisions' && (
            <DecisionsView
              state={state}
              aiConfigured={aiConfigured}
              onAnalyzeDecision={handleAnalyzeDecision}
              onSelectDecisionOption={handleSelectDecisionOption}
            />
          )}

          {activeSection === 'projects' && (
            <ProjectsView
              state={state}
              aiConfigured={aiConfigured}
              onAddProject={handleAddProject}
              onBreakDownProject={handleBreakDownProject}
            />
          )}

          {activeSection === 'goals' && (
            <GoalsView
              state={state}
              onAddGoal={handleAddGoal}
              onToggleMilestone={handleToggleMilestone}
              onConvertGoalToTasks={handleConvertGoalToTasks}
            />
          )}

          {activeSection === 'insights' && (
            <InsightsView
              state={state}
              onCompleteDailyChallenge={handleCompleteDailyChallenge}
              onToggleGamification={(enabled) =>
                persistState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, gamificationEnabled: enabled },
                }))
              }
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              state={state}
              onUpdateProfile={(profile) => persistState((prev) => ({ ...prev, profile }))}
              onUpdateSettings={(settings) => persistState((prev) => ({ ...prev, settings }))}
              onAddMemory={(mem: Omit<MemoryItem, 'id' | 'approvedAt'>) =>
                persistState((prev) => ({
                  ...prev,
                  memories: [
                    {
                      ...mem,
                      id: `mem_${Date.now()}`,
                      approvedAt: new Date().toISOString(),
                    },
                    ...prev.memories,
                  ],
                }))
              }
              onDeleteMemory={(id) =>
                persistState((prev) => ({
                  ...prev,
                  memories: prev.memories.filter((m) => m.id !== id),
                }))
              }
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>
    </div>
  );
}
