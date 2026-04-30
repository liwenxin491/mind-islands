// Mind Islands Type Definitions

export type CharacterMood = 'happy' | 'neutral' | 'tired';

export type CharacterType = 'otter';

export type IslandType = 'body' | 'work' | 'learning' | 'relationships' | 'curiosity' | 'compassion';

export interface Island {
  id: IslandType;
  name: string;
  icon: string;
  color: string;
  description: string;
  streak: number;
  completedToday: boolean;
  lastInteraction?: string;
}

// Body & Health Island - Calendar Check-in
export interface HealthCheckIn {
  id: string;
  date: string; // ISO date
  sleepTime?: string; // "23:00"
  wakeTime?: string; // "07:00"
  workoutCompleted: boolean;
  workoutType?: string; // "Running", "Yoga", etc.
  workoutDuration?: number; // minutes
  workoutTime?: string; // "18:30"
  workoutIntensity?: 'light' | 'moderate' | 'intense';
  ateMealsOnTime?: boolean;
  mealNotes?: string;
  energyLevel: number; // 1-5
  notes?: string;
  estimatedFields?: string[]; // Fields inferred by AI
}

// Work Island - Pipeline Board
export type WorkStage = 'planned' | 'applied' | 'waiting' | 'interview' | 'outcome';

export interface WorkItem {
  id: string;
  title: string;
  stage: WorkStage;
  dateAdded: string;
  dateModified: string;
  notes?: string;
}

export interface WorkDailyLog {
  id: string;
  date: string;
  progressStep?: string; // "Applied to 3 positions"
  stressLevel: number; // 1-5
  todaysWin?: string;
}

export type GoalCheckInMode = 'fixed' | 'progress';
export type GoalCadence = 'daily' | 'weekly' | 'custom';

export interface GoalCheckInRecord {
  id: string;
  createdAt: string;
}

export interface WorkGoal {
  id: string;
  text: string; // "Land internship in UX design"
  targetDate?: string;
  checkInMode: GoalCheckInMode;
  cadence: GoalCadence;
  cadenceInterval: number;
  progressPercent: number;
  progressCheckInThreshold: number;
  checkIns: GoalCheckInRecord[];
  targetValue?: number;
  unitLabel?: string;
}

// Learning Island - Milestone Tracker
export interface LearningGoal {
  id: string;
  ultimateGoal: string; // "Master Python programming"
  targetDate?: string;
  weeklyMilestones: WeeklyMilestone[];
  checkInMode: GoalCheckInMode;
  cadence: GoalCadence;
  cadenceInterval: number;
  progressPercent: number;
  progressCheckInThreshold: number;
  checkIns: GoalCheckInRecord[];
  targetValue?: number;
  unitLabel?: string;
}

export interface WeeklyMilestone {
  id: string;
  week: string; // ISO week start date
  goal: string;
  completed: boolean;
}

export interface LearningDailyLog {
  id: string;
  date: string;
  focusedStudyMinutes: number;
  whatILearned: string;
  resources?: string[];
}

// Relationships Island - Connection Quality
export interface RelationshipLog {
  id: string;
  date: string;
  category: 'friendship' | 'family' | 'partner' | 'colleagues' | 'other';
  connectedToday: boolean;
  interactionType?: 'message' | 'call' | 'in-person';
  personName?: string;
  emotionalResult: number; // 1-5: How you felt after the interaction
  momentNote?: string; // One-line log
  gratitudeNote?: string; // Optional appreciation line
}

export interface RelationshipCategory {
  id: 'friendship' | 'family' | 'partner' | 'colleagues' | 'other';
  name: string;
  icon: string;
  color: string;
  description: string;
}

// Curiosity Island - New Discovery Cards
export interface CuriosityLog {
  id: string;
  date: string;
  newThingNoticed: string;
  newSkillOrFact?: string;
  photoUrl?: string;
  tags?: string[];
}

export interface CuriosityIdea {
  id: string;
  date: string;
  title: string;
  content: string;
  tags?: string[];
  status?: 'active' | 'archived';
  summary?: string;
  concludedAt?: string;
  lastDiscussedAt?: string;
  conversation?: CuriosityConversationMessage[];
}

export interface CuriosityConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Self-Compassion Island - Reflection & Support
export interface CompassionJournal {
  id: string;
  date: string;
  reflectionPrompt?: string;
  journalEntry: string;
  mood?: number; // 1-5
}

export interface BreathingSession {
  id: string;
  date: string;
  duration: number; // seconds
  type: 'box-breathing' | 'deep-breathing' | '4-7-8';
}

// Chat & AI Support
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Character System
export interface CharacterState {
  mood: CharacterMood;
  name: string;
  type: CharacterType;
  level: number;
  experience: number;
  environmentState: EnvironmentState;
}

export interface EnvironmentState {
  lightLevel: number; // 0-100
  decorations: string[]; // ["flowers", "lanterns", etc.]
  weather: 'clear' | 'cloudy' | 'starry' | 'rainy';
  specialEffects: string[]; // ["glow", "sparkles", etc.]
}

// Routine / Reminder Settings
export interface WorkoutScheduleItem {
  id: string;
  dayOfWeek: number; // 0-6, Sunday = 0
  enabled: boolean;
  time: string; // "18:30"
  label?: string;
}

export interface RoutineSettings {
  timeZone: string; // IANA timezone, e.g. "America/Los_Angeles"
  sleepTargetTime: string; // "23:30"
  wakeTargetTime: string; // "07:30"
  mealTimes: {
    breakfast: string; // "08:00"
    lunch: string; // "12:30"
    dinner: string; // "19:00"
  };
  workoutSchedule: WorkoutScheduleItem[];
  reminderLeadMinutes: number; // trigger reminder earlier than target
  avatarRemindersEnabled: boolean;
}

// AI extraction result used by local logging workflow
export interface AIInsightPayload {
  assistantReply: string;
  confidence: number;
  detectedIslands: IslandType[];
  needsFollowup: boolean;
  followupQuestion?: string;
  todos?: Array<{
    text: string;
    details?: string;
    deadline?: string;
    remindAt?: string;
    estimatedMinutes?: number;
    importance?: number; // 1-5 optional hint from AI
    islandId?: IslandType;
  }>;
  entries: {
    body?: Partial<Omit<HealthCheckIn, 'id' | 'date'>>;
    work?: Partial<Omit<WorkDailyLog, 'id' | 'date'>>;
    learning?: Partial<Omit<LearningDailyLog, 'id' | 'date'>> & { focusedStudyMinutes?: number };
    relationships?: Partial<Omit<RelationshipLog, 'id' | 'date'>>;
    curiosity?: Partial<Omit<CuriosityLog, 'id' | 'date'>>;
    compassion?: Partial<Omit<CompassionJournal, 'id' | 'date'>>;
  };
}

// General Todo & Reminders
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  details?: string;
  deadline?: string;
  remindAt?: string;
  estimatedMinutes?: number;
  importance?: number; // 1-5 optional AI/user signal
  priorityScore: number; // 0-100
  priorityLabel: 'high' | 'medium' | 'low';
  priorityReason?: string;
  islandId?: IslandType;
}

export interface Reminder {
  id: string;
  text: string;
  deadline: string;
  islandId?: IslandType;
}

// Complete User Progress
export interface UserProgress {
  character: CharacterState;
  islands: Island[];
  routineSettings: RoutineSettings;
  
  // Island-specific data
  healthCheckIns: HealthCheckIn[];
  workItems: WorkItem[];
  workDailyLogs: WorkDailyLog[];
  workGoals: WorkGoal[];
  learningGoals: LearningGoal[];
  learningDailyLogs: LearningDailyLog[];
  relationshipLogs: RelationshipLog[];
  curiosityLogs: CuriosityLog[];
  curiosityIdeas: CuriosityIdea[];
  compassionJournals: CompassionJournal[];
  breathingSessions: BreathingSession[];
  
  // General
  todos: TodoItem[];
  reminders: Reminder[];
  chatHistory: ChatMessage[];
  
  // Onboarding
  onboardingComplete: boolean;
}

// Weekly Summary
export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalCheckIns: number;
  islandProgress: Record<IslandType, number>; // streak or count
  characterMoodAverage: number;
  highlights: string[];
  encouragement: string;
}
