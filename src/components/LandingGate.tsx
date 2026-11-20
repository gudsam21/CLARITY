import { useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { InterfaceMode, ThemeMode } from '../types/clarity';

interface LandingGateProps {
  initialName: string;
  initialRole: string;
  initialMode: InterfaceMode;
  initialTheme: ThemeMode;
  onComplete: (config: {
    name: string;
    role: string;
    interfaceMode: InterfaceMode;
    theme: ThemeMode;
  }) => void;
}

export function LandingGate({
  initialName,
  initialRole,
  initialMode,
  initialTheme,
  onComplete,
}: LandingGateProps) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState(initialRole);
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(initialMode);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name so CLARITY can personalize your workspace.');
      return;
    }
    onComplete({
      name: name.trim(),
      role: role.trim() || 'Personal OS Member',
      interfaceMode,
      theme,
    });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <img
        src="/src/assets/images/clarity_command_backdrop_1794887470517.jpg"
        alt="CLARITY minimalist command interior"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/90 to-[#07090E]/75" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between gap-8 border-b border-white/10 pb-5">
          <span className="font-display text-xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
            CLARITY
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              CLARITY CORE
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Life OS Calendar
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Decision Engine
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Privacy First
            </a>
          </nav>
          <button
            type="button"
            onClick={() =>
              onComplete({
                name: name.trim() || initialName,
                role: role.trim() || initialRole,
                interfaceMode,
                theme,
              })
            }
            className="whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Enter Workspace
          </button>
        </header>

        <main className="my-10 grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-sm font-medium text-blue-400">
              Personal Intelligence Operating System
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl text-balance">
              Think clearly, organize your life, and make calmer decisions.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300">
              CLARITY brings together CLARITY CORE, seven specialized AI agents, natural-language smart scheduling, structured decision analysis, and energy-aware life planning in one unified command environment.
            </p>

            <div id="capabilities" className="grid gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <Sparkles className="h-5 w-5 text-blue-400" aria-hidden="true" />
                <h2 className="mt-2.5 font-display text-sm font-semibold text-white">CLARITY CORE</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Coordinates 7 specialized agents with transparent reasoning.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <SlidersHorizontal className="h-5 w-5 text-violet-400" aria-hidden="true" />
                <h2 className="mt-2.5 font-display text-sm font-semibold text-white">Life OS Calendar</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Turns plain-language plans into conflict-free schedules with confirmation.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <h2 className="mt-2.5 font-display text-sm font-semibold text-white">You Stay in Control</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Explicit memory approval, audit logs, and zero silent calendar overwrites.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/15 bg-[#0F131D]/95 p-6 shadow-2xl space-y-5"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Initialize Your Workspace
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Personalize how CLARITY adapts to your experience level and visual preference.
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="onboard-name" className="block text-xs font-medium text-slate-300">
                  Your Name
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="onboard-role" className="block text-xs font-medium text-slate-300">
                  Focus or Background (Optional)
                </label>
                <input
                  id="onboard-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Student, Engineer, Designer, Parent"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">Interface Mode</span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
                    {(['beginner', 'advanced'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setInterfaceMode(mode)}
                        className={`rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                          interfaceMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">Appearance</span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
                    {(['dark', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                          theme === t
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Launch CLARITY Command Center
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>CLARITY Personal Intelligence System</span>
          <span>Accessible design · Local workspace persistence · Gemini server orchestration</span>
        </footer>
      </div>
    </div>
  );
}
