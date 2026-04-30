import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  AIInsightPayload,
  BreathingSession,
  CharacterMood,
  CompassionJournal,
  CuriosityIdea,
  CuriosityLog,
  EnvironmentState,
  HealthCheckIn,
  IslandType,
  LearningDailyLog,
  LearningGoal,
  RelationshipLog,
  RoutineSettings,
  TodoItem,
  UserProgress,
  WorkDailyLog,
  WorkGoal,
  WorkItem,
} from '../types';
import type { ChatMessage } from '../types';
import { getAppTimeZone, getDateKey, getNowInAppTimeZoneISO, setAppTimeZone } from '../lib/time';
import { useAuth } from './AuthContext';

interface MindIslandsContextType {
  progress: UserProgress;

  // Character
  updateCharacterMood: (mood: CharacterMood) => void;
  selectCharacter: (name: string) => void;
  completeOnboarding: () => void;

  // Islands
  updateIslandStreak: (islandId: IslandType) => void;

  // Routine
  updateRoutineSettings: (updates: Partial<RoutineSettings>) => void;

  // Body & Health
  addHealthCheckIn: (checkIn: Omit<HealthCheckIn, 'id'>) => void;
  updateHealthCheckIn: (id: string, checkIn: Partial<HealthCheckIn>) => void;
  deleteHealthCheckIn: (id: string) => void;

  // Work
  addWorkItem: (item: Omit<WorkItem, 'id' | 'dateAdded' | 'dateModified'>) => void;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  addWorkDailyLog: (log: Omit<WorkDailyLog, 'id'>) => void;
  updateWorkDailyLog: (id: string, updates: Partial<WorkDailyLog>) => void;
  deleteWorkDailyLog: (id: string) => void;
  addWorkGoal: (goal: Omit<WorkGoal, 'id'>) => void;
  updateWorkGoal: (id: string, updates: Partial<Omit<WorkGoal, 'id'>>) => void;
  deleteWorkGoal: (id: string) => void;
  addWorkGoalCheckIn: (id: string) => void;

  // Learning
  addLearningGoal: (goal: Omit<LearningGoal, 'id'>) => void;
  updateLearningGoal: (id: string, updates: Partial<Omit<LearningGoal, 'id'>>) => void;
  deleteLearningGoal: (id: string) => void;
  addLearningGoalCheckIn: (id: string) => void;
  addLearningDailyLog: (log: Omit<LearningDailyLog, 'id'>) => void;
  updateLearningDailyLog: (id: string, updates: Partial<LearningDailyLog>) => void;
  deleteLearningDailyLog: (id: string) => void;
  updateWeeklyMilestone: (goalId: string, milestoneId: string, completed: boolean) => void;

  // Relationships
  addRelationshipLog: (log: Omit<RelationshipLog, 'id'>) => void;
  updateRelationshipLog: (id: string, updates: Partial<RelationshipLog>) => void;
  deleteRelationshipLog: (id: string) => void;

  // Curiosity
  addCuriosityLog: (log: Omit<CuriosityLog, 'id'>) => void;
  updateCuriosityLog: (id: string, updates: Partial<CuriosityLog>) => void;
  deleteCuriosityLog: (id: string) => void;
  addCuriosityIdea: (idea: Omit<CuriosityIdea, 'id'>) => void;
  updateCuriosityIdea: (id: string, updates: Partial<CuriosityIdea>) => void;
  deleteCuriosityIdea: (id: string) => void;

  // Self-Compassion
  addCompassionJournal: (journal: Omit<CompassionJournal, 'id'>) => void;
  updateCompassionJournal: (id: string, updates: Partial<CompassionJournal>) => void;
  deleteCompassionJournal: (id: string) => void;
  addBreathingSession: (session: Omit<BreathingSession, 'id'>) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  // AI structured logging
  applyAIInsights: (
    insight: AIInsightPayload,
    sourceMessage?: string,
  ) => { islands: IslandType[]; todosAdded: number };

  // General
  addTodo: (
    todo: Omit<TodoItem, 'id' | 'priorityScore' | 'priorityLabel' | 'priorityReason'>,
  ) => void;
  updateTodo: (
    todoId: string,
    updates: Partial<Omit<TodoItem, 'id' | 'priorityScore' | 'priorityLabel' | 'priorityReason'>>,
  ) => void;
  setTodoImportance: (todoId: string, importance: number) => void;
  toggleTodo: (todoId: string) => void;
  deleteTodo: (todoId: string) => void;
  cleanupCompletedTodos: (olderThanDays: number) => number;
}

const MindIslandsContext = createContext<MindIslandsContextType | undefined>(undefined);

const getTodayISO = () => getDateKey();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeTime = (value?: string) =>
  value && /^\d{1,2}:\d{2}$/.test(value) ? value.padStart(5, '0') : undefined;
const normalizeDateTime = (value?: string) => {
  if (!value) return undefined;
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return undefined;
  return dt.toISOString();
};
const polishLogText = (value?: string) => {
  const raw = (value || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  if (!/[A-Za-z]/.test(raw)) return raw;
  const withPronoun = raw.replace(/\bi\b/g, 'I');
  const normalized = withPronoun.charAt(0).toUpperCase() + withPronoun.slice(1);
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
};
const appendUniqueSentence = (existing: string | undefined, addition: string) => {
  const base = (existing || '').trim();
  const next = polishLogText(addition);
  if (!next) return base;
  if (!base) return next;
  if (base.includes(next)) return base;
  return `${base} ${next}`.trim();
};
const formatGoalTarget = (targetValue?: number, unitLabel?: string) => {
  if (!targetValue) return '';
  return `${targetValue} ${unitLabel?.trim() || 'units'}`;
};
const buildWorkGoalCheckInText = (goal: WorkGoal) => {
  const pieces = [`Checked in on "${goal.text}".`];
  const target = formatGoalTarget(goal.targetValue, goal.unitLabel);
  if (target) pieces.push(`Target: ${target}.`);
  pieces.push(`Overall progress is ${Math.round(goal.progressPercent)}%.`);
  if (goal.checkInMode === 'progress') {
    pieces.push(`This goal checks in every ${goal.progressCheckInThreshold}% progress.`);
  }
  return pieces.join(' ');
};
const buildLearningGoalCheckInText = (goal: LearningGoal) => {
  const pieces = [`Checked in on "${goal.ultimateGoal}".`];
  const target = formatGoalTarget(goal.targetValue, goal.unitLabel);
  if (target) pieces.push(`Target: ${target}.`);
  pieces.push(`Overall progress is ${Math.round(goal.progressPercent)}%.`);
  if (goal.checkInMode === 'progress') {
    pieces.push(`This goal checks in every ${goal.progressCheckInThreshold}% progress.`);
  }
  return pieces.join(' ');
};
const mergeText = (base?: string, incoming?: string) => {
  if (!base && !incoming) return '';
  if (!base) return incoming || '';
  if (!incoming) return base;
  if (base.includes(incoming)) return base;
  return `${base} | ${incoming}`;
};

const parseEstimatedMinutes = (text = '') => {
  const source = text.toLowerCase();
  const rangeHours = source.match(/(\d+(?:\.\d+)?)\s*(?:-|to|~|–)\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  if (rangeHours) {
    const avgHours = (Number(rangeHours[1]) + Number(rangeHours[2])) / 2;
    return Math.round(avgHours * 60);
  }
  const rangeMinutes = source.match(/(\d+)\s*(?:-|to|~|–)\s*(\d+)\s*(minutes?|mins?|m)\b/);
  if (rangeMinutes) {
    return Math.round((Number(rangeMinutes[1]) + Number(rangeMinutes[2])) / 2);
  }
  const zhRangeHours = text.match(/(\d+)\s*(?:到|至)\s*(\d+)\s*个?小时/);
  if (zhRangeHours) {
    return Math.round(((Number(zhRangeHours[1]) + Number(zhRangeHours[2])) / 2) * 60);
  }
  const singleHours = source.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  if (singleHours) return Math.round(Number(singleHours[1]) * 60);
  const zhHours = text.match(/(\d+(?:\.\d+)?)\s*个?小时/);
  if (zhHours) return Math.round(Number(zhHours[1]) * 60);
  const singleMinutes = source.match(/(\d+)\s*(minutes?|mins?|m)\b/);
  if (singleMinutes) return Number(singleMinutes[1]);
  const zhMinutes = text.match(/(\d+)\s*分钟/);
  if (zhMinutes) return Number(zhMinutes[1]);
  return undefined;
};

const inferMessageCount = (text = '') => {
  const source = text.toLowerCase();
  const en = source.match(/(\d+)\s*(messages?|msgs?)/);
  if (en) return Number(en[1]);
  const zh = text.match(/(\d+)\s*条消息/);
  if (zh) return Number(zh[1]);
  return 0;
};

const formatHoursDistance = (hours: number) => {
  if (!Number.isFinite(hours)) return '';
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes}m`;
  }
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  const days = hours / 24;
  if (days < 10) return `${Math.round(days * 10) / 10}d`;
  return `${Math.round(days)}d`;
};

const computeTodoPriority = (
  todo: Pick<TodoItem, 'text' | 'details' | 'deadline' | 'remindAt' | 'estimatedMinutes' | 'importance' | 'completed' | 'islandId'>,
) => {
  if (todo.completed) {
    return {
      priorityScore: 0,
      priorityLabel: 'low' as const,
      priorityReason: 'Completed',
    };
  }

  const now = new Date(getNowInAppTimeZoneISO());
  const textBlob = `${todo.text || ''} ${todo.details || ''}`;
  const reasons: string[] = [];
  let score = 0;

  if (todo.deadline) {
    const deadline = new Date(todo.deadline);
    if (Number.isFinite(deadline.getTime())) {
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft <= 0) {
        const overdueHours = Math.abs(hoursLeft);
        const overduePoints = 60 + Math.min(14, Math.round(Math.log1p(overdueHours) * 5));
        score += overduePoints;
        reasons.push(`Overdue by ${formatHoursDistance(overdueHours)}`);
      } else {
        // Continuous urgency curve:
        // 1) baseline progression over a 7-day window
        // 2) stronger boost when approaching the final hours
        const withinWeek = clamp((7 * 24 - hoursLeft) / (7 * 24), 0, 1);
        const nearDeadlineBoost = 1 / (1 + Math.exp((hoursLeft - 10) / 3.5));
        const deadlinePoints = 6 + withinWeek * 26 + nearDeadlineBoost * 24;
        score += deadlinePoints;
        reasons.push(`Due in ${formatHoursDistance(hoursLeft)}`);
      }
    }
  }

  if (todo.remindAt) {
    const remindAt = new Date(todo.remindAt);
    if (Number.isFinite(remindAt.getTime())) {
      const hoursToRemind = (remindAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToRemind >= 0) {
        const reminderWindow = clamp((24 - hoursToRemind) / 24, 0, 1);
        score += 2 + reminderWindow * 8;
        if (hoursToRemind <= 24) {
          reasons.push(`Reminder in ${formatHoursDistance(hoursToRemind)}`);
        }
      }
    }
  }

  const estimatedMinutes = todo.estimatedMinutes || parseEstimatedMinutes(textBlob);
  if (estimatedMinutes) {
    if (estimatedMinutes >= 180) {
      score += 18;
      reasons.push('High effort task');
    } else if (estimatedMinutes >= 120) {
      score += 14;
      reasons.push('Medium-high effort');
    } else if (estimatedMinutes >= 60) {
      score += 10;
      reasons.push('Needs focus block');
    } else {
      score += 4;
    }
  }

  const highImpactPattern =
    /\b(assignment|homework|exam|quiz|final|submission|deadline|due|interview|application|peer review|review)\b|作业|考试|截止|面试|投递|审核/i;
  if (highImpactPattern.test(textBlob)) {
    score += 12;
    reasons.push('High impact');
  }

  const msgCount = inferMessageCount(textBlob);
  if (msgCount >= 3) {
    score += 8;
    reasons.push(`Message backlog (${msgCount})`);
  }

  if (typeof todo.importance === 'number' && Number.isFinite(todo.importance)) {
    score += clamp(Math.round((todo.importance - 3) * 8), -8, 16);
    if (todo.importance >= 4) reasons.push('Marked important');
  }

  if (todo.islandId === 'work' || todo.islandId === 'learning') {
    score += 4;
  }

  const priorityScore = clamp(Math.round(score), 0, 100);
  const priorityLabel = priorityScore >= 70 ? 'high' : priorityScore >= 40 ? 'medium' : 'low';
  const priorityReason = reasons.slice(0, 2).join(' • ') || 'General task';

  return { priorityScore, priorityLabel, priorityReason, estimatedMinutes };
};

const normalizeTodoRecord = (
  todo: Omit<TodoItem, 'priorityScore' | 'priorityLabel' | 'priorityReason'> & {
    priorityScore?: number;
    priorityLabel?: TodoItem['priorityLabel'];
    priorityReason?: string;
  },
) => {
  const text = (todo.text || '').trim();
  const details = todo.details?.trim() || undefined;
  const deadline = normalizeDateTime(todo.deadline);
  const remindAt = normalizeDateTime(todo.remindAt);
  const completedAt = normalizeDateTime(todo.completedAt);
  const estimatedMinutes =
    typeof todo.estimatedMinutes === 'number' && Number.isFinite(todo.estimatedMinutes)
      ? Math.max(5, Math.round(todo.estimatedMinutes))
      : parseEstimatedMinutes(`${text} ${details || ''}`);
  const importance =
    typeof todo.importance === 'number' && Number.isFinite(todo.importance)
      ? clamp(Math.round(todo.importance), 1, 5)
      : undefined;
  const computed = computeTodoPriority({
    text,
    details,
    deadline,
    remindAt,
    estimatedMinutes,
    importance,
    completed: Boolean(todo.completed),
    islandId: todo.islandId,
  });

  return {
    ...todo,
    text,
    details,
    deadline,
    remindAt,
    completedAt,
    estimatedMinutes: computed.estimatedMinutes,
    importance,
    priorityScore: computed.priorityScore,
    priorityLabel: computed.priorityLabel,
    priorityReason: computed.priorityReason,
  } as TodoItem;
};

const createDefaultWorkoutSchedule = () =>
  Array.from({ length: 7 }).map((_, day) => ({
    id: `workout-${day}`,
    dayOfWeek: day,
    enabled: false,
    time: '18:30',
    label: '',
  }));

const createDefaultRoutineSettings = (): RoutineSettings => ({
  timeZone: getAppTimeZone(),
  sleepTargetTime: '23:30',
  wakeTargetTime: '07:30',
  mealTimes: {
    breakfast: '08:00',
    lunch: '12:30',
    dinner: '19:00',
  },
  workoutSchedule: createDefaultWorkoutSchedule(),
  reminderLeadMinutes: 30,
  avatarRemindersEnabled: true,
});

const getTotalEntries = (progress: UserProgress) =>
  progress.healthCheckIns.length +
  progress.workDailyLogs.length +
  progress.learningDailyLogs.length +
  progress.relationshipLogs.length +
  progress.curiosityLogs.length +
  progress.curiosityIdeas.length +
  progress.compassionJournals.length +
  progress.breathingSessions.length;

const getTodayActivitySet = (progress: UserProgress): Set<IslandType> => {
  const today = getTodayISO();
  const set = new Set<IslandType>();

  if (progress.healthCheckIns.some((item) => item.date === today)) set.add('body');
  if (progress.workDailyLogs.some((item) => item.date === today)) set.add('work');
  if (progress.learningDailyLogs.some((item) => item.date === today)) set.add('learning');
  if (progress.relationshipLogs.some((item) => item.date === today)) set.add('relationships');
  if (
    progress.curiosityLogs.some((item) => item.date === today) ||
    progress.curiosityIdeas.some((item) => item.date === today)
  ) {
    set.add('curiosity');
  }
  if (
    progress.compassionJournals.some((item) => item.date === today) ||
    progress.breathingSessions.some((item) => item.date === today)
  ) {
    set.add('compassion');
  }

  return set;
};

const dateKeyWithDelta = (dateKey: string, deltaDays: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getIslandDateSet = (progress: UserProgress, islandId: IslandType) => {
  switch (islandId) {
    case 'body':
      return new Set(progress.healthCheckIns.map((item) => item.date));
    case 'work':
      return new Set(progress.workDailyLogs.map((item) => item.date));
    case 'learning':
      return new Set(progress.learningDailyLogs.map((item) => item.date));
    case 'relationships':
      return new Set(progress.relationshipLogs.map((item) => item.date));
    case 'curiosity':
      return new Set([
        ...progress.curiosityLogs.map((item) => item.date),
        ...progress.curiosityIdeas.map((item) => item.date),
      ]);
    case 'compassion':
      return new Set([
        ...progress.compassionJournals.map((item) => item.date),
        ...progress.breathingSessions.map((item) => item.date),
      ]);
    default:
      return new Set<string>();
  }
};

const getActiveStreakFromToday = (dates: Set<string>, today: string) => {
  if (!dates.has(today)) return 0;
  let streak = 0;
  let cursor = today;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = dateKeyWithDelta(cursor, -1);
  }
  return streak;
};

const getTodayEmotionSignal = (progress: UserProgress, today: string) => {
  const journalMood = progress.compassionJournals
    .filter((item) => item.date === today && typeof item.mood === 'number')
    .map((item) => Number(item.mood));
  const energy = progress.healthCheckIns
    .filter((item) => item.date === today && typeof item.energyLevel === 'number')
    .map((item) => Number(item.energyLevel));
  const relationshipResult = progress.relationshipLogs
    .filter((item) => item.date === today && typeof item.emotionalResult === 'number')
    .map((item) => Number(item.emotionalResult));
  const workStress = progress.workDailyLogs
    .filter((item) => item.date === today && typeof item.stressLevel === 'number')
    .map((item) => Number(item.stressLevel));

  let signal = 0;
  if (journalMood.length > 0) {
    const avg = journalMood.reduce((sum, val) => sum + val, 0) / journalMood.length;
    signal += (avg - 3) * 0.75;
  }
  if (energy.length > 0) {
    const avg = energy.reduce((sum, val) => sum + val, 0) / energy.length;
    signal += (avg - 3) * 0.45;
  }
  if (relationshipResult.length > 0) {
    const avg = relationshipResult.reduce((sum, val) => sum + val, 0) / relationshipResult.length;
    signal += (avg - 3) * 0.4;
  }
  if (workStress.length > 0) {
    const avg = workStress.reduce((sum, val) => sum + val, 0) / workStress.length;
    signal += (3 - avg) * 0.4;
  }

  return clamp(signal, -2, 2);
};

const deriveCharacterMood = (
  activeIslandCount: number,
  hour: number,
  emotionSignal: number,
): CharacterMood => {
  if (hour >= 23 || hour < 6) return activeIslandCount >= 2 && emotionSignal > -0.5 ? 'neutral' : 'tired';
  if (emotionSignal <= -1.1) return 'tired';
  if (emotionSignal >= 1.1) return 'happy';
  if (hour >= 6 && hour < 11 && emotionSignal >= -0.2) return 'happy';
  if (activeIslandCount >= 3) return 'happy';
  if (activeIslandCount === 0 && hour >= 20) return 'tired';
  return 'neutral';
};

const deriveEnvironmentState = (
  mood: CharacterMood,
  activeIslandCount: number,
): EnvironmentState => {
  if (mood === 'happy') {
    return {
      lightLevel: 88,
      decorations: activeIslandCount >= 4 ? ['flowers', 'lanterns', 'trophy'] : ['flowers', 'lanterns'],
      weather: 'clear',
      specialEffects: ['glow', 'sparkles'],
    };
  }

  if (mood === 'tired') {
    return {
      lightLevel: 35,
      decorations: ['soft-clouds'],
      weather: 'cloudy',
      specialEffects: ['soft-rain'],
    };
  }

  return {
    lightLevel: 58,
    decorations: ['small-lantern'],
    weather: 'starry',
    specialEffects: ['ambient-glow'],
  };
};

const defaultProgress: UserProgress = {
  character: {
    mood: 'neutral',
    name: 'Me',
    type: 'otter',
    level: 1,
    experience: 0,
    environmentState: {
      lightLevel: 50,
      decorations: [],
      weather: 'starry',
      specialEffects: [],
    },
  },
  islands: [
    {
      id: 'body',
      name: 'Body & Health',
      icon: '🌿',
      color: '#10b981',
      description: 'Physical wellbeing and self-care',
      streak: 0,
      completedToday: false,
    },
    {
      id: 'work',
      name: 'Work',
      icon: '⚡',
      color: '#3b82f6',
      description: 'Professional growth and productivity',
      streak: 0,
      completedToday: false,
    },
    {
      id: 'learning',
      name: 'Learning',
      icon: '📚',
      color: '#a855f7',
      description: 'Knowledge and skill development',
      streak: 0,
      completedToday: false,
    },
    {
      id: 'relationships',
      name: 'Relationships',
      icon: '💝',
      color: '#ec4899',
      description: 'Connections and social wellbeing',
      streak: 0,
      completedToday: false,
    },
    {
      id: 'curiosity',
      name: 'Curiosity',
      icon: '✨',
      color: '#f59e0b',
      description: 'Exploration and new experiences',
      streak: 0,
      completedToday: false,
    },
    {
      id: 'compassion',
      name: 'Self Compassion',
      icon: '💗',
      color: '#f472b6',
      description: 'Kindness and acceptance toward yourself',
      streak: 0,
      completedToday: false,
    },
  ],
  routineSettings: createDefaultRoutineSettings(),
  healthCheckIns: [],
  workItems: [],
  workDailyLogs: [],
  workGoals: [],
  learningGoals: [],
  learningDailyLogs: [],
  relationshipLogs: [],
  curiosityLogs: [],
  curiosityIdeas: [],
  compassionJournals: [],
  breathingSessions: [],
  todos: [],
  reminders: [],
  chatHistory: [],
  onboardingComplete: false,
};

const mergeRoutineSettings = (parsedRoutine: any): RoutineSettings => {
  const defaults = createDefaultRoutineSettings();
  if (!parsedRoutine) return defaults;
  const routineTimeZone =
    typeof parsedRoutine.timeZone === 'string' &&
    parsedRoutine.timeZone.trim() &&
    (() => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone: parsedRoutine.timeZone }).format();
        return true;
      } catch {
        return false;
      }
    })()
      ? parsedRoutine.timeZone.trim()
      : defaults.timeZone;

  const incomingSchedule = Array.isArray(parsedRoutine.workoutSchedule)
    ? parsedRoutine.workoutSchedule
    : [];

  const mergedSchedule = defaults.workoutSchedule.map((defaultItem) => {
    const found = incomingSchedule.find((item: any) => item?.dayOfWeek === defaultItem.dayOfWeek);
    return found
      ? {
          ...defaultItem,
          ...found,
          id: found.id || defaultItem.id,
          dayOfWeek: defaultItem.dayOfWeek,
          time: normalizeTime(found.time) || defaultItem.time,
        }
      : defaultItem;
  });

  return {
    timeZone: routineTimeZone,
    sleepTargetTime: normalizeTime(parsedRoutine.sleepTargetTime) || defaults.sleepTargetTime,
    wakeTargetTime: normalizeTime(parsedRoutine.wakeTargetTime) || defaults.wakeTargetTime,
    mealTimes: {
      breakfast: normalizeTime(parsedRoutine?.mealTimes?.breakfast) || defaults.mealTimes.breakfast,
      lunch: normalizeTime(parsedRoutine?.mealTimes?.lunch) || defaults.mealTimes.lunch,
      dinner: normalizeTime(parsedRoutine?.mealTimes?.dinner) || defaults.mealTimes.dinner,
    },
    workoutSchedule: mergedSchedule,
    reminderLeadMinutes: clamp(Number(parsedRoutine.reminderLeadMinutes) || defaults.reminderLeadMinutes, 0, 180),
    avatarRemindersEnabled:
      typeof parsedRoutine.avatarRemindersEnabled === 'boolean'
        ? parsedRoutine.avatarRemindersEnabled
        : defaults.avatarRemindersEnabled,
  };
};

const LEGACY_STORAGE_KEY = 'mindIslandsProgress';
const userStorageKey = (userId: string) => `mindIslandsProgress:${userId}`;
const OFFLINE_MODE = import.meta.env.VITE_LOCAL_OFFLINE === 'true';

const normalizeGoalCheckIns = (checkIns: any[] | undefined) =>
  Array.isArray(checkIns)
    ? checkIns
        .map((checkIn) => ({
          id: checkIn?.id || Math.random().toString(36).slice(2),
          createdAt: normalizeDateTime(checkIn?.createdAt) || getNowInAppTimeZoneISO(),
        }))
        .filter((checkIn) => Boolean(checkIn.createdAt))
    : [];

const normalizeWorkGoalRecord = (goal: any): WorkGoal => ({
  id: goal?.id || Math.random().toString(36).slice(2),
  text: typeof goal?.text === 'string' ? goal.text : '',
  targetDate: goal?.targetDate,
  checkInMode: goal?.checkInMode === 'progress' ? 'progress' : 'fixed',
  cadence:
    goal?.cadence === 'weekly' || goal?.cadence === 'custom' ? goal.cadence : 'daily',
  cadenceInterval: clamp(Number(goal?.cadenceInterval) || 1, 1, 365),
  progressPercent: clamp(Number(goal?.progressPercent) || 0, 0, 100),
  progressCheckInThreshold: clamp(Number(goal?.progressCheckInThreshold) || 25, 1, 100),
  checkIns: normalizeGoalCheckIns(goal?.checkIns),
  targetValue: Number.isFinite(Number(goal?.targetValue)) ? Math.max(0, Number(goal.targetValue)) : undefined,
  unitLabel: typeof goal?.unitLabel === 'string' ? goal.unitLabel : undefined,
});

const normalizeLearningGoalRecord = (goal: any): LearningGoal => ({
  id: goal?.id || Math.random().toString(36).slice(2),
  ultimateGoal: typeof goal?.ultimateGoal === 'string' ? goal.ultimateGoal : '',
  targetDate: goal?.targetDate,
  weeklyMilestones: Array.isArray(goal?.weeklyMilestones) ? goal.weeklyMilestones : [],
  checkInMode: goal?.checkInMode === 'progress' ? 'progress' : 'fixed',
  cadence:
    goal?.cadence === 'weekly' || goal?.cadence === 'custom' ? goal.cadence : 'daily',
  cadenceInterval: clamp(Number(goal?.cadenceInterval) || 1, 1, 365),
  progressPercent: clamp(Number(goal?.progressPercent) || 0, 0, 100),
  progressCheckInThreshold: clamp(Number(goal?.progressCheckInThreshold) || 25, 1, 100),
  checkIns: normalizeGoalCheckIns(goal?.checkIns),
  targetValue: Number.isFinite(Number(goal?.targetValue)) ? Math.max(0, Number(goal.targetValue)) : undefined,
  unitLabel: typeof goal?.unitLabel === 'string' ? goal.unitLabel : undefined,
});

const hydrateProgress = (input: any): UserProgress => {
  if (!input || typeof input !== 'object') return defaultProgress;
  const parsed = input;
  const migratedRelationshipLogs = (parsed.relationshipLogs || []).map((log: any) => ({
    ...log,
    category: log.category || 'other',
    emotionalResult: log.emotionalResult || log.socialEnergyLevel || 3,
  }));
  const migratedTodos = (parsed.todos || [])
    .map((todo: any) =>
      normalizeTodoRecord({
        ...todo,
        id: todo.id || Math.random().toString(36).slice(2),
        completed: Boolean(todo.completed),
      }),
    )
    .filter((todo: TodoItem) => Boolean(todo.text));

  return {
    ...defaultProgress,
    ...parsed,
    routineSettings: mergeRoutineSettings(parsed.routineSettings),
    healthCheckIns: parsed.healthCheckIns || [],
    workItems: parsed.workItems || [],
    workDailyLogs: parsed.workDailyLogs || [],
    workGoals: Array.isArray(parsed.workGoals)
      ? parsed.workGoals.map(normalizeWorkGoalRecord).filter((goal: WorkGoal) => Boolean(goal.text.trim()))
      : [],
    learningGoals: Array.isArray(parsed.learningGoals)
      ? parsed.learningGoals
          .map(normalizeLearningGoalRecord)
          .filter((goal: LearningGoal) => Boolean(goal.ultimateGoal.trim()))
      : [],
    learningDailyLogs: parsed.learningDailyLogs || [],
    relationshipLogs: migratedRelationshipLogs,
    curiosityLogs: parsed.curiosityLogs || [],
    curiosityIdeas: parsed.curiosityIdeas || [],
    compassionJournals: parsed.compassionJournals || [],
    breathingSessions: parsed.breathingSessions || [],
    todos: migratedTodos,
    character: {
      ...defaultProgress.character,
      ...parsed.character,
      type: 'otter',
      environmentState: parsed.character?.environmentState || defaultProgress.character.environmentState,
    },
  };
};

export function MindIslandsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const lastSyncedJsonRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (OFFLINE_MODE) {
        const cached =
          localStorage.getItem(LEGACY_STORAGE_KEY) ||
          localStorage.getItem(userStorageKey('local-offline'));
        let hydrated: UserProgress | null = null;
        if (cached) {
          try {
            hydrated = hydrateProgress(JSON.parse(cached));
          } catch {
            hydrated = null;
          }
        }

        if (cancelled) return;
        const next = hydrated || defaultProgress;
        setProgress(next);
        lastSyncedJsonRef.current = JSON.stringify(next);
        setCloudLoaded(true);
        return;
      }

      if (!user) {
        setProgress(defaultProgress);
        setCloudLoaded(false);
        lastSyncedJsonRef.current = '';
        return;
      }

      setCloudLoaded(false);
      const key = userStorageKey(user.id);
      let hydrated: UserProgress | null = null;
      let loadedFromCloud = false;

      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const payload = await response.json();
          if (payload?.state && typeof payload.state === 'object') {
            hydrated = hydrateProgress(payload.state);
            loadedFromCloud = true;
          }
        }
      } catch {
        // fallback to local cache
      }

      if (!hydrated) {
        const cached = localStorage.getItem(key) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (cached) {
          try {
            hydrated = hydrateProgress(JSON.parse(cached));
          } catch {
            hydrated = null;
          }
        }
      }

      const next = hydrated || defaultProgress;
      if (cancelled) return;
      setProgress(next);
      lastSyncedJsonRef.current = loadedFromCloud ? JSON.stringify(next) : '';
      setCloudLoaded(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const nextZone = progress.routineSettings?.timeZone || getAppTimeZone();
    setAppTimeZone(nextZone);
  }, [progress.routineSettings?.timeZone]);

  useEffect(() => {
    if (OFFLINE_MODE) {
      if (!cloudLoaded) return;
      const payload = JSON.stringify(progress);
      localStorage.setItem(LEGACY_STORAGE_KEY, payload);
      localStorage.setItem(userStorageKey('local-offline'), payload);
      return;
    }
    if (!user || !cloudLoaded) return;
    localStorage.setItem(userStorageKey(user.id), JSON.stringify(progress));
  }, [progress, user, cloudLoaded]);

  useEffect(() => {
    if (OFFLINE_MODE) return;
    if (!user || !cloudLoaded) return;
    const nextJson = JSON.stringify(progress);
    if (nextJson === lastSyncedJsonRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: progress }),
        });
        if (response.ok) {
          lastSyncedJsonRef.current = nextJson;
        }
      } catch {
        // keep local cache and retry on next state change
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [progress, user, cloudLoaded]);

  useEffect(() => {
    setProgress((prev) => {
      const today = getTodayISO();
      const nowHour = Number(getNowInAppTimeZoneISO().slice(11, 13));
      const activeSet = getTodayActivitySet(prev);
      const emotionSignal = getTodayEmotionSignal(prev, today);
      const totalEntries = getTotalEntries(prev);
      const nextLevel = Math.max(1, Math.floor(totalEntries / 8) + 1);
      const nextMood = deriveCharacterMood(activeSet.size, nowHour, emotionSignal);
      const nextEnvironment = deriveEnvironmentState(nextMood, activeSet.size);

      let islandsChanged = false;
      const nextIslands = prev.islands.map((island) => {
        const dates = getIslandDateSet(prev, island.id);
        const shouldBeCompleted = dates.has(today);
        const nextStreak = getActiveStreakFromToday(dates, today);
        if (shouldBeCompleted === island.completedToday && nextStreak === island.streak) return island;
        islandsChanged = true;
        return {
          ...island,
          completedToday: shouldBeCompleted,
          streak: nextStreak,
        };
      });

      const characterChanged =
        prev.character.mood !== nextMood ||
        prev.character.level !== nextLevel ||
        prev.character.experience !== totalEntries ||
        JSON.stringify(prev.character.environmentState) !== JSON.stringify(nextEnvironment);

      if (!islandsChanged && !characterChanged) return prev;

      return {
        ...prev,
        islands: islandsChanged ? nextIslands : prev.islands,
        character: {
          ...prev.character,
          mood: nextMood,
          level: nextLevel,
          experience: totalEntries,
          environmentState: nextEnvironment,
        },
      };
    });
  }, [
    progress.healthCheckIns,
    progress.workDailyLogs,
    progress.learningDailyLogs,
    progress.relationshipLogs,
    progress.curiosityLogs,
    progress.curiosityIdeas,
    progress.compassionJournals,
    progress.breathingSessions,
    progress.islands,
  ]);

  useEffect(() => {
    const recalcTodoPriority = () => {
      setProgress((prev) => {
        let changed = false;
        const nextTodos = prev.todos.map((todo) => {
          const normalized = normalizeTodoRecord(todo);
          if (
            normalized.priorityScore !== todo.priorityScore ||
            normalized.priorityLabel !== todo.priorityLabel ||
            normalized.priorityReason !== todo.priorityReason ||
            normalized.estimatedMinutes !== todo.estimatedMinutes
          ) {
            changed = true;
            return normalized;
          }
          return todo;
        });
        if (!changed) return prev;
        return {
          ...prev,
          todos: nextTodos,
        };
      });
    };

    recalcTodoPriority();
    const timer = window.setInterval(recalcTodoPriority, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [progress.todos.length]);

  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  const updateCharacterMood = (mood: CharacterMood) => {
    setProgress((prev) => ({
      ...prev,
      character: { ...prev.character, mood },
    }));
  };

  const selectCharacter = (name: string) => {
    setProgress((prev) => ({
      ...prev,
      character: { ...prev.character, type: 'otter', name },
    }));
  };

  const completeOnboarding = () => {
    setProgress((prev) => ({
      ...prev,
      onboardingComplete: true,
    }));
  };

  const updateRoutineSettings = (updates: Partial<RoutineSettings>) => {
    setProgress((prev) => ({
      ...prev,
      routineSettings: {
        ...prev.routineSettings,
        ...updates,
        mealTimes: {
          ...prev.routineSettings.mealTimes,
          ...(updates.mealTimes || {}),
        },
        workoutSchedule: updates.workoutSchedule || prev.routineSettings.workoutSchedule,
      },
    }));
  };

  const updateIslandStreak = (islandId: IslandType) => {
    const now = getNowInAppTimeZoneISO();

    setProgress((prev) => ({
      ...prev,
      islands: prev.islands.map((island) => {
        if (island.id !== islandId) return island;
        return {
          ...island,
          lastInteraction: now,
        };
      }),
    }));
  };

  const addHealthCheckIn = (checkIn: Omit<HealthCheckIn, 'id'>) => {
    const newCheckIn = { ...checkIn, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      healthCheckIns: [...prev.healthCheckIns, newCheckIn],
    }));
    updateIslandStreak('body');
  };

  const updateHealthCheckIn = (id: string, updates: Partial<HealthCheckIn>) => {
    setProgress((prev) => ({
      ...prev,
      healthCheckIns: prev.healthCheckIns.map((checkIn) =>
        checkIn.id === id ? { ...checkIn, ...updates } : checkIn,
      ),
    }));
  };

  const deleteHealthCheckIn = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      healthCheckIns: prev.healthCheckIns.filter((checkIn) => checkIn.id !== id),
    }));
  };

  const addWorkItem = (item: Omit<WorkItem, 'id' | 'dateAdded' | 'dateModified'>) => {
    const now = getNowInAppTimeZoneISO();
    const newItem = { ...item, id: generateId(), dateAdded: now, dateModified: now };
    setProgress((prev) => ({
      ...prev,
      workItems: [...prev.workItems, newItem],
    }));
  };

  const updateWorkItem = (id: string, updates: Partial<WorkItem>) => {
    setProgress((prev) => ({
      ...prev,
      workItems: prev.workItems.map((item) =>
        item.id === id ? { ...item, ...updates, dateModified: getNowInAppTimeZoneISO() } : item,
      ),
    }));
  };

  const addWorkDailyLog = (log: Omit<WorkDailyLog, 'id'>) => {
    const newLog = { ...log, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      workDailyLogs: [...prev.workDailyLogs, newLog],
    }));
    updateIslandStreak('work');
  };

  const updateWorkDailyLog = (id: string, updates: Partial<WorkDailyLog>) => {
    setProgress((prev) => ({
      ...prev,
      workDailyLogs: prev.workDailyLogs.map((log) =>
        log.id === id ? { ...log, ...updates, id: log.id } : log,
      ),
    }));
  };

  const deleteWorkDailyLog = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      workDailyLogs: prev.workDailyLogs.filter((log) => log.id !== id),
    }));
  };

  const addWorkGoal = (goal: Omit<WorkGoal, 'id'>) => {
    const newGoal = normalizeWorkGoalRecord({ ...goal, id: generateId() });
    setProgress((prev) => ({
      ...prev,
      workGoals: [...prev.workGoals, newGoal],
    }));
  };

  const updateWorkGoal = (id: string, updates: Partial<Omit<WorkGoal, 'id'>>) => {
    setProgress((prev) => ({
      ...prev,
      workGoals: prev.workGoals.map((goal) =>
        goal.id === id ? normalizeWorkGoalRecord({ ...goal, ...updates, id: goal.id }) : goal,
      ),
    }));
  };

  const deleteWorkGoal = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      workGoals: prev.workGoals.filter((goal) => goal.id !== id),
    }));
  };

  const addWorkGoalCheckIn = (id: string) => {
    const now = getNowInAppTimeZoneISO();
    const today = getDateKey();

    setProgress((prev) => {
      const targetGoal = prev.workGoals.find((goal) => goal.id === id);
      if (!targetGoal) return prev;
      const nextGoals = prev.workGoals.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              checkIns: [...goal.checkIns, { id: generateId(), createdAt: now }],
            }
          : goal,
      );

      const todayLog = prev.workDailyLogs.find((log) => log.date === today);
      const nextProgressStep = appendUniqueSentence(
        todayLog?.progressStep,
        buildWorkGoalCheckInText(targetGoal),
      );
      return {
        ...prev,
        workGoals: nextGoals,
        workDailyLogs: todayLog
          ? prev.workDailyLogs.map((log) =>
              log.id === todayLog.id ? { ...log, progressStep: nextProgressStep } : log,
            )
          : [
              ...prev.workDailyLogs,
              {
                id: generateId(),
                date: today,
                progressStep: nextProgressStep,
                stressLevel: 3,
              },
            ],
      };
    });
  };

  const addLearningGoal = (goal: Omit<LearningGoal, 'id'>) => {
    const newGoal = normalizeLearningGoalRecord({ ...goal, id: generateId() });
    setProgress((prev) => ({
      ...prev,
      learningGoals: [...prev.learningGoals, newGoal],
    }));
  };

  const updateLearningGoal = (id: string, updates: Partial<Omit<LearningGoal, 'id'>>) => {
    setProgress((prev) => ({
      ...prev,
      learningGoals: prev.learningGoals.map((goal) =>
        goal.id === id ? normalizeLearningGoalRecord({ ...goal, ...updates, id: goal.id }) : goal,
      ),
    }));
  };

  const deleteLearningGoal = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      learningGoals: prev.learningGoals.filter((goal) => goal.id !== id),
    }));
  };

  const addLearningGoalCheckIn = (id: string) => {
    const now = getNowInAppTimeZoneISO();
    const today = getDateKey();

    setProgress((prev) => {
      const targetGoal = prev.learningGoals.find((goal) => goal.id === id);
      if (!targetGoal) return prev;
      const nextGoals = prev.learningGoals.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              checkIns: [...goal.checkIns, { id: generateId(), createdAt: now }],
            }
          : goal,
      );

      const todayLog = prev.learningDailyLogs.find((log) => log.date === today);
      const nextWhatILearned = appendUniqueSentence(
        todayLog?.whatILearned,
        buildLearningGoalCheckInText(targetGoal),
      );
      return {
        ...prev,
        learningGoals: nextGoals,
        learningDailyLogs: todayLog
          ? prev.learningDailyLogs.map((log) =>
              log.id === todayLog.id ? { ...log, whatILearned: nextWhatILearned } : log,
            )
          : [
              ...prev.learningDailyLogs,
              {
                id: generateId(),
                date: today,
                focusedStudyMinutes: 0,
                whatILearned: nextWhatILearned,
              },
            ],
      };
    });
  };

  const addLearningDailyLog = (log: Omit<LearningDailyLog, 'id'>) => {
    const newLog = { ...log, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      learningDailyLogs: [...prev.learningDailyLogs, newLog],
    }));
    updateIslandStreak('learning');
  };

  const updateLearningDailyLog = (id: string, updates: Partial<LearningDailyLog>) => {
    setProgress((prev) => ({
      ...prev,
      learningDailyLogs: prev.learningDailyLogs.map((log) =>
        log.id === id ? { ...log, ...updates, id: log.id } : log,
      ),
    }));
  };

  const deleteLearningDailyLog = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      learningDailyLogs: prev.learningDailyLogs.filter((log) => log.id !== id),
    }));
  };

  const updateWeeklyMilestone = (goalId: string, milestoneId: string, completed: boolean) => {
    setProgress((prev) => ({
      ...prev,
      learningGoals: prev.learningGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              weeklyMilestones: goal.weeklyMilestones.map((milestone) =>
                milestone.id === milestoneId ? { ...milestone, completed } : milestone,
              ),
            }
          : goal,
      ),
    }));
  };

  const addRelationshipLog = (log: Omit<RelationshipLog, 'id'>) => {
    const newLog = { ...log, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      relationshipLogs: [...prev.relationshipLogs, newLog],
    }));
    updateIslandStreak('relationships');
  };

  const updateRelationshipLog = (id: string, updates: Partial<RelationshipLog>) => {
    setProgress((prev) => ({
      ...prev,
      relationshipLogs: prev.relationshipLogs.map((log) =>
        log.id === id ? { ...log, ...updates, id: log.id } : log,
      ),
    }));
  };

  const deleteRelationshipLog = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      relationshipLogs: prev.relationshipLogs.filter((log) => log.id !== id),
    }));
  };

  const addCuriosityLog = (log: Omit<CuriosityLog, 'id'>) => {
    const newLog = { ...log, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      curiosityLogs: [...prev.curiosityLogs, newLog],
    }));
    updateIslandStreak('curiosity');
  };

  const updateCuriosityLog = (id: string, updates: Partial<CuriosityLog>) => {
    setProgress((prev) => ({
      ...prev,
      curiosityLogs: prev.curiosityLogs.map((log) =>
        log.id === id ? { ...log, ...updates, id: log.id } : log,
      ),
    }));
  };

  const deleteCuriosityLog = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      curiosityLogs: prev.curiosityLogs.filter((log) => log.id !== id),
    }));
  };

  const addCuriosityIdea = (idea: Omit<CuriosityIdea, 'id'>) => {
    const newIdea = { ...idea, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      curiosityIdeas: [...prev.curiosityIdeas, newIdea],
    }));
    updateIslandStreak('curiosity');
  };

  const updateCuriosityIdea = (id: string, updates: Partial<CuriosityIdea>) => {
    setProgress((prev) => ({
      ...prev,
      curiosityIdeas: prev.curiosityIdeas.map((idea) =>
        idea.id === id ? { ...idea, ...updates, id: idea.id } : idea,
      ),
    }));
  };

  const deleteCuriosityIdea = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      curiosityIdeas: prev.curiosityIdeas.filter((idea) => idea.id !== id),
    }));
  };

  const addCompassionJournal = (journal: Omit<CompassionJournal, 'id'>) => {
    const newJournal = { ...journal, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      compassionJournals: [...prev.compassionJournals, newJournal],
    }));
    updateIslandStreak('compassion');
  };

  const updateCompassionJournal = (id: string, updates: Partial<CompassionJournal>) => {
    setProgress((prev) => ({
      ...prev,
      compassionJournals: prev.compassionJournals.map((journal) =>
        journal.id === id ? { ...journal, ...updates, id: journal.id } : journal,
      ),
    }));
  };

  const deleteCompassionJournal = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      compassionJournals: prev.compassionJournals.filter((journal) => journal.id !== id),
    }));
  };

  const addBreathingSession = (session: Omit<BreathingSession, 'id'>) => {
    const newSession = { ...session, id: generateId() };
    setProgress((prev) => ({
      ...prev,
      breathingSessions: [...prev.breathingSessions, newSession],
    }));
  };

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage = {
      ...message,
      id: generateId(),
      timestamp: getNowInAppTimeZoneISO(),
    };
    setProgress((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory, newMessage],
    }));
  };

  const applyAIInsights = (insight: AIInsightPayload, sourceMessage = '') => {
    const today = getTodayISO();
    const bodyEntry = insight.entries.body;
    const workEntry = insight.entries.work;
    const learningEntry = insight.entries.learning;
    const relationshipEntry = insight.entries.relationships;
    const curiosityEntry = insight.entries.curiosity;
    const compassionEntry = insight.entries.compassion;
    const sourceText = polishLogText(sourceMessage);
    const hasText = (value?: string) => Boolean(value && value.trim().length > 0);
    const detected = new Set<IslandType>(Array.isArray(insight.detectedIslands) ? insight.detectedIslands : []);

    const shouldWriteBody = Boolean(
      bodyEntry &&
        (detected.has('body') ||
          hasText(bodyEntry.sleepTime) ||
          hasText(bodyEntry.wakeTime) ||
          typeof bodyEntry.workoutCompleted === 'boolean' ||
          hasText(bodyEntry.workoutType) ||
          typeof bodyEntry.workoutDuration === 'number' ||
          hasText(bodyEntry.workoutIntensity) ||
          typeof bodyEntry.ateMealsOnTime === 'boolean' ||
          hasText(bodyEntry.mealNotes) ||
          hasText(bodyEntry.notes)),
    );
    const shouldWriteWork = Boolean(
      workEntry &&
        (detected.has('work') || hasText(workEntry.progressStep) || hasText(workEntry.todaysWin)),
    );
    const shouldWriteLearning = Boolean(
      learningEntry &&
        (detected.has('learning') || hasText(learningEntry.whatILearned)),
    );
    const shouldWriteRelationships = Boolean(
      relationshipEntry &&
        (detected.has('relationships') ||
          hasText(relationshipEntry.momentNote) ||
          hasText(relationshipEntry.gratitudeNote) ||
          hasText(relationshipEntry.personName) ||
          hasText(relationshipEntry.category)),
    );
    const shouldWriteCuriosity = Boolean(
      curiosityEntry &&
        (detected.has('curiosity') ||
          hasText(curiosityEntry.newThingNoticed) ||
          hasText(curiosityEntry.newSkillOrFact)),
    );
    const shouldWriteCompassion = Boolean(
      compassionEntry &&
        (detected.has('compassion') ||
          hasText(compassionEntry.journalEntry) ||
          hasText(compassionEntry.reflectionPrompt)),
    );

    const islands: IslandType[] = [
      shouldWriteBody ? 'body' : null,
      shouldWriteWork ? 'work' : null,
      shouldWriteLearning ? 'learning' : null,
      shouldWriteRelationships ? 'relationships' : null,
      shouldWriteCuriosity ? 'curiosity' : null,
      shouldWriteCompassion ? 'compassion' : null,
    ].filter((id): id is IslandType => Boolean(id));

    let predictedTodosAdded = 0;
    const todoShadow = [...progress.todos];
    if (Array.isArray(insight.todos) && insight.todos.length > 0) {
      for (const todo of insight.todos) {
        if (!todo?.text?.trim()) continue;
        const text = todo.text.trim();
        const deadline = normalizeDateTime(todo.deadline);
        const duplicate = todoShadow.some(
          (item) =>
            !item.completed &&
            item.text.trim().toLowerCase() === text.toLowerCase() &&
            (item.deadline || '') === (deadline || ''),
        );
        if (duplicate) continue;
        predictedTodosAdded += 1;
        todoShadow.push({
          id: `shadow-${predictedTodosAdded}`,
          text,
          completed: false,
          deadline,
        } as TodoItem);
      }
    }

    setProgress((prev) => {
      const next = { ...prev };
      const todosSeen = [...next.todos];

      if (bodyEntry && shouldWriteBody) {
        const idx = next.healthCheckIns.findIndex((item) => item.date === today);
        const normalized = {
          sleepTime: normalizeTime(bodyEntry.sleepTime),
          wakeTime: normalizeTime(bodyEntry.wakeTime),
          workoutCompleted:
            typeof bodyEntry.workoutCompleted === 'boolean'
              ? bodyEntry.workoutCompleted
              : undefined,
          workoutType: bodyEntry.workoutType,
          workoutDuration:
            typeof bodyEntry.workoutDuration === 'number' ? bodyEntry.workoutDuration : undefined,
          workoutTime: normalizeTime(bodyEntry.workoutTime),
          workoutIntensity: bodyEntry.workoutIntensity,
          ateMealsOnTime:
            typeof bodyEntry.ateMealsOnTime === 'boolean' ? bodyEntry.ateMealsOnTime : undefined,
          mealNotes: polishLogText(bodyEntry.mealNotes),
          energyLevel:
            typeof bodyEntry.energyLevel === 'number'
              ? clamp(Number(bodyEntry.energyLevel), 1, 5)
              : undefined,
          notes: polishLogText(bodyEntry.notes) || (detected.has('body') ? sourceText : ''),
          estimatedFields: bodyEntry.estimatedFields || [],
        };

        if (idx >= 0) {
          const existing = next.healthCheckIns[idx];
          const merged: HealthCheckIn = {
            ...existing,
            ...normalized,
            workoutCompleted: normalized.workoutCompleted ?? existing.workoutCompleted,
            energyLevel: normalized.energyLevel ?? existing.energyLevel,
            notes: mergeText(existing.notes, normalized.notes),
            mealNotes: mergeText(existing.mealNotes, normalized.mealNotes),
            estimatedFields: Array.from(new Set([...(existing.estimatedFields || []), ...(normalized.estimatedFields || [])])),
          };
          const copy = [...next.healthCheckIns];
          copy[idx] = merged;
          next.healthCheckIns = copy;
        } else {
          next.healthCheckIns = [
            ...next.healthCheckIns,
            {
              id: generateId(),
              date: today,
              sleepTime: normalized.sleepTime,
              wakeTime: normalized.wakeTime,
              workoutCompleted: normalized.workoutCompleted ?? false,
              workoutType: normalized.workoutType,
              workoutDuration: normalized.workoutDuration,
              workoutTime: normalized.workoutTime,
              workoutIntensity: normalized.workoutIntensity,
              ateMealsOnTime: normalized.ateMealsOnTime,
              mealNotes: normalized.mealNotes,
              energyLevel: normalized.energyLevel ?? 3,
              notes: normalized.notes,
              estimatedFields: normalized.estimatedFields,
            },
          ];
        }
      }

      if (workEntry && shouldWriteWork) {
        const progressStep =
          polishLogText(workEntry.progressStep) || (detected.has('work') ? sourceText : '');
        if (progressStep || hasText(workEntry.todaysWin)) {
          next.workDailyLogs = [
            ...next.workDailyLogs,
            {
              id: generateId(),
              date: today,
              progressStep,
              stressLevel: clamp(Number(workEntry.stressLevel) || 3, 1, 5),
              todaysWin: polishLogText(workEntry.todaysWin),
            },
          ];
        }
      }

      if (learningEntry && shouldWriteLearning) {
        const whatILearned =
          polishLogText(learningEntry.whatILearned) || (detected.has('learning') ? sourceText : '');
        if (whatILearned || (learningEntry.resources && learningEntry.resources.length > 0)) {
          next.learningDailyLogs = [
            ...next.learningDailyLogs,
            {
              id: generateId(),
              date: today,
              focusedStudyMinutes: clamp(Number(learningEntry.focusedStudyMinutes) || 25, 1, 480),
              whatILearned: polishLogText(whatILearned),
              resources: learningEntry.resources || [],
            },
          ];
        }
      }

      if (relationshipEntry && shouldWriteRelationships) {
        const momentNote =
          polishLogText(relationshipEntry.momentNote) ||
          (detected.has('relationships') ? sourceText : '');
        if (momentNote || hasText(relationshipEntry.gratitudeNote)) {
          next.relationshipLogs = [
            ...next.relationshipLogs,
            {
              id: generateId(),
              date: today,
              category: relationshipEntry.category || 'other',
              connectedToday: relationshipEntry.connectedToday ?? true,
              interactionType: relationshipEntry.interactionType,
              personName: relationshipEntry.personName?.trim(),
              emotionalResult: clamp(Number(relationshipEntry.emotionalResult) || 3, 1, 5),
              momentNote: polishLogText(momentNote),
              gratitudeNote: polishLogText(relationshipEntry.gratitudeNote),
            },
          ];
        }
      }

      if (curiosityEntry && shouldWriteCuriosity) {
        const newThingNoticed =
          polishLogText(curiosityEntry.newThingNoticed) ||
          polishLogText(curiosityEntry.newSkillOrFact) ||
          (detected.has('curiosity') ? sourceText : '');
        if (newThingNoticed) {
          next.curiosityLogs = [
            ...next.curiosityLogs,
            {
              id: generateId(),
              date: today,
              newThingNoticed: polishLogText(newThingNoticed),
              newSkillOrFact: polishLogText(curiosityEntry.newSkillOrFact),
              photoUrl: curiosityEntry.photoUrl,
              tags: curiosityEntry.tags || ['ai-captured'],
            },
          ];
        }
      }

      if (compassionEntry && shouldWriteCompassion) {
        const journalEntry =
          polishLogText(compassionEntry.journalEntry) ||
          (detected.has('compassion') ? sourceText : '');
        if (journalEntry) {
          next.compassionJournals = [
            ...next.compassionJournals,
            {
              id: generateId(),
              date: today,
              reflectionPrompt: polishLogText(compassionEntry.reflectionPrompt) || 'Captured from AI chat',
              journalEntry: polishLogText(journalEntry),
              mood: clamp(Number(compassionEntry.mood) || 3, 1, 5),
            },
          ];
        }
      }

      if (Array.isArray(insight.todos) && insight.todos.length > 0) {
        for (const todo of insight.todos) {
          if (!todo?.text?.trim()) continue;
          const text = todo.text.trim();
          const deadline = normalizeDateTime(todo.deadline);
          const remindAt = normalizeDateTime(todo.remindAt);
          const details = todo.details?.trim();
          const islandId = todo.islandId;
          const estimatedMinutes =
            typeof todo.estimatedMinutes === 'number' && Number.isFinite(todo.estimatedMinutes)
              ? Math.max(5, Math.round(todo.estimatedMinutes))
              : parseEstimatedMinutes(`${text} ${details || ''}`);
          const importance =
            typeof todo.importance === 'number' && Number.isFinite(todo.importance)
              ? clamp(Math.round(todo.importance), 1, 5)
              : undefined;

          const duplicate = todosSeen.some(
            (item) =>
              !item.completed &&
              item.text.trim().toLowerCase() === text.toLowerCase() &&
              (item.deadline || '') === (deadline || ''),
          );
          if (duplicate) continue;

          const todoId = generateId();
          const normalizedTodo = normalizeTodoRecord({
            id: todoId,
            text,
            completed: false,
            details,
            deadline,
            remindAt,
            islandId,
            estimatedMinutes,
            importance,
          });
          next.todos = [
            ...next.todos,
            normalizedTodo,
          ];
          todosSeen.push({
            ...normalizedTodo,
          } as TodoItem);

          if (remindAt) {
            next.reminders = [
              ...next.reminders,
              {
                id: generateId(),
                text,
                deadline: remindAt,
                islandId,
              },
            ];
          }
        }
      }

      return next;
    });

    islands.forEach((id) => updateIslandStreak(id));
    return { islands, todosAdded: predictedTodosAdded };
  };

  const addTodo = (
    todo: Omit<TodoItem, 'id' | 'priorityScore' | 'priorityLabel' | 'priorityReason'>,
  ) => {
    const normalizedTodo = normalizeTodoRecord({
      ...todo,
      id: generateId(),
    });
    setProgress((prev) => {
      let next = {
        ...prev,
        todos: [...prev.todos, normalizedTodo],
      };

      if (normalizedTodo.remindAt) {
        next = {
          ...next,
          reminders: [
            ...next.reminders,
            {
              id: generateId(),
              text: normalizedTodo.text,
              deadline: normalizedTodo.remindAt,
              islandId: normalizedTodo.islandId,
            },
          ],
        };
      }

      return next;
    });
  };

  const updateTodo = (
    todoId: string,
    updates: Partial<Omit<TodoItem, 'id' | 'priorityScore' | 'priorityLabel' | 'priorityReason'>>,
  ) => {
    setProgress((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === todoId
          ? normalizeTodoRecord({
              ...todo,
              ...updates,
            })
          : todo,
      ),
    }));
  };

  const setTodoImportance = (todoId: string, importance: number) => {
    const nextImportance = clamp(Math.round(importance), 1, 5);
    setProgress((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === todoId
          ? normalizeTodoRecord({
              ...todo,
              importance: nextImportance,
            })
          : todo,
      ),
    }));
  };

  const toggleTodo = (todoId: string) => {
    setProgress((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === todoId
          ? normalizeTodoRecord({
              ...todo,
              completed: !todo.completed,
              completedAt: !todo.completed ? getNowInAppTimeZoneISO() : undefined,
            })
          : todo,
      ),
    }));
  };

  const deleteTodo = (todoId: string) => {
    setProgress((prev) => ({
      ...prev,
      todos: prev.todos.filter((todo) => todo.id !== todoId),
    }));
  };

  const cleanupCompletedTodos = (olderThanDays: number) => {
    let removed = 0;
    const thresholdMs = olderThanDays * 24 * 60 * 60 * 1000;
    const now = new Date(getNowInAppTimeZoneISO()).getTime();

    setProgress((prev) => {
      const nextTodos = prev.todos.filter((todo) => {
        if (!todo.completed || !todo.completedAt) return true;
        const completedAtMs = new Date(todo.completedAt).getTime();
        if (!Number.isFinite(completedAtMs)) return true;
        const shouldRemove = now - completedAtMs >= thresholdMs;
        if (shouldRemove) removed += 1;
        return !shouldRemove;
      });

      return {
        ...prev,
        todos: nextTodos,
      };
    });

    return removed;
  };

  return (
    <MindIslandsContext.Provider
      value={{
        progress,
        updateCharacterMood,
        selectCharacter,
        completeOnboarding,
        updateIslandStreak,
        updateRoutineSettings,
        addHealthCheckIn,
        updateHealthCheckIn,
        deleteHealthCheckIn,
        addWorkItem,
        updateWorkItem,
        addWorkDailyLog,
        updateWorkDailyLog,
        deleteWorkDailyLog,
        addWorkGoal,
        updateWorkGoal,
        deleteWorkGoal,
        addWorkGoalCheckIn,
        addLearningGoal,
        updateLearningGoal,
        deleteLearningGoal,
        addLearningGoalCheckIn,
        addLearningDailyLog,
        updateLearningDailyLog,
        deleteLearningDailyLog,
        updateWeeklyMilestone,
        addRelationshipLog,
        updateRelationshipLog,
        deleteRelationshipLog,
        addCuriosityLog,
        updateCuriosityLog,
        deleteCuriosityLog,
        addCuriosityIdea,
        updateCuriosityIdea,
        deleteCuriosityIdea,
        addCompassionJournal,
        updateCompassionJournal,
        deleteCompassionJournal,
        addBreathingSession,
        addChatMessage,
        applyAIInsights,
        addTodo,
        updateTodo,
        setTodoImportance,
        toggleTodo,
        deleteTodo,
        cleanupCompletedTodos,
      }}
    >
      {children}
    </MindIslandsContext.Provider>
  );
}

export function useMindIslands() {
  const context = useContext(MindIslandsContext);
  if (!context) {
    throw new Error('useMindIslands must be used within MindIslandsProvider');
  }
  return context;
}
