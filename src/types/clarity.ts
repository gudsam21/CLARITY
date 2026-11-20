export type NavSection =
  | 'home'
  | 'assistant'
  | 'agents'
  | 'calendar'
  | 'tasks'
  | 'decisions'
  | 'projects'
  | 'goals'
  | 'insights'
  | 'settings';

export type ThemeMode = 'dark' | 'light';
export type InterfaceMode = 'beginner' | 'advanced';
export type TextSize = 'compact' | 'comfortable' | 'large';
export type LanguageCode = 'en' | 'es' | 'fr';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type CalendarCategory =
  | 'focus'
  | 'study'
  | 'work'
  | 'personal'
  | 'health'
  | 'break'
  | 'meeting';

export type GoalDomain =
  | 'Education'
  | 'Career'
  | 'Financial planning'
  | 'Personal development'
  | 'Health and wellness'
  | 'Relationships'
  | 'Creative projects'
  | 'Daily responsibilities';

export type AgentId =
  | 'decision'
  | 'productivity'
  | 'calendar'
  | 'stress'
  | 'learning'
  | 'relationship'
  | 'digital';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  avatarUrl: string;
  onboarded: boolean;
  preferredWorkingHours: {
    start: string; // e.g. "08:30"
    end: string; // e.g. "18:00"
  };
  communicationStyle: 'concise' | 'balanced' | 'detailed';
}

export interface AccessibilitySettings {
  theme: ThemeMode;
  interfaceMode: InterfaceMode;
  textSize: TextSize;
  language: LanguageCode;
  gamificationEnabled: boolean;
  notificationFrequency: 'minimal' | 'balanced' | 'proactive';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  googleCalendarConnected: boolean;
  emailDigestConnected: boolean;
}

export interface MemoryItem {
  id: string;
  category: 'Working Hours' | 'Goal' | 'Routine' | 'Preference' | 'Project' | 'Communication';
  key: string;
  value: string;
  approvedAt: string;
  source: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes: number;
  projectId?: string;
  goalId?: string;
  category: CalendarCategory;
  createdAt: string;
  completedAt?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'planning' | 'completed';
  targetDate: string;
  progress: number; // 0-100
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: CalendarCategory;
  priority: Priority;
  recurring?: 'none' | 'daily' | 'weekly';
  notes?: string;
  source?: 'manual' | 'clarity_scheduler' | 'google_sync';
}

export interface ProposedEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: CalendarCategory;
  priority: Priority;
  reason: string;
}

export interface ScheduleProposal {
  id: string;
  prompt: string;
  targetDate: string;
  summary: string;
  conflictsDetected: string[];
  proposedEvents: ProposedEvent[];
  status: 'pending' | 'approved' | 'dismissed';
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

export interface GoalItem {
  id: string;
  title: string;
  domain: GoalDomain;
  description: string;
  targetDate: string;
  priority: Priority;
  progress: number;
  milestones: GoalMilestone[];
  aiRecommendations: string[];
}

export interface DecisionOption {
  id: string;
  name: string;
  pros: string[];
  cons: string[];
  risks: string[];
  opportunities: string[];
  shortTermConsequences: string;
  longTermConsequences: string;
  confidenceScore: number; // 0-100
  estimatedEffort: 'Low' | 'Moderate' | 'High';
}

export interface DecisionAnalysis {
  id: string;
  title: string;
  problemDefinition: string;
  createdAt: string;
  facts: string[];
  assumptions: string[];
  predictions: string[];
  recommendations: string[];
  missingInformation: string[];
  options: DecisionOption[];
  selectedOptionId?: string;
  uncertaintyNotes: string;
}

export interface EnergyStressLog {
  id: string;
  timestamp: string;
  energyLevel: number; // 1-10
  stressLevel: number; // 1-10
  focusClarity: number; // 1-10
  note: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'deadline' | 'conflict' | 'briefing' | 'insight';
  timestamp: string;
  read: boolean;
  actionSection?: NavSection;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
}

export interface AgentToolExecution {
  agentId: AgentId;
  agentName: string;
  toolName: string;
  summary: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: string;
  toolExecutions?: AgentToolExecution[];
  proposedSchedule?: ScheduleProposal;
  isSimulated?: boolean;
}

export interface GamificationState {
  xp: number;
  completedDates: string[];
  unlockedBadgeIds: string[];
  dailyChallengeCompleted: boolean;
  weeklyMissionProgress: number;
  weeklyMissionTarget: number;
}

export interface ClarityAppState {
  profile: UserProfile;
  settings: AccessibilitySettings;
  memories: MemoryItem[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  events: CalendarEvent[];
  goals: GoalItem[];
  decisions: DecisionAnalysis[];
  energyLogs: EnergyStressLog[];
  notifications: NotificationItem[];
  auditLog: AuditLogEntry[];
  gamification: GamificationState;
  chatHistory: ChatMessage[];
  dailyBriefing: {
    date: string;
    headline: string;
    summary: string;
    focusRecommendation: string;
    generatedBy: 'gemini' | 'local';
  };
  learningTracks: {
    id: string;
    subject: string;
    modules: { id: string; title: string; durationMins: number; completed: boolean }[];
    nextRevisionDate: string;
  }[];
  digitalHabits: {
    focusHoursToday: number;
    distractionMinutesToday: number;
    topDistractions: string[];
    eveningWindDownTime: string;
  };
}
