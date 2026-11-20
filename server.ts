import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { AgentId, ClarityAppState, ScheduleProposal } from './src/types/clarity';
import {
  appendAudit,
  loadClarityState,
  resetClarityState,
  saveClarityState,
} from './src/server/clarityStore';
import {
  generateLiveDailyBriefing,
  isGeminiConfigured,
  runClarityCoreChat,
  runDecisionIntelligenceAgent,
  runSpecializedAgent,
} from './src/server/clarityAgents';
import { buildProposedSchedule, detectConflicts } from './src/utils/scheduling';
import { calculateTaskXp } from './src/utils/progression';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      aiConfigured: isGeminiConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/state', (_req, res) => {
    const state = loadClarityState();
    res.json({ state, aiConfigured: isGeminiConfigured() });
  });

  app.put('/api/state', (req, res) => {
    const incoming = req.body as ClarityAppState;
    if (!incoming || !incoming.profile || !Array.isArray(incoming.tasks)) {
      res.status(400).json({ error: 'Invalid CLARITY state payload.' });
      return;
    }
    const saved = saveClarityState(incoming);
    res.json({ state: saved });
  });

  app.post('/api/state/reset', (_req, res) => {
    const fresh = resetClarityState();
    res.json({ state: fresh });
  });

  app.get('/api/export', (_req, res) => {
    const state = loadClarityState();
    res.setHeader('Content-Disposition', 'attachment; filename="clarity-personal-data.json"');
    res.json(state);
  });

  app.post('/api/assistant/chat', async (req, res) => {
    const { message } = req.body as { message?: string };
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please enter a message for CLARITY CORE.' });
      return;
    }
    try {
      const current = loadClarityState();
      const result = await runClarityCoreChat(message.trim(), current);
      const saved = saveClarityState(result.state);
      res.json({
        state: saved,
        assistantMessage: result.assistantMessage,
        aiConfigured: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Gemini API.';
      res.status(503).json({
        error: msg,
        aiConfigured: isGeminiConfigured(),
      });
    }
  });

  app.post('/api/calendar/propose', async (req, res) => {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Please describe the schedule you would like to plan.' });
      return;
    }
    const state = loadClarityState();
    const today = new Date().toISOString().slice(0, 10);
    const startHour = Number(state.profile.preferredWorkingHours.start.split(':')[0] || 8);
    const endHour = Number(state.profile.preferredWorkingHours.end.split(':')[0] || 20);

    const proposal = buildProposedSchedule(prompt.trim(), today, state.events, {
      workStartHour: startHour,
      workEndHour: Math.max(startHour + 4, endHour),
    });

    res.json({ proposal });
  });

  app.post('/api/calendar/approve', (req, res) => {
    const { proposal } = req.body as { proposal?: ScheduleProposal };
    if (!proposal || !Array.isArray(proposal.proposedEvents) || proposal.proposedEvents.length === 0) {
      res.status(400).json({ error: 'No proposed events provided to save.' });
      return;
    }

    let state = loadClarityState();
    const conflicts = detectConflicts(proposal.proposedEvents, state.events);
    if (conflicts.length > 0) {
      res.status(409).json({
        error: 'Schedule conflict detected before saving.',
        conflicts,
      });
      return;
    }

    const newEvents = proposal.proposedEvents.map((pe, idx) => ({
      id: `ev_${Date.now()}_${idx}`,
      title: pe.title,
      date: pe.date,
      startTime: pe.startTime,
      endTime: pe.endTime,
      category: pe.category,
      priority: pe.priority,
      recurring: 'none' as const,
      notes: pe.reason,
      source: 'clarity_scheduler' as const,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const earnedXp = state.settings.gamificationEnabled ? newEvents.length * 25 : 0;

    state = {
      ...state,
      events: [...state.events, ...newEvents],
      gamification: {
        ...state.gamification,
        xp: state.gamification.xp + earnedXp,
        completedDates: state.gamification.completedDates.includes(today)
          ? state.gamification.completedDates
          : [...state.gamification.completedDates, today],
      },
    };
    state = appendAudit(
      state,
      'Calendar & Scheduling Agent',
      'Saved confirmed schedule',
      `Added ${newEvents.length} user-approved events for ${proposal.targetDate}.`
    );

    const saved = saveClarityState(state);
    res.json({ state: saved, addedCount: newEvents.length });
  });

  app.post('/api/decisions/analyze', async (req, res) => {
    const { title, context } = req.body as { title?: string; context?: string };
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Please enter a decision or dilemma title.' });
      return;
    }
    try {
      let state = loadClarityState();
      const analysis = await runDecisionIntelligenceAgent(title.trim(), String(context || ''), state);
      const earnedXp = state.settings.gamificationEnabled ? calculateTaskXp('high', 45) : 0;
      state = {
        ...state,
        decisions: [analysis, ...state.decisions],
        gamification: {
          ...state.gamification,
          xp: state.gamification.xp + earnedXp,
        },
      };
      state = appendAudit(state, 'Decision Intelligence Agent', 'Analyzed decision', analysis.title);
      const saved = saveClarityState(state);
      res.json({ state: saved, analysis });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to analyze decision.';
      res.status(503).json({ error: msg, aiConfigured: isGeminiConfigured() });
    }
  });

  app.post('/api/agents/:agentId/run', async (req, res) => {
    const agentId = req.params.agentId as AgentId;
    const { input } = req.body as { input?: string };
    const validAgents: AgentId[] = [
      'decision',
      'productivity',
      'calendar',
      'stress',
      'learning',
      'relationship',
      'digital',
    ];
    if (!validAgents.includes(agentId)) {
      res.status(400).json({ error: 'Unknown specialized agent.' });
      return;
    }
    if (!input || typeof input !== 'string' || !input.trim()) {
      res.status(400).json({ error: 'Please enter a request or situation for this agent.' });
      return;
    }
    try {
      let state = loadClarityState();
      const result = await runSpecializedAgent(agentId, input.trim(), state);
      state = appendAudit(state, `${agentId} agent`, 'Executed agent analysis', result.headline);
      const saved = saveClarityState(state);
      res.json({ state: saved, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Agent request failed.';
      res.status(503).json({ error: msg, aiConfigured: isGeminiConfigured() });
    }
  });

  app.post('/api/briefing/refresh', async (_req, res) => {
    try {
      let state = loadClarityState();
      const briefing = await generateLiveDailyBriefing(state);
      state = { ...state, dailyBriefing: briefing };
      state = appendAudit(state, 'CLARITY CORE', 'Refreshed daily briefing', briefing.headline);
      const saved = saveClarityState(state);
      res.json({ state: saved, briefing });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not refresh briefing.';
      res.status(503).json({ error: msg, aiConfigured: isGeminiConfigured() });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CLARITY server listening on http://localhost:${PORT}`);
  });
}

startServer();
