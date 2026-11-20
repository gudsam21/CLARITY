import { useState } from 'react';
import { Check, Scale, Sparkles } from 'lucide-react';
import type { ClarityAppState } from '../types/clarity';

interface DecisionsViewProps {
  state: ClarityAppState;
  aiConfigured: boolean;
  onAnalyzeDecision: (title: string, context: string) => Promise<void>;
  onSelectDecisionOption: (decisionId: string, optionId: string) => void;
}

export function DecisionsView({
  state,
  aiConfigured,
  onAnalyzeDecision,
  onSelectDecisionOption,
}: DecisionsViewProps) {
  const [activeId, setActiveId] = useState(state.decisions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const [compareA, setCompareA] = useState(0);
  const [compareB, setCompareB] = useState(1);

  const activeDecision = state.decisions.find((d) => d.id === activeId) ?? state.decisions[0];

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Enter the decision or problem you want to analyze.');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      await onAnalyzeDecision(title.trim(), context.trim());
      setTitle('');
      setContext('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run Decision Intelligence Engine.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* New Decision Input */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-violet-500" aria-hidden="true" />
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Decision Intelligence Engine
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Separates verified facts, assumptions, predictions, and recommendations. You always make the final decision.
        </p>

        <form onSubmit={handleAnalyze} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label htmlFor="dec-title" className="sr-only">Decision or problem</label>
            <input
              id="dec-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="e.g., Relocate for new role vs. negotiate remote arrangement"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-5">
            <label htmlFor="dec-context" className="sr-only">Constraints and context</label>
            <input
              id="dec-context"
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Key constraints, timeline, priorities, or unknowns..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={analyzing || !aiConfigured}
              title={aiConfigured ? 'Run Decision Intelligence Agent' : 'Requires GEMINI_API_KEY'}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </section>

      {/* Saved Decisions Selector + Analysis Workspace */}
      {activeDecision && (
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4 space-y-2">
            {state.decisions.map((dec) => (
              <button
                key={dec.id}
                type="button"
                onClick={() => {
                  setActiveId(dec.id);
                  setCompareA(0);
                  setCompareB(Math.min(1, dec.options.length - 1));
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  dec.id === activeDecision.id
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#0D111A]'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{dec.title}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {dec.options.length} options ·{' '}
                  {dec.selectedOptionId ? 'Decision finalized' : 'Awaiting your choice'}
                </div>
              </button>
            ))}
          </aside>

          <section className="lg:col-span-8 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0D111A]">
              <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                {activeDecision.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {activeDecision.problemDefinition}
              </p>

              {/* Epistemic Separation Grid: Facts, Assumptions, Predictions, Recommendations */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                  <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Facts (Verified Context)
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {activeDecision.facts.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                  <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Assumptions (Requires Validation)
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {activeDecision.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                  <h3 className="text-xs font-semibold text-violet-700 dark:text-violet-400">
                    Predictions (Uncertain Forecasts)
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {activeDecision.predictions.map((p, i) => <li key={i}>• {p}</li>)}
                  </ul>
                </div>

                <div className="rounded-lg border border-blue-500/25 bg-blue-500/[0.05] p-4">
                  <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Recommendations & Next Steps
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                    {activeDecision.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.02]">
                <strong className="text-slate-900 dark:text-white">Missing Information:</strong>{' '}
                <span className="text-slate-600 dark:text-slate-300">
                  {activeDecision.missingInformation.join(' · ')}
                </span>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  Uncertainty note: {activeDecision.uncertaintyNotes}
                </div>
              </div>

              {/* Interactive Scenario Comparison */}
              {activeDecision.options.length >= 2 && (
                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      Interactive Scenario Comparison
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={compareA}
                        onChange={(e) => setCompareA(Number(e.target.value))}
                        aria-label="Scenario A"
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 dark:border-white/15 dark:bg-[#0D111A]"
                      >
                        {activeDecision.options.map((o, i) => (
                          <option key={o.id} value={i}>{o.name}</option>
                        ))}
                      </select>
                      <span className="text-slate-400">vs</span>
                      <select
                        value={compareB}
                        onChange={(e) => setCompareB(Number(e.target.value))}
                        aria-label="Scenario B"
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 dark:border-white/15 dark:bg-[#0D111A]"
                      >
                        {activeDecision.options.map((o, i) => (
                          <option key={o.id} value={i}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[activeDecision.options[compareA], activeDecision.options[compareB]].map(
                      (opt, idx) =>
                        opt && (
                          <div
                            key={`${opt.id}_${idx}`}
                            className={`flex flex-col justify-between rounded-xl border p-4 ${
                              activeDecision.selectedOptionId === opt.id
                                ? 'border-blue-500 bg-blue-500/[0.06]'
                                : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]'
                            }`}
                          >
                            <div className="space-y-3 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                                  {opt.name}
                                </h4>
                                <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                                  {opt.confidenceScore}% conf.
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Advantages:</span>{' '}
                                {opt.pros.join('; ')}
                              </div>
                              <div>
                                <span className="font-semibold text-amber-700 dark:text-amber-400">Disadvantages:</span>{' '}
                                {opt.cons.join('; ')}
                              </div>
                              <div>
                                <span className="font-semibold text-red-700 dark:text-red-400">Risks:</span>{' '}
                                {opt.risks.join('; ')}
                              </div>
                              <div>
                                <span className="font-semibold text-blue-700 dark:text-blue-400">Opportunities:</span>{' '}
                                {opt.opportunities.join('; ')}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                <strong>Short-term:</strong> {opt.shortTermConsequences}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                <strong>Long-term:</strong> {opt.longTermConsequences}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectDecisionOption(activeDecision.id, opt.id)}
                              className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                                activeDecision.selectedOptionId === opt.id
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-[#0D111A] dark:text-slate-200 dark:hover:bg-white/5'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              {activeDecision.selectedOptionId === opt.id
                                ? 'Your Selected Decision'
                                : 'Choose This Path'}
                            </button>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
