import fs from 'fs';
import path from 'path';
import type { ClarityAppState } from '../types/clarity';
import { createInitialSeedState } from '../data/seedData';
import { evaluateUnlockedBadges } from '../utils/progression';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clarity-db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadClarityState(): ClarityAppState {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialSeedState();
    saveClarityState(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ClarityAppState;
    if (!parsed || !parsed.profile || !Array.isArray(parsed.tasks)) {
      const fallback = createInitialSeedState();
      saveClarityState(fallback);
      return fallback;
    }
    return parsed;
  } catch {
    const fallback = createInitialSeedState();
    saveClarityState(fallback);
    return fallback;
  }
}

export function saveClarityState(state: ClarityAppState): ClarityAppState {
  ensureDataDir();
  const next: ClarityAppState = {
    ...state,
    gamification: {
      ...state.gamification,
      unlockedBadgeIds: evaluateUnlockedBadges(state),
    },
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function resetClarityState(): ClarityAppState {
  const fresh = createInitialSeedState();
  return saveClarityState(fresh);
}

export function appendAudit(
  state: ClarityAppState,
  actor: string,
  action: string,
  detail: string
): ClarityAppState {
  return {
    ...state,
    auditLog: [
      {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actor,
        action,
        detail,
      },
      ...state.auditLog,
    ].slice(0, 60),
  };
}
