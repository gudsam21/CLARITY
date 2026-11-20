import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProposedSchedule,
  detectConflicts,
  findAvailableSlots,
  parseNaturalLanguageScheduleIntent,
  resolveTargetDate,
} from './scheduling';
import type { CalendarEvent } from '../types/clarity';

test('resolveTargetDate recognizes tomorrow and today', () => {
  assert.equal(resolveTargetDate('Plan my tomorrow', '2026-11-16'), '2026-11-17');
  assert.equal(resolveTargetDate('Schedule today focus', '2026-11-16'), '2026-11-16');
});

test('parseNaturalLanguageScheduleIntent parses multi-activity prompt accurately', () => {
  const intents = parseNaturalLanguageScheduleIntent(
    'Plan my tomorrow. I need two hours of studying, one hour for my project, and time for exercise.'
  );
  assert.equal(intents.length, 3);
  assert.equal(intents[0].category, 'study');
  assert.equal(intents[0].durationMinutes, 120);
  assert.equal(intents[1].category, 'work');
  assert.equal(intents[1].durationMinutes, 60);
  assert.equal(intents[2].category, 'health');
  assert.equal(intents[2].durationMinutes, 45);
});

test('findAvailableSlots carves out existing commitments cleanly', () => {
  const events: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Morning Sync',
      date: '2026-11-17',
      startTime: '09:00',
      endTime: '10:30',
      category: 'meeting',
      priority: 'medium',
    },
  ];
  const slots = findAvailableSlots('2026-11-17', events, 8, 12);
  assert.deepEqual(slots, [
    { startMinutes: 480, endMinutes: 540 },
    { startMinutes: 630, endMinutes: 720 },
  ]);
});

test('buildProposedSchedule avoids existing commitments and flags zero overlaps', () => {
  const existing: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Team Standup',
      date: '2026-11-17',
      startTime: '09:00',
      endTime: '10:00',
      category: 'meeting',
      priority: 'high',
    },
  ];

  const proposal = buildProposedSchedule(
    'Plan my tomorrow. I need two hours of studying, one hour for my project, and time for exercise.',
    '2026-11-16',
    existing,
    { workStartHour: 8, workEndHour: 20 }
  );

  assert.equal(proposal.targetDate, '2026-11-17');
  assert.equal(proposal.proposedEvents.length, 3);
  assert.equal(proposal.conflictsDetected.length, 0);

  const overlaps = detectConflicts(proposal.proposedEvents, existing);
  assert.equal(overlaps.length, 0);
});
