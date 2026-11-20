import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Check, X, Cpu, AlertTriangle } from 'lucide-react';
import type { ClarityAppState, ScheduleProposal } from '../types/clarity';

interface AssistantViewProps {
  state: ClarityAppState;
  aiConfigured: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onApproveProposal: (proposal: ScheduleProposal) => Promise<void>;
  onDismissProposal: (proposalId: string) => void;
}

const PROMPT_SUGGESTIONS = [
  'Plan my tomorrow. I need two hours of studying, one hour for my project, and time for exercise.',
  'Review my open tasks and tell me what could create overload this week.',
  'Create a high-priority task to finalize the architecture review notes by tomorrow.',
  'Remember that I prefer 25-minute deep focus sprints when stress is above 6.',
];

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function AssistantView({
  state,
  aiConfigured,
  onSendMessage,
  onApproveProposal,
  onDismissProposal,
}: AssistantViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.chatHistory.length]);

  const speakText = (text: string) => {
    if (!voiceOutputEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setErrorMsg('');
    setSending(true);
    try {
      await onSendMessage(text);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach CLARITY CORE.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const last = state.chatHistory[state.chatHistory.length - 1];
    if (last && last.role === 'assistant' && voiceOutputEnabled) {
      speakText(last.content);
    }
  }, [state.chatHistory.length]);

  const toggleVoiceInput = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) {
      setVoiceNote('Browser voice recognition is unavailable in this environment; type your instruction below.');
      return;
    }
    setVoiceNote('');
    const rec = new Rec();
    rec.lang = state.settings.language === 'es' ? 'es-ES' : state.settings.language === 'fr' ? 'fr-FR' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceNote('Microphone capture stopped or was denied.');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-8 flex h-[calc(100vh-12rem)] min-h-[540px] flex-col rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              CLARITY CORE Assistant
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Central intelligence coordinating 7 specialized agents with transparent reasoning
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !voiceOutputEnabled;
              setVoiceOutputEnabled(next);
              if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            aria-pressed={voiceOutputEnabled}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              voiceOutputEnabled
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            {voiceOutputEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {voiceOutputEnabled ? 'Voice Readout On' : 'Voice Readout Off'}
          </button>
        </div>

        {!aiConfigured && (
          <div className="flex items-start gap-2.5 border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Live Gemini responses require a <code className="font-mono">GEMINI_API_KEY</code> in Settings &gt; Secrets. Local scheduling proposals in Calendar and all direct workspace tools remain active.
            </span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {state.chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.reasoning && (
                  <div className="mt-2.5 border-t border-slate-200/80 pt-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Why this guidance: {msg.reasoning}
                  </div>
                )}

                {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 border-t border-slate-200/80 pt-2.5 dark:border-white/10">
                    {msg.toolExecutions.map((exec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                        <span>
                          <strong className="font-medium text-slate-900 dark:text-white">{exec.agentName}:</strong>{' '}
                          {exec.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.proposedSchedule && msg.proposedSchedule.status === 'pending' && (
                  <div className="mt-3 rounded-lg border border-blue-500/30 bg-white p-3.5 dark:bg-[#0B0F18]">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Proposed Schedule · {msg.proposedSchedule.targetDate} (Confirmation Required)
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {msg.proposedSchedule.proposedEvents.map((ev, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200">
                          <span>{ev.title}</span>
                          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {ev.startTime}–{ev.endTime}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApproveProposal(msg.proposedSchedule!)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Confirm & Add to Calendar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissProposal(msg.proposedSchedule!.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        {/* Error / Voice Note */}
        {(errorMsg || voiceNote) && (
          <div className="border-t border-slate-200 px-5 py-2 text-xs text-red-600 dark:border-white/10 dark:text-red-400">
            {errorMsg || voiceNote}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 p-4 dark:border-white/10">
          <button
            type="button"
            onClick={toggleVoiceInput}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={`shrink-0 rounded-lg border p-2.5 transition-colors ${
              listening
                ? 'border-red-500 bg-red-500/10 text-red-500'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <label htmlFor="assistant-chat-input" className="sr-only">
            Message CLARITY CORE
          </label>
          <input
            id="assistant-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask CLARITY CORE to organize tasks, plan tomorrow, or explain a trade-off..."
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
          />

          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {sending ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </section>

      {/* Right Column: Context & Prompts */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Suggested Commands
          </h2>
          <div className="mt-3 space-y-2">
            {PROMPT_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(s)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-xs leading-relaxed text-slate-700 hover:border-blue-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0D111A]">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Active Personal Context
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            User-approved preferences guiding CLARITY CORE.
          </p>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
            {state.memories.slice(0, 4).map((m) => (
              <li key={m.id} className="py-2.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {m.key} · <span className="font-normal text-slate-500">{m.category}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{m.value}</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
