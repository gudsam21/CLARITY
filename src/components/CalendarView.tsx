import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import type {
  CalendarCategory,
  CalendarEvent,
  ClarityAppState,
  Priority,
  ScheduleProposal,
} from '../types/clarity';
import { addDaysISO, timeToMinutes } from '../utils/scheduling';

interface CalendarViewProps {
  state: ClarityAppState;
  onProposeSchedule: (prompt: string) => Promise<ScheduleProposal>;
  onApproveProposal: (proposal: ScheduleProposal) => Promise<void>;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onMoveEvent: (eventId: string, newDate: string, newStartTime?: string) => void;
  onDeleteEvent: (eventId: string) => void;
}

type ViewScope = 'day' | 'week' | 'month' | 'year';

const CATEGORY_STYLE: Record<CalendarCategory, string> = {
  focus: 'border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200',
  study: 'border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200',
  work: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
  health: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  personal: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  break: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  meeting: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200',
};

export function CalendarView({
  state,
  onProposeSchedule,
  onApproveProposal,
  onAddEvent,
  onMoveEvent,
  onDeleteEvent,
}: CalendarViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState<ViewScope>('week');

  // NL Smart Scheduler
  const [nlPrompt, setNlPrompt] = useState(
    'Plan my tomorrow. I need two hours of studying, one hour for my project, and time for exercise.'
  );
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [proposalError, setProposalError] = useState('');

  // Manual Event Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(today);
  const [newStart, setNewStart] = useState('15:00');
  const [newEnd, setNewEnd] = useState('16:00');
  const [newCategory, setNewCategory] = useState<CalendarCategory>('focus');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newRecurring, setNewRecurring] = useState<'none' | 'daily' | 'weekly'>('none');
  const [formError, setFormError] = useState('');

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlPrompt.trim()) {
      setProposalError('Enter a scheduling instruction first.');
      return;
    }
    setProposing(true);
    setProposalError('');
    try {
      const prop = await onProposeSchedule(nlPrompt.trim());
      setProposal(prop);
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : 'Unable to generate schedule proposal.');
    } finally {
      setProposing(false);
    }
  };

  const handleConfirmProposal = async () => {
    if (!proposal) return;
    try {
      await onApproveProposal(proposal);
      setSelectedDate(proposal.targetDate);
      setProposal(null);
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : 'Conflict detected while saving.');
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }
    if (timeToMinutes(newEnd) <= timeToMinutes(newStart)) {
      setFormError('End time must be after start time.');
      return;
    }
    onAddEvent({
      title: newTitle.trim(),
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      category: newCategory,
      priority: newPriority,
      recurring: newRecurring,
      source: 'manual',
    });
    setNewTitle('');
    setFormError('');
    setShowAddForm(false);
  };

  const stepDate = (dir: number) => {
    const delta = scope === 'day' ? dir : scope === 'week' ? dir * 7 : scope === 'month' ? dir * 30 : dir * 365;
    setSelectedDate(addDaysISO(selectedDate, delta));
  };

  // Compute week days centered around selectedDate
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(selectedDate, i - 1));
  const dayEvents = state.events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Month grid helpers
  const [yearNum, monthNum] = selectedDate.split('-').map(Number);
  const firstDayOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1));
  const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
  const startWeekday = firstDayOfMonth.getUTCDay();
  const monthPrefix = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Natural-Language Smart Scheduler */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
            <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Life OS Smart Calendar
            </h1>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Existing commitments are preserved · Confirmation required before saving
          </span>
        </div>

        <form onSubmit={handlePropose} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="nl-schedule-input" className="sr-only">
            Natural-language scheduling instruction
          </label>
          <input
            id="nl-schedule-input"
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            placeholder='Try: "Plan my tomorrow. I need two hours of studying, one hour for my project, and time for exercise."'
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
          />
          <button
            type="submit"
            disabled={proposing}
            className="whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {proposing ? 'Analyzing Slots...' : 'Propose Schedule'}
          </button>
        </form>

        {proposalError && (
          <div role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {proposalError}
          </div>
        )}

        {proposal && (
          <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Proposed Schedule for {proposal.targetDate}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">{proposal.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmProposal}
                  disabled={proposal.proposedEvents.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Approve & Add to Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </button>
              </div>
            </div>

            {proposal.conflictsDetected.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>{proposal.conflictsDetected.join(' ')}</div>
              </div>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {proposal.proposedEvents.map((pe, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0D111A]"
                >
                  <div className="font-mono text-xs font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {pe.startTime} – {pe.endTime}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{pe.title}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{pe.category}</span> · {pe.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Calendar Toolbar + View Switcher */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              aria-label="Previous period"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => stepDate(1)}
              aria-label="Next period"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              {selectedDate}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5" role="group" aria-label="Calendar view range">
              {(['day', 'week', 'month', 'year'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScope(v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    scope === v
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Event
            </button>
          </div>
        </div>

        {/* Add Event Drawer */}
        {showAddForm && (
          <form onSubmit={handleCreateEvent} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-6 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="sm:col-span-2">
              <label htmlFor="ev-title" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
              <input
                id="ev-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Deep work, study, workout..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="ev-date" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Date</label>
              <input
                id="ev-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label htmlFor="ev-start" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Start</label>
                <input
                  id="ev-start"
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="ev-end" className="block text-xs font-medium text-slate-600 dark:text-slate-300">End</label>
                <input
                  id="ev-end"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ev-cat" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Category</label>
              <select
                id="ev-cat"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as CalendarCategory)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
              >
                <option value="focus">Focus</option>
                <option value="study">Study</option>
                <option value="work">Work</option>
                <option value="health">Health</option>
                <option value="personal">Personal</option>
                <option value="break">Break</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="ev-rec" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Repeat</label>
                <select
                  id="ev-rec"
                  value={newRecurring}
                  onChange={(e) => setNewRecurring(e.target.value as 'none' | 'daily' | 'weekly')}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
                >
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500">
                Save
              </button>
            </div>
            {formError && <p className="sm:col-span-6 text-xs text-red-500">{formError}</p>}
          </form>
        )}

        {/* DAY VIEW */}
        {scope === 'day' && (
          <div className="mt-5 space-y-2.5">
            {dayEvents.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No events scheduled on {selectedDate}. Use the Smart Scheduler above or click New Event.
              </p>
            ) : (
              dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5 ${CATEGORY_STYLE[ev.category]}`}
                >
                  <div>
                    <div className="text-sm font-semibold">{ev.title}</div>
                    <div className="mt-0.5 text-xs opacity-80">
                      <span className="capitalize">{ev.category}</span> · Priority: {ev.priority}
                      {ev.notes ? ` · ${ev.notes}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs tabular-nums font-medium">
                      {ev.startTime} – {ev.endTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(ev.id)}
                      aria-label={`Delete event "${ev.title}"`}
                      className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* WEEK VIEW (Drag-and-Drop supported) */}
        {scope === 'week' && (
          <div className="mt-5">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Drag any event card onto another day column to reschedule it.
            </p>
            <div className="grid gap-3 md:grid-cols-7">
              {weekDays.map((dayIso) => {
                const items = state.events
                  .filter((e) => e.date === dayIso)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isToday = dayIso === today;
                return (
                  <div
                    key={dayIso}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedEventId) {
                        onMoveEvent(draggedEventId, dayIso);
                        setDraggedEventId(null);
                      }
                    }}
                    className={`min-h-[220px] rounded-xl border p-2.5 transition-colors ${
                      isToday
                        ? 'border-blue-500/50 bg-blue-500/[0.04]'
                        : 'border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(dayIso);
                        setScope('day');
                      }}
                      className="w-full border-b border-slate-200 pb-1.5 text-left dark:border-white/10"
                    >
                      <div className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {dayIso.slice(5)}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {new Date(`${dayIso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
                      </div>
                    </button>

                    <div className="mt-2 space-y-2">
                      {items.map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={() => setDraggedEventId(ev.id)}
                          className={`cursor-grab rounded-lg border p-2 text-xs ${CATEGORY_STYLE[ev.category]}`}
                        >
                          <div className="font-mono text-[10px] tabular-nums opacity-85">
                            {ev.startTime}–{ev.endTime}
                          </div>
                          <div className="mt-0.5 font-medium leading-snug">{ev.title}</div>
                          <div className="mt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              aria-label={`Delete event "${ev.title}"`}
                              className="opacity-70 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {scope === 'month' && (
          <div className="mt-5">
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`empty_${i}`} className="h-20 rounded-lg bg-slate-100/40 dark:bg-white/[0.01]" />
              ))}
              {Array.from({ length: daysInMonth }, (_, idx) => {
                const dayNum = idx + 1;
                const iso = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
                const count = state.events.filter((e) => e.date === iso).length;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(iso);
                      setScope('day');
                    }}
                    className={`flex h-20 flex-col justify-between rounded-lg border p-2 text-left transition-colors ${
                      iso === selectedDate
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    <span className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-white">
                      {dayNum}
                    </span>
                    {count > 0 && (
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        {count} block{count > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* YEAR VIEW */}
        {scope === 'year' && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }, (_, mIdx) => {
              const mStr = `${yearNum}-${String(mIdx + 1).padStart(2, '0')}`;
              const monthEvents = state.events.filter((e) => e.date.startsWith(mStr));
              const monthName = new Date(Date.UTC(yearNum, mIdx, 1)).toLocaleDateString(undefined, {
                month: 'long',
                timeZone: 'UTC',
              });
              return (
                <button
                  key={mStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(`${mStr}-01`);
                    setScope('month');
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-500/40 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {monthName}
                    </span>
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="mt-2 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {monthEvents.length} scheduled block{monthEvents.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
