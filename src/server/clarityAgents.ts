import { GoogleGenAI, ThinkingLevel, Type, type FunctionDeclaration } from '@google/genai';
import type {
  AgentId,
  AgentToolExecution,
  CalendarCategory,
  ChatMessage,
  ClarityAppState,
  DecisionAnalysis,
  GoalDomain,
  Priority,
  ScheduleProposal,
} from '../types/clarity';
import { buildProposedSchedule, resolveTargetDate } from '../utils/scheduling';
import { analyzeWorkloadAndEnergy } from '../utils/intelligence';
import { appendAudit } from './clarityStore';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return getGeminiClient() !== null;
}

const clarityToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'propose_schedule',
    description:
      'Invoke the Calendar & Scheduling Agent to convert a natural-language time planning request into non-overlapping calendar proposals for user confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        requestText: {
          type: Type.STRING,
          description: 'Natural language scheduling request, e.g., "two hours of studying, one hour for my project, and time for exercise tomorrow".',
        },
        targetDate: {
          type: Type.STRING,
          description: 'Optional YYYY-MM-DD date.',
        },
      },
      required: ['requestText'],
    },
  },
  {
    name: 'create_task',
    description: 'Invoke the Productivity Agent to add a prioritized task to the user task list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Concise actionable task title.' },
        priority: { type: Type.STRING, description: 'One of: low, medium, high, critical.' },
        dueDate: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format.' },
        estimatedMinutes: { type: Type.NUMBER, description: 'Estimated duration in minutes.' },
        category: { type: Type.STRING, description: 'One of: focus, study, work, personal, health, break, meeting.' },
      },
      required: ['title', 'priority'],
    },
  },
  {
    name: 'log_energy_stress',
    description: 'Invoke the Stress & Energy Agent to record the user energy and stress levels and evaluate recovery balance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        energyLevel: { type: Type.NUMBER, description: 'Energy from 1 to 10.' },
        stressLevel: { type: Type.NUMBER, description: 'Stress from 1 to 10.' },
        note: { type: Type.STRING, description: 'Brief context note.' },
      },
      required: ['energyLevel', 'stressLevel'],
    },
  },
  {
    name: 'create_goal_plan',
    description: 'Invoke the Life Management & Productivity Agents to create a structured personal goal with milestones.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Goal title.' },
        domain: {
          type: Type.STRING,
          description:
            'One of: Education, Career, Financial planning, Personal development, Health and wellness, Relationships, Creative projects, Daily responsibilities.',
        },
        description: { type: Type.STRING, description: 'Goal description.' },
        milestones: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 to 4 concrete milestones.',
        },
      },
      required: ['title', 'domain', 'description', 'milestones'],
    },
  },
  {
    name: 'remember_preference',
    description: 'Store a user-requested preference or routine in CLARITY AI Memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING, description: 'Short label for the preference.' },
        value: { type: Type.STRING, description: 'The preference detail to remember.' },
        category: {
          type: Type.STRING,
          description: 'One of: Working Hours, Goal, Routine, Preference, Project, Communication.',
        },
      },
      required: ['key', 'value'],
    },
  },
];

function buildSystemContextSummary(state: ClarityAppState): string {
  const today = new Date().toISOString().slice(0, 10);
  const workload = analyzeWorkloadAndEnergy(state.events, state.tasks, state.energyLogs, today);
  const openTasks = state.tasks.filter((t) => t.status !== 'done').slice(0, 8);
  const upcomingEvents = state.events.slice(0, 10);

  return `You are CLARITY CORE, the central personal intelligence operating system coordinating 7 specialized agents:
1. Decision Intelligence Agent
2. Productivity Agent
3. Calendar & Scheduling Agent
4. Stress & Energy Agent
5. Learning Agent
6. Relationship & Communication Agent
7. Digital Environment Agent

Current Date: ${today}
User: ${state.profile.name} (${state.profile.role})
Preferred Working Hours: ${state.profile.preferredWorkingHours.start} – ${state.profile.preferredWorkingHours.end}
Communication Style: ${state.profile.communicationStyle}
Interface Mode: ${state.settings.interfaceMode}
Workload Status Today: ${workload.statusLabel} (${workload.scheduledHoursLabel} scheduled, avg energy ${workload.averageEnergy}/10, avg stress ${workload.averageStress}/10)

User-Approved Memories:
${state.memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join('\n')}

Open Priority Tasks:
${openTasks.map((t) => `- [${t.priority}] ${t.title} (due ${t.dueDate}, ${t.estimatedMinutes}m)`).join('\n')}

Existing Calendar Events:
${upcomingEvents.map((e) => `- ${e.date} ${e.startTime}-${e.endTime}: ${e.title} (${e.category})`).join('\n')}

Rules:
- Be respectful, calm, clear, and explain WHY you recommend an action.
- Never make medical diagnoses; frame stress/energy guidance as practical workload pacing and recovery habits.
- When scheduling changes are requested, call propose_schedule so the user reviews and confirms before events are saved.
- Distinguish facts, assumptions, predictions, and recommendations when analyzing decisions.`;
}

function normalizePriority(val: unknown): Priority {
  const s = String(val || 'medium').toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s;
  return 'medium';
}

function normalizeCategory(val: unknown): CalendarCategory {
  const s = String(val || 'focus').toLowerCase();
  if (['focus', 'study', 'work', 'personal', 'health', 'break', 'meeting'].includes(s)) {
    return s as CalendarCategory;
  }
  return 'focus';
}

function normalizeDomain(val: unknown): GoalDomain {
  const valid: GoalDomain[] = [
    'Education',
    'Career',
    'Financial planning',
    'Personal development',
    'Health and wellness',
    'Relationships',
    'Creative projects',
    'Daily responsibilities',
  ];
  const match = valid.find((d) => d.toLowerCase() === String(val || '').toLowerCase());
  return match ?? 'Personal development';
}

export async function runClarityCoreChat(
  userMessage: string,
  currentState: ClarityAppState
): Promise<{
  state: ClarityAppState;
  assistantMessage: ChatMessage;
  aiConfigured: boolean;
}> {
  const ai = getGeminiClient();
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  let workingState = { ...currentState };
  const toolExecutions: AgentToolExecution[] = [];
  let attachedProposal: ScheduleProposal | undefined;

  const recentTurns = currentState.chatHistory.slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const firstResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [...recentTurns, { role: 'user', parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: buildSystemContextSummary(workingState),
      tools: [{ functionDeclarations: clarityToolDeclarations }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const functionCalls = firstResponse.functionCalls ?? [];
  const functionResponses: Array<{
    id?: string;
    name: string;
    response: Record<string, unknown>;
  }> = [];

  for (const call of functionCalls) {
    const args = (call.args ?? {}) as Record<string, unknown>;
    if (call.name === 'propose_schedule') {
      const reqText = String(args.requestText || userMessage);
      const startHour = Number(workingState.profile.preferredWorkingHours.start.split(':')[0] || 8);
      const endHour = Number(workingState.profile.preferredWorkingHours.end.split(':')[0] || 20);
      const proposal = buildProposedSchedule(
        reqText,
        today,
        workingState.events,
        { workStartHour: startHour, workEndHour: Math.max(startHour + 4, endHour) }
      );
      attachedProposal = proposal;
      toolExecutions.push({
        agentId: 'calendar',
        agentName: 'Calendar & Scheduling Agent',
        toolName: 'propose_schedule',
        summary: `Prepared ${proposal.proposedEvents.length} conflict-checked blocks for ${proposal.targetDate} (awaiting confirmation).`,
        timestamp: nowIso,
      });
      functionResponses.push({
        id: call.id,
        name: call.name,
        response: { proposal },
      });
    } else if (call.name === 'create_task') {
      const title = String(args.title || 'New Task').trim();
      const priority = normalizePriority(args.priority);
      const dueDate = String(args.dueDate || today);
      const estimatedMinutes = Number(args.estimatedMinutes || 45);
      const category = normalizeCategory(args.category);
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        title,
        priority,
        status: 'todo' as const,
        dueDate,
        estimatedMinutes,
        category,
        createdAt: nowIso,
      };
      workingState = {
        ...workingState,
        tasks: [newTask, ...workingState.tasks],
      };
      workingState = appendAudit(workingState, 'Productivity Agent', 'Created task', title);
      toolExecutions.push({
        agentId: 'productivity',
        agentName: 'Productivity Agent',
        toolName: 'create_task',
        summary: `Added "${title}" (${priority} priority, ${estimatedMinutes}m).`,
        timestamp: nowIso,
      });
      functionResponses.push({
        id: call.id,
        name: call.name,
        response: { created: newTask },
      });
    } else if (call.name === 'log_energy_stress') {
      const energyLevel = Math.max(1, Math.min(10, Math.round(Number(args.energyLevel || 6))));
      const stressLevel = Math.max(1, Math.min(10, Math.round(Number(args.stressLevel || 5))));
      const note = String(args.note || 'Logged via CLARITY CORE');
      const entry = {
        id: `en_${Date.now()}`,
        timestamp: nowIso,
        energyLevel,
        stressLevel,
        focusClarity: Math.max(1, Math.min(10, Math.round((energyLevel + (10 - stressLevel)) / 2))),
        note,
      };
      workingState = {
        ...workingState,
        energyLogs: [entry, ...workingState.energyLogs],
      };
      const assessment = analyzeWorkloadAndEnergy(workingState.events, workingState.tasks, workingState.energyLogs, today);
      workingState = appendAudit(
        workingState,
        'Stress & Energy Agent',
        'Logged energy & stress',
        `Energy ${energyLevel}/10, Stress ${stressLevel}/10 (${assessment.statusLabel})`
      );
      toolExecutions.push({
        agentId: 'stress',
        agentName: 'Stress & Energy Agent',
        toolName: 'log_energy_stress',
        summary: `Recorded Energy ${energyLevel}/10 · Stress ${stressLevel}/10 (${assessment.statusLabel}).`,
        timestamp: nowIso,
      });
      functionResponses.push({
        id: call.id,
        name: call.name,
        response: { entry, assessment },
      });
    } else if (call.name === 'create_goal_plan') {
      const title = String(args.title || 'Personal Goal');
      const domain = normalizeDomain(args.domain);
      const description = String(args.description || '');
      const milestoneTitles = Array.isArray(args.milestones) ? args.milestones.map(String) : ['Define initial step'];
      const newGoal = {
        id: `goal_${Date.now()}`,
        title,
        domain,
        description,
        targetDate: resolveTargetDate('next week', today),
        priority: 'high' as const,
        progress: 0,
        milestones: milestoneTitles.map((m, idx) => ({
          id: `ms_${Date.now()}_${idx}`,
          title: m,
          completed: false,
          dueDate: resolveTargetDate('next week', today),
        })),
        aiRecommendations: ['Break milestone 1 into a 45-minute scheduled block this week.'],
      };
      workingState = {
        ...workingState,
        goals: [newGoal, ...workingState.goals],
      };
      workingState = appendAudit(workingState, 'CLARITY CORE', 'Created life goal', `${title} (${domain})`);
      toolExecutions.push({
        agentId: 'productivity',
        agentName: 'Productivity Agent',
        toolName: 'create_goal_plan',
        summary: `Created "${title}" in ${domain} with ${newGoal.milestones.length} milestones.`,
        timestamp: nowIso,
      });
      functionResponses.push({
        id: call.id,
        name: call.name,
        response: { goal: newGoal },
      });
    } else if (call.name === 'remember_preference') {
      const key = String(args.key || 'Preference');
      const value = String(args.value || '');
      const category = (['Working Hours', 'Goal', 'Routine', 'Preference', 'Project', 'Communication'].includes(
        String(args.category)
      )
        ? String(args.category)
        : 'Preference') as ClarityAppState['memories'][number]['category'];
      const mem = {
        id: `mem_${Date.now()}`,
        category,
        key,
        value,
        approvedAt: nowIso,
        source: 'CLARITY CORE conversation',
      };
      workingState = {
        ...workingState,
        memories: [mem, ...workingState.memories],
      };
      workingState = appendAudit(workingState, 'AI Memory', 'Saved user preference', `${key}: ${value}`);
      toolExecutions.push({
        agentId: 'digital',
        agentName: 'CLARITY Memory',
        toolName: 'remember_preference',
        summary: `Saved "${key}" to personal AI memory.`,
        timestamp: nowIso,
      });
      functionResponses.push({
        id: call.id,
        name: call.name,
        response: { saved: mem },
      });
    }
  }

  let finalText = firstResponse.text ?? '';
  if (functionCalls.length > 0 && firstResponse.candidates?.[0]?.content) {
    const secondResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        ...recentTurns,
        { role: 'user', parts: [{ text: userMessage }] },
        firstResponse.candidates[0].content,
        {
          role: 'user',
          parts: functionResponses.map((fr) => ({
            functionResponse: {
              id: fr.id,
              name: fr.name,
              response: fr.response,
            },
          })),
        },
      ],
      config: {
        systemInstruction: buildSystemContextSummary(workingState),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    finalText = secondResponse.text ?? finalText;
  }

  const userMsg: ChatMessage = {
    id: `msg_u_${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: nowIso,
  };

  const assistantMessage: ChatMessage = {
    id: `msg_a_${Date.now() + 1}`,
    role: 'assistant',
    content: finalText.trim() || 'Action completed. Review the updated panels in your workspace.',
    timestamp: nowIso,
    reasoning:
      toolExecutions.length > 0
        ? `Coordinated ${toolExecutions.map((t) => t.agentName).join(', ')} based on your live state.`
        : 'Synthesized personal context, schedule, and priorities directly.',
    toolExecutions,
    proposedSchedule: attachedProposal,
  };

  workingState = {
    ...workingState,
    chatHistory: [...workingState.chatHistory, userMsg, assistantMessage].slice(-40),
  };

  return {
    state: workingState,
    assistantMessage,
    aiConfigured: true,
  };
}

export async function runDecisionIntelligenceAgent(
  title: string,
  context: string,
  state: ClarityAppState
): Promise<DecisionAnalysis> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Analyze this decision thoughtfully for ${state.profile.name}:
Decision Title: ${title}
Additional Context: ${context || 'Evaluate options, trade-offs, short/long-term impacts, and uncertainty.'}

Strictly distinguish between verified facts from the prompt, assumptions made, predictions, and actionable recommendations.`,
    config: {
      systemInstruction:
        'You are the Decision Intelligence Agent inside CLARITY. Output rigorous, balanced, transparent decision structures. Always leave final agency to the user.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          problemDefinition: { type: Type.STRING },
          facts: { type: Type.ARRAY, items: { type: Type.STRING } },
          assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          predictions: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
          uncertaintyNotes: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                risks: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                shortTermConsequences: { type: Type.STRING },
                longTermConsequences: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER },
                estimatedEffort: { type: Type.STRING },
              },
              required: [
                'name',
                'pros',
                'cons',
                'risks',
                'opportunities',
                'shortTermConsequences',
                'longTermConsequences',
                'confidenceScore',
                'estimatedEffort',
              ],
            },
          },
        },
        required: [
          'problemDefinition',
          'facts',
          'assumptions',
          'predictions',
          'recommendations',
          'missingInformation',
          'uncertaintyNotes',
          'options',
        ],
      },
    },
  });

  const raw = JSON.parse((response.text ?? '{}').trim()) as Omit<DecisionAnalysis, 'id' | 'title' | 'createdAt' | 'options'> & {
    options: Array<Omit<DecisionAnalysis['options'][number], 'id'>>;
  };

  return {
    id: `dec_${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    problemDefinition: raw.problemDefinition,
    facts: raw.facts ?? [],
    assumptions: raw.assumptions ?? [],
    predictions: raw.predictions ?? [],
    recommendations: raw.recommendations ?? [],
    missingInformation: raw.missingInformation ?? [],
    uncertaintyNotes: raw.uncertaintyNotes ?? '',
    options: (raw.options ?? []).map((opt, idx) => ({
      ...opt,
      id: `opt_${Date.now()}_${idx}`,
      confidenceScore: Math.max(10, Math.min(99, Math.round(Number(opt.confidenceScore || 70)))),
      estimatedEffort:
        opt.estimatedEffort === 'Low' || opt.estimatedEffort === 'High' ? opt.estimatedEffort : 'Moderate',
    })),
  };
}

export async function runSpecializedAgent(
  agentId: AgentId,
  input: string,
  state: ClarityAppState
): Promise<{
  agentId: AgentId;
  headline: string;
  guidance: string[];
  structuredActions: Array<{ label: string; detail: string }>;
  cautionNote?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const agentRoles: Record<AgentId, string> = {
    decision: 'Decision Intelligence Agent: break down choices, compare risks/opportunities, identify missing info.',
    productivity: 'Productivity Agent: decompose projects into realistic tasks, prioritize deadlines, detect overload.',
    calendar: 'Calendar & Scheduling Agent: find optimal work windows, protect breaks, avoid overbooking.',
    stress:
      'Stress & Energy Agent: review workload patterns, suggest non-medical recovery pauses and pacing. Never make medical diagnoses.',
    learning: 'Learning Agent: design study plans, active recall quizzes, and spaced revision schedules.',
    relationship:
      'Relationship & Communication Agent: clarify communication dynamics, surface boundary opportunities, draft respectful phrasing.',
    digital:
      'Digital Environment Agent: evaluate screen habits, reduce context-switching distractions, propose healthier digital routines.',
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `User context: ${buildSystemContextSummary(state)}\n\nUser request for ${agentId} agent: ${input}`,
    config: {
      systemInstruction: `You are the ${agentRoles[agentId]} Respond in clear, respectful, structured JSON.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          guidance: { type: Type.ARRAY, items: { type: Type.STRING } },
          structuredActions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                detail: { type: Type.STRING },
              },
              required: ['label', 'detail'],
            },
          },
          cautionNote: { type: Type.STRING },
        },
        required: ['headline', 'guidance', 'structuredActions'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    headline: string;
    guidance: string[];
    structuredActions: Array<{ label: string; detail: string }>;
    cautionNote?: string;
  };

  return {
    agentId,
    headline: parsed.headline || 'Analysis complete',
    guidance: parsed.guidance ?? [],
    structuredActions: parsed.structuredActions ?? [],
    cautionNote: parsed.cautionNote,
  };
}

export async function generateLiveDailyBriefing(state: ClarityAppState): Promise<ClarityAppState['dailyBriefing']> {
  const ai = getGeminiClient();
  const today = new Date().toISOString().slice(0, 10);
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a concise morning/evening intelligence briefing based on:\n${buildSystemContextSummary(state)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          summary: { type: Type.STRING },
          focusRecommendation: { type: Type.STRING },
        },
        required: ['headline', 'summary', 'focusRecommendation'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    headline: string;
    summary: string;
    focusRecommendation: string;
  };

  return {
    date: today,
    headline: parsed.headline,
    summary: parsed.summary,
    focusRecommendation: parsed.focusRecommendation,
    generatedBy: 'gemini',
  };
}
