import { useState } from 'react';
import { Download, Plus, RotateCcw, Shield, Trash2 } from 'lucide-react';
import type {
  AccessibilitySettings,
  ClarityAppState,
  InterfaceMode,
  LanguageCode,
  MemoryItem,
  TextSize,
  ThemeMode,
  UserProfile,
} from '../types/clarity';

interface SettingsViewProps {
  state: ClarityAppState;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateSettings: (settings: AccessibilitySettings) => void;
  onAddMemory: (mem: Omit<MemoryItem, 'id' | 'approvedAt'>) => void;
  onDeleteMemory: (id: string) => void;
  onResetDemo: () => Promise<void>;
}

export function SettingsView({
  state,
  onUpdateProfile,
  onUpdateSettings,
  onAddMemory,
  onDeleteMemory,
  onResetDemo,
}: SettingsViewProps) {
  const [memKey, setMemKey] = useState('');
  const [memValue, setMemValue] = useState('');
  const [memCategory, setMemCategory] = useState<MemoryItem['category']>('Preference');
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memKey.trim() || !memValue.trim()) return;
    onAddMemory({
      key: memKey.trim(),
      value: memValue.trim(),
      category: memCategory,
      source: 'User Settings',
    });
    setMemKey('');
    setMemValue('');
  };

  return (
    <div className="space-y-6">
      {/* Accessibility & Personalization */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Accessibility, Appearance & Personalization
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tailor CLARITY for your comfort, experience level, language, and visual contrast preferences.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="set-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Display Name
            </label>
            <input
              id="set-name"
              type="text"
              value={state.profile.name}
              onChange={(e) => onUpdateProfile({ ...state.profile, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="set-theme" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Theme
            </label>
            <select
              id="set-theme"
              value={state.settings.theme}
              onChange={(e) => onUpdateSettings({ ...state.settings, theme: e.target.value as ThemeMode })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="dark">Dark Graphite</option>
              <option value="light">Light Crisp</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-mode" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Interface Complexity
            </label>
            <select
              id="set-mode"
              value={state.settings.interfaceMode}
              onChange={(e) =>
                onUpdateSettings({ ...state.settings, interfaceMode: e.target.value as InterfaceMode })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="beginner">Beginner (Calm & Guided)</option>
              <option value="advanced">Advanced (Full Telemetry & Agents)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-text-size" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Text Size
            </label>
            <select
              id="set-text-size"
              value={state.settings.textSize}
              onChange={(e) => onUpdateSettings({ ...state.settings, textSize: e.target.value as TextSize })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable (Default)</option>
              <option value="large">Large (High Readability)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-lang" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Language
            </label>
            <select
              id="set-lang"
              value={state.settings.language}
              onChange={(e) => onUpdateSettings({ ...state.settings, language: e.target.value as LanguageCode })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-notif" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notification Cadence
            </label>
            <select
              id="set-notif"
              value={state.settings.notificationFrequency}
              onChange={(e) =>
                onUpdateSettings({
                  ...state.settings,
                  notificationFrequency: e.target.value as AccessibilitySettings['notificationFrequency'],
                })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
            >
              <option value="minimal">Minimal</option>
              <option value="balanced">Balanced</option>
              <option value="proactive">Proactive</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-white/10">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
            <span>Personal Progression & XP</span>
            <input
              type="checkbox"
              checked={state.settings.gamificationEnabled}
              onChange={(e) =>
                onUpdateSettings({ ...state.settings, gamificationEnabled: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
            <span>Quiet Hours ({state.settings.quietHours.start}–{state.settings.quietHours.end})</span>
            <input
              type="checkbox"
              checked={state.settings.quietHours.enabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...state.settings,
                  quietHours: { ...state.settings.quietHours, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 accent-blue-600"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
            <span>Simulated Calendar Sync (Demo)</span>
            <input
              type="checkbox"
              checked={state.settings.googleCalendarConnected}
              onChange={(e) =>
                onUpdateSettings({ ...state.settings, googleCalendarConnected: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
          </label>
        </div>
      </section>

      {/* AI Memory & Privacy Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                AI Memory & Data Sovereignty
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review, add, export, or delete any preference stored by CLARITY CORE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export"
              download="clarity-personal-data.json"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export JSON
            </a>

            <button
              type="button"
              onClick={() => {
                if (resetConfirm) {
                  onResetDemo();
                  setResetConfirm(false);
                } else {
                  setResetConfirm(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {resetConfirm ? 'Confirm Reset Demo Data' : 'Reset Demo Data'}
            </button>
          </div>
        </div>

        <form onSubmit={handleAddMemory} className="mt-4 grid gap-2.5 sm:grid-cols-12">
          <select
            value={memCategory}
            onChange={(e) => setMemCategory(e.target.value as MemoryItem['category'])}
            aria-label="Memory category"
            className="sm:col-span-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-[#0D111A] dark:text-white"
          >
            <option value="Preference">Preference</option>
            <option value="Working Hours">Working Hours</option>
            <option value="Routine">Routine</option>
            <option value="Goal">Goal</option>
            <option value="Project">Project</option>
            <option value="Communication">Communication</option>
          </select>
          <input
            type="text"
            value={memKey}
            onChange={(e) => setMemKey(e.target.value)}
            placeholder="Label (e.g., Focus sprint length)"
            aria-label="Memory key"
            className="sm:col-span-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
          />
          <input
            type="text"
            value={memValue}
            onChange={(e) => setMemValue(e.target.value)}
            placeholder="Detail CLARITY should remember..."
            aria-label="Memory value"
            className="sm:col-span-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
          />
          <button
            type="submit"
            className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Save Memory
          </button>
        </form>

        <ul className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
          {state.memories.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {m.key} · <span className="font-normal text-slate-500">{m.category}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{m.value}</div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteMemory(m.id)}
                aria-label={`Delete memory "${m.key}"`}
                className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Audit Log */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Action & Consent Audit Log
        </h2>
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
          {state.auditLog.slice(0, 12).map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{entry.actor}</span> ·{' '}
                <span className="text-slate-700 dark:text-slate-300">{entry.action}</span> —{' '}
                <span className="text-slate-500 dark:text-slate-400">{entry.detail}</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
