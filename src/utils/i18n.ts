import type { LanguageCode } from '../types/clarity';

export const UI_COPY: Record<
  LanguageCode,
  {
    nav: {
      home: string;
      assistant: string;
      agents: string;
      calendar: string;
      tasks: string;
      decisions: string;
      projects: string;
      goals: string;
      insights: string;
      settings: string;
    };
    welcomePrefix: string;
    quickCommandPlaceholder: string;
    executeCommand: string;
    dailyBriefingTitle: string;
    todaysSchedule: string;
    priorityTasks: string;
    activeAgents: string;
    energyWorkload: string;
  }
> = {
  en: {
    nav: {
      home: 'Home',
      assistant: 'AI Assistant',
      agents: 'AI Agents',
      calendar: 'Calendar',
      tasks: 'Tasks',
      decisions: 'Decisions',
      projects: 'Projects',
      goals: 'Goals',
      insights: 'Insights',
      settings: 'Settings',
    },
    welcomePrefix: 'Good evening',
    quickCommandPlaceholder: 'Ask CLARITY CORE to plan tomorrow, analyze a decision, or organize tasks...',
    executeCommand: 'Send to CLARITY CORE',
    dailyBriefingTitle: 'Daily Intelligence Briefing',
    todaysSchedule: "Today's Schedule",
    priorityTasks: 'Daily Priorities',
    activeAgents: 'Specialized Agents',
    energyWorkload: 'Energy & Workload',
  },
  es: {
    nav: {
      home: 'Inicio',
      assistant: 'Asistente IA',
      agents: 'Agentes IA',
      calendar: 'Calendario',
      tasks: 'Tareas',
      decisions: 'Decisiones',
      projects: 'Proyectos',
      goals: 'Metas',
      insights: 'Analíticas',
      settings: 'Ajustes',
    },
    welcomePrefix: 'Bienvenido',
    quickCommandPlaceholder: 'Pide a CLARITY CORE planificar mañana, analizar una decisión u organizar tareas...',
    executeCommand: 'Enviar a CLARITY CORE',
    dailyBriefingTitle: 'Resumen Diario de Inteligencia',
    todaysSchedule: 'Agenda de Hoy',
    priorityTasks: 'Prioridades Diarias',
    activeAgents: 'Agentes Especializados',
    energyWorkload: 'Energía y Carga',
  },
  fr: {
    nav: {
      home: 'Accueil',
      assistant: 'Assistant IA',
      agents: 'Agents IA',
      calendar: 'Calendrier',
      tasks: 'Tâches',
      decisions: 'Décisions',
      projects: 'Projets',
      goals: 'Objectifs',
      insights: 'Analyses',
      settings: 'Paramètres',
    },
    welcomePrefix: 'Bonsoir',
    quickCommandPlaceholder: 'Demandez à CLARITY CORE de planifier demain, analyser un choix ou trier vos tâches...',
    executeCommand: 'Envoyer à CLARITY CORE',
    dailyBriefingTitle: 'Synthèse Quotidienne',
    todaysSchedule: "Programme du Jour",
    priorityTasks: 'Priorités du Jour',
    activeAgents: 'Agents Spécialisés',
    energyWorkload: 'Énergie & Charge',
  },
};
