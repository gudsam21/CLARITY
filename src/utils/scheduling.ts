import type { CalendarCategory, CalendarEvent, Priority, ProposedEvent, ScheduleProposal } from '../types/clarity';

export interface ParsedScheduleRequest {
  title: string;
  durationMinutes: number;
  category: CalendarCategory;
  priority: Priority;
  preferredWindow?: 'morning' | 'afternoon' | 'evening';
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDaysISO(baseIsoDate: string, days: number): string {
  const [y, m, d] = baseIsoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

export function resolveTargetDate(prompt: string, todayIso: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('tomorrow')) return addDaysISO(todayIso, 1);
  if (lower.includes('next week')) return addDaysISO(todayIso, 7);
  return todayIso;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  half: 0.5,
};

function parseDurationToken(token: string, unit: string): number {
  const numeric = WORD_NUMBERS[token.toLowerCase()] ?? parseFloat(token);
  const val = Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs' || unit === 'h') {
    return Math.round(val * 60);
  }
  return Math.round(val);
}

function inferCategoryAndTitle(clause: string): { title: string; category: CalendarCategory; priority: Priority; preferredWindow?: 'morning' | 'afternoon' | 'evening' } {
  const lower = clause.toLowerCase();
  let preferredWindow: 'morning' | 'afternoon' | 'evening' | undefined;
  if (lower.includes('morning')) preferredWindow = 'morning';
  else if (lower.includes('afternoon')) preferredWindow = 'afternoon';
  else if (lower.includes('evening') || lower.includes('night')) preferredWindow = 'evening';

  if (lower.includes('study') || lower.includes('studying') || lower.includes('learn') || lower.includes('reading') || lower.includes('revision')) {
    return { title: 'Deep Study Session', category: 'study', priority: 'high', preferredWindow };
  }
  if (lower.includes('project')) {
    return { title: 'Project Execution Block', category: 'work', priority: 'high', preferredWindow };
  }
  if (lower.includes('exercise') || lower.includes('workout') || lower.includes('run') || lower.includes('gym') || lower.includes('walk') || lower.includes('yoga')) {
    return { title: 'Exercise & Physical Recovery', category: 'health', priority: 'medium', preferredWindow };
  }
  if (lower.includes('meeting') || lower.includes('call') || lower.includes('sync')) {
    return { title: 'Scheduled Sync', category: 'meeting', priority: 'medium', preferredWindow };
  }
  if (lower.includes('break') || lower.includes('rest') || lower.includes('lunch') || lower.includes('meditat')) {
    return { title: 'Rest & Reset Break', category: 'break', priority: 'low', preferredWindow };
  }
  if (lower.includes('deep work') || lower.includes('focus') || lower.includes('write') || lower.includes('code') || lower.includes('design')) {
    return { title: 'Focused Work Block', category: 'focus', priority: 'high', preferredWindow };
  }

  const cleaned = clause
    .replace(/\b(i need|plan|my|tomorrow|today|for|of|time|some|and|please|schedule)\b/gi, ' ')
    .replace(/\b(\d+(\.\d+)?|one|two|three|four|five|an|a|half)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const title = cleaned.length > 2
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : 'Focused Session';

  return { title, category: 'focus', priority: 'medium', preferredWindow };
}

export function parseNaturalLanguageScheduleIntent(prompt: string): ParsedScheduleRequest[] {
  const segments = prompt
    .split(/,|;|\band\b|\bthen\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const requests: ParsedScheduleRequest[] = [];

  for (const segment of segments) {
    const durationMatch = segment.match(
      /\b(\d+(?:\.\d+)?|one|two|three|four|five|half|an|a)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i
    );

    const hasActivityKeyword = /(study|studying|project|exercise|workout|gym|run|walk|yoga|focus|work|meeting|call|break|rest|read|write|code|review)/i.test(segment);

    if (!durationMatch && !hasActivityKeyword) {
      continue;
    }

    const durationMinutes = durationMatch
      ? Math.max(15, Math.min(240, parseDurationToken(durationMatch[1], durationMatch[2].toLowerCase())))
      : /(exercise|workout|walk|break|rest)/i.test(segment)
        ? 45
        : 60;

    const meta = inferCategoryAndTitle(segment);
    requests.push({
      title: meta.title,
      durationMinutes,
      category: meta.category,
      priority: meta.priority,
      preferredWindow: meta.preferredWindow,
    });
  }

  if (requests.length === 0 && prompt.trim().length > 0) {
    requests.push({
      title: 'Focused Planning Session',
      durationMinutes: 60,
      category: 'focus',
      priority: 'medium',
    });
  }

  return requests;
}

export interface TimeSlot {
  startMinutes: number;
  endMinutes: number;
}

export function findAvailableSlots(
  date: string,
  existingEvents: CalendarEvent[],
  workStartHour = 8,
  workEndHour = 21
): TimeSlot[] {
  const dayStart = workStartHour * 60;
  const dayEnd = workEndHour * 60;

  const busy = existingEvents
    .filter((e) => e.date === date)
    .map((e) => ({
      start: Math.max(dayStart, timeToMinutes(e.startTime)),
      end: Math.min(dayEnd, timeToMinutes(e.endTime)),
    }))
    .filter((e) => e.end > e.start)
    .sort((a, b) => a.start - b.start);

  const slots: TimeSlot[] = [];
  let cursor = dayStart;

  for (const block of busy) {
    if (block.start > cursor) {
      slots.push({ startMinutes: cursor, endMinutes: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < dayEnd) {
    slots.push({ startMinutes: cursor, endMinutes: dayEnd });
  }

  return slots;
}

export function detectConflicts(
  proposed: Array<{ date: string; startTime: string; endTime: string; title: string }>,
  existingEvents: CalendarEvent[]
): string[] {
  const conflicts: string[] = [];

  for (const item of proposed) {
    const pStart = timeToMinutes(item.startTime);
    const pEnd = timeToMinutes(item.endTime);

    for (const ev of existingEvents) {
      if (ev.date !== item.date) continue;
      const eStart = timeToMinutes(ev.startTime);
      const eEnd = timeToMinutes(ev.endTime);
      if (pStart < eEnd && pEnd > eStart) {
        conflicts.push(
          `"${item.title}" (${item.startTime}–${item.endTime}) overlaps with "${ev.title}" (${ev.startTime}–${ev.endTime}).`
        );
      }
    }
  }

  return conflicts;
}

export function buildProposedSchedule(
  prompt: string,
  todayIso: string,
  existingEvents: CalendarEvent[],
  preferredHours = { workStartHour: 8, workEndHour: 21 }
): ScheduleProposal {
  const targetDate = resolveTargetDate(prompt, todayIso);
  const intents = parseNaturalLanguageScheduleIntent(prompt);
  const freeSlots = findAvailableSlots(
    targetDate,
    existingEvents,
    preferredHours.workStartHour,
    preferredHours.workEndHour
  ).map((s) => ({ ...s }));

  const proposedEvents: ProposedEvent[] = [];
  const conflictsDetected: string[] = [];
  const bufferMinutes = 15;

  for (const req of intents) {
    let placed = false;

    const sortedSlots = [...freeSlots].sort((a, b) => {
      if (req.preferredWindow === 'evening') return b.startMinutes - a.startMinutes;
      if (req.preferredWindow === 'afternoon') {
        const aDist = Math.abs(a.startMinutes - 13 * 60);
        const bDist = Math.abs(b.startMinutes - 13 * 60);
        return aDist - bDist;
      }
      if (req.category === 'health' && !req.preferredWindow) {
        const aDist = Math.abs(a.startMinutes - 17 * 60);
        const bDist = Math.abs(b.startMinutes - 17 * 60);
        return aDist - bDist;
      }
      return a.startMinutes - b.startMinutes;
    });

    for (const slot of sortedSlots) {
      if (slot.endMinutes - slot.startMinutes >= req.durationMinutes) {
        const start = slot.startMinutes;
        const end = start + req.durationMinutes;
        proposedEvents.push({
          title: req.title,
          date: targetDate,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
          category: req.category,
          priority: req.priority,
          reason: `Placed in an open ${req.durationMinutes}-minute window with a 15-minute transition buffer.`,
        });
        slot.startMinutes = Math.min(slot.endMinutes, end + bufferMinutes);
        placed = true;
        break;
      }
    }

    if (!placed) {
      conflictsDetected.push(
        `No contiguous ${req.durationMinutes}-minute open window found for "${req.title}" on ${targetDate} within preferred hours.`
      );
    }
  }

  proposedEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    id: `prop_${Date.now()}`,
    prompt,
    targetDate,
    summary:
      proposedEvents.length > 0
        ? `Proposed ${proposedEvents.length} time-blocked session${proposedEvents.length > 1 ? 's' : ''} for ${targetDate}, preserving existing commitments.`
        : `Could not fit the requested sessions into ${targetDate} without overlapping existing commitments.`,
    conflictsDetected,
    proposedEvents,
    status: 'pending',
  };
}
