import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWorkloadAndEnergy } from './intelligence';
import type { CalendarEvent, EnergyStressLog, TaskItem } from '../types/clarity';

test('analyzeWorkloadAndEnergy detects elevated load and recommends recovery when stress is high', () => {
  const events: CalendarEvent[] = [
    { id: '1', title: 'Deep Work A', date: '2026-11-16', startTime: '08:00', endTime: '12:00', category: 'focus', priority: 'high' },
    { id: '2', title: 'Deep Work B', date: '2026-11-16', startTime: '13:00', endTime: '17:00', category: 'work', priority: 'high' },
  ];
  const tasks: TaskItem[] = [
    { id: 't1', title: 'Task 1', priority: 'critical', status: 'todo', dueDate: '2026-11-16', estimatedMinutes: 60, category: 'work', createdAt: '2026-11-16' },
  ];
  const logs: EnergyStressLog[] = [
    { id: 'l1', timestamp: '2026-11-16T10:00:00Z', energyLevel: 4, stressLevel: 8, focusClarity: 5, note: 'Heavy meeting day' },
  ];

  const report = analyzeWorkloadAndEnergy(events, tasks, logs, '2026-11-16');
  assert.equal(report.overloaded, true);
  assert.equal(report.statusLabel, 'Recovery Recommended');
  assert.equal(report.scheduledMinutes, 480);
});

test('analyzeWorkloadAndEnergy returns Balanced on moderate schedules', () => {
  const events: CalendarEvent[] = [
    { id: '1', title: 'Focus Session', date: '2026-11-16', startTime: '09:00', endTime: '11:00', category: 'focus', priority: 'high' },
  ];
  const tasks: TaskItem[] = [];
  const logs: EnergyStressLog[] = [
    { id: 'l1', timestamp: '2026-11-16T09:00:00Z', energyLevel: 8, stressLevel: 3, focusClarity: 8, note: 'Rested' },
  ];

  const report = analyzeWorkloadAndEnergy(events, tasks, logs, '2026-11-16');
  assert.equal(report.overloaded, false);
  assert.equal(report.statusLabel, 'Balanced');
});
