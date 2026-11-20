import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaskXp, evaluateConsistency, getLevelInfo } from './progression';

test('getLevelInfo resolves correct level titles and progress bounds', () => {
  const lvl1 = getLevelInfo(100);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.title, 'Explorer');
  assert.equal(lvl1.nextLevelXp, 250);

  const lvl3 = getLevelInfo(700);
  assert.equal(lvl3.level, 3);
  assert.equal(lvl3.title, 'Strategist');

  const lvl6 = getLevelInfo(3200);
  assert.equal(lvl6.level, 6);
  assert.equal(lvl6.title, 'Master Planner');
  assert.equal(lvl6.progressPercent, 100);
});

test('calculateTaskXp scales with priority and focus duration', () => {
  assert.equal(calculateTaskXp('low', 30), 30);
  assert.equal(calculateTaskXp('high', 60), 75);
  assert.equal(calculateTaskXp('critical', 120), 120);
});

test('evaluateConsistency tracks active days gently without punitive resets', () => {
  const res = evaluateConsistency(['2026-11-10', '2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16']);
  assert.equal(res.totalActiveDays, 5);
  assert.equal(res.rhythmLabel, 'Steady Rhythm');
});
