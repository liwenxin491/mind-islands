import { AnimatePresence, motion } from 'motion/react';
import {
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { IllustratedCharacter } from '../components/IllustratedCharacter';
import { PrimaryNav } from '../components/PrimaryNav';
import { useQuickLog } from '../components/QuickLogCapture';
import { Button } from '../components/ui/button';
import { getDateKey, getNowInAppTimeZoneISO } from '../lib/time';
import type { QuickPromptCategory, QuickPromptCheckIn, QuickPromptTrigger, UserProgress } from '../types';
import backgroundImage from '../../assets/background-new.webp';
import bubbleFrame from '../../assets/bubble-filled.png';

type MobileOverlay = 'settings' | null;

interface QuickPromptOption {
  id: string;
  en: string;
  zh: string;
  responseEn: string;
  responseZh: string;
  offerHarbor?: boolean;
}

interface QuickPromptDefinition {
  id: string;
  category: QuickPromptCategory;
  trigger: QuickPromptTrigger;
  questionEn: string;
  questionZh: string;
  options: QuickPromptOption[];
}

function getQuickPrompt(progress: UserProgress): QuickPromptDefinition {
  const nowISO = getNowInAppTimeZoneISO();
  const hour = Number(nowISO.slice(11, 13));
  const recentLowEnergyCount = progress.healthCheckIns
    .slice(-5)
    .filter((entry) => entry.energyLevel <= 2).length;
  const recentLowMoodCount = progress.compassionJournals
    .slice(-5)
    .filter((entry) => typeof entry.mood === 'number' && entry.mood <= 2).length;
  const recentStrainedAnswers = progress.quickPromptCheckIns
    .slice(-5)
    .filter((entry) =>
      ['overwhelmed', 'hard-on-myself', 'barely-slept', 'still-carrying', 'heavy'].includes(entry.answerId),
    ).length;

  if (recentLowEnergyCount + recentLowMoodCount + recentStrainedAnswers >= 2) {
    return {
      id: 'care-needed',
      category: 'emotion',
      trigger: 'recent-pattern',
      questionEn: 'What needs a little care right now?',
      questionZh: '此刻的我，最需要照顾哪一部分？',
      options: [
        {
          id: 'overwhelmed',
          en: 'Overwhelmed',
          zh: '有点撑不住',
          responseEn: 'I do not have to carry all of this alone.',
          responseZh: '我不需要独自扛下所有事情。',
          offerHarbor: true,
        },
        {
          id: 'hard-on-myself',
          en: 'Hard on myself',
          zh: '在责怪自己',
          responseEn: 'I can meet myself with less blame today.',
          responseZh: '今天，我可以少一点责备自己。',
          offerHarbor: true,
        },
        {
          id: 'lonely',
          en: 'Disconnected',
          zh: '有些孤单',
          responseEn: 'It makes sense to want some closeness.',
          responseZh: '我渴望一点连接，是可以理解的。',
          offerHarbor: true,
        },
        {
          id: 'not-sure',
          en: 'Not sure yet',
          zh: '还说不清',
          responseEn: 'I can find the words slowly.',
          responseZh: '我可以慢慢找到表达它的语言。',
        },
      ],
    };
  }

  if (hour < 11) {
    return {
      id: 'morning-sleep',
      category: 'sleep',
      trigger: 'morning',
      questionEn: 'How did I sleep last night?',
      questionZh: '昨晚我睡得怎么样？',
      options: [
        {
          id: 'rested',
          en: 'Rested',
          zh: '睡得不错',
          responseEn: 'I can begin today with this steadiness.',
          responseZh: '我可以带着这份安稳开始今天。',
        },
        {
          id: 'okay',
          en: 'Okay',
          zh: '还可以',
          responseEn: 'An ordinary start is enough.',
          responseZh: '一个普通的开始也已经足够。',
        },
        {
          id: 'still-tired',
          en: 'Still tired',
          zh: '还有点累',
          responseEn: 'I can be gentle with my energy today.',
          responseZh: '今天，我可以温柔地对待自己的精力。',
        },
        {
          id: 'barely-slept',
          en: 'Barely slept',
          zh: '几乎没睡好',
          responseEn: 'A difficult night deserves extra care today.',
          responseZh: '度过难熬的一夜后，今天值得更多照顾。',
          offerHarbor: true,
        },
      ],
    };
  }

  if (hour >= 18) {
    return {
      id: 'evening-carry',
      category: 'reflection',
      trigger: 'evening',
      questionEn: 'How am I leaving today?',
      questionZh: '今天结束时，我感觉怎么样？',
      options: [
        {
          id: 'settled',
          en: 'Settled',
          zh: '平静下来',
          responseEn: 'I gave today a place to land.',
          responseZh: '我让今天稳稳落了下来。',
        },
        {
          id: 'proud',
          en: 'Proud',
          zh: '有些自豪',
          responseEn: 'I can hold on to what went well.',
          responseZh: '我可以记住今天做得好的部分。',
        },
        {
          id: 'tired',
          en: 'Tired',
          zh: '有点疲惫',
          responseEn: 'Rest can be my next kind step.',
          responseZh: '休息可以是我接下来温柔的一步。',
        },
        {
          id: 'still-carrying',
          en: 'Still carrying something',
          zh: '心里还有事',
          responseEn: 'I can give this feeling a little room.',
          responseZh: '我可以给这份感受留一点空间。',
          offerHarbor: true,
        },
      ],
    };
  }

  return {
    id: 'daytime-arrival',
    category: 'energy',
    trigger: 'afternoon',
    questionEn: 'How am I arriving right now?',
    questionZh: '此刻的我，是怎样来到这里的？',
    options: [
      {
        id: 'steady',
        en: 'Steady',
        zh: '还算稳定',
        responseEn: 'I can keep moving at my own pace.',
        responseZh: '我可以按自己的节奏继续前进。',
      },
      {
        id: 'energized',
        en: 'Ready',
        zh: '准备好了',
        responseEn: 'I have energy for one meaningful step.',
        responseZh: '我有精力去做一个有意义的小步骤。',
      },
      {
        id: 'tired',
        en: 'Tired',
        zh: '有点累',
        responseEn: 'Small is still worthwhile today.',
        responseZh: '今天做小一点，也仍然值得。',
      },
      {
        id: 'heavy',
        en: 'Heavy',
        zh: '心里沉沉的',
        responseEn: 'I deserve support, not pressure.',
        responseZh: '我值得得到支持，而不是更多压力。',
        offerHarbor: true,
      },
    ],
  };
}

export function Hub() {
  const navigate = useNavigate();
  const { openComposer } = useQuickLog();
  const { language, setLanguage, t } = useLanguage();
  const {
    progress,
    cleanupCompletedTodos,
    addQuickPromptCheckIn,
    updateQuickPromptCheckIn,
  } = useMindIslands();
  const { logout } = useAuth();

  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>(null);

  const avatarMessages = useMemo(() => {
    const s = (en: string, zh: string) => (language === 'zh' ? zh : en);
    const messages: string[] = [];
    const today = getDateKey();
    const nowISO = getNowInAppTimeZoneISO();
    const hour = Number(nowISO.slice(11, 13));
    const minute = Number(nowISO.slice(14, 16));
    const nowMin = hour * 60 + minute;
    const settings = progress.routineSettings;
    const lead = settings.reminderLeadMinutes;

    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    if (!settings.avatarRemindersEnabled) {
      return [
        s(
          'I will stay quiet for now. You can re-enable reminders in Actions anytime.',
          '我先安静待着。你可以随时在行动的节奏设置中重新开启提醒。',
        ),
      ];
    }

    const completedIslandsToday = [
      progress.healthCheckIns.some((i) => i.date === today),
      progress.workDailyLogs.some((i) => i.date === today),
      progress.learningDailyLogs.some((i) => i.date === today),
      progress.relationshipLogs.some((i) => i.date === today),
      progress.curiosityLogs.some((i) => i.date === today),
      progress.compassionJournals.some((i) => i.date === today) ||
        progress.breathingSessions.some((i) => i.date === today),
    ].filter(Boolean).length;

    const hasCuriosityToday = progress.curiosityLogs.some((i) => i.date === today);
    const hasWorkoutToday = progress.healthCheckIns.some(
      (i) => i.date === today && i.workoutCompleted,
    );
    const hasMealEvidenceToday = progress.healthCheckIns.some(
      (i) =>
        i.date === today &&
        (i.ateMealsOnTime ||
          /eat|meal|breakfast|lunch|dinner|吃饭|早餐|午饭|晚饭/i.test(i.notes || '') ||
          /吃饭|早餐|午饭|晚饭/i.test(i.mealNotes || '')),
    );
    const hasAchievementToday =
      progress.workDailyLogs.some((i) => i.date === today && (i.todaysWin || '').trim()) ||
      progress.learningDailyLogs.some((i) => i.date === today) ||
      progress.curiosityLogs.some((i) => i.date === today);
    const pendingTodos = progress.todos.filter((todo) => !todo.completed);
    const topPriorityTodo = pendingTodos
      .slice()
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        const aImportance = typeof a.importance === 'number' ? a.importance : 0;
        const bImportance = typeof b.importance === 'number' ? b.importance : 0;
        if (bImportance !== aImportance) return bImportance - aImportance;
        return a.text.localeCompare(b.text);
      })[0];

    const sleepTargetMin = toMinutes(settings.sleepTargetTime);
    const bedtimeReminderMin = sleepTargetMin - lead;
    if (
      nowMin >= bedtimeReminderMin &&
      !progress.healthCheckIns.some((i) => i.date === today && i.sleepTime)
    ) {
      messages.push(
        s(
          "It's almost bedtime. Let me start slowing down now so tomorrow feels easier.",
          '快到睡觉时间了。现在开始慢下来，明天会更轻松。',
        ),
      );
    }

    const mealWindows = [
      { label: s('breakfast', '早餐'), minute: toMinutes(settings.mealTimes.breakfast) - lead },
      { label: s('lunch', '午餐'), minute: toMinutes(settings.mealTimes.lunch) - lead },
      { label: s('dinner', '晚餐'), minute: toMinutes(settings.mealTimes.dinner) - lead },
    ];
    const activeMeal = mealWindows.find((item) => nowMin >= item.minute && nowMin <= item.minute + 60);
    if (activeMeal && !hasMealEvidenceToday) {
      messages.push(
        s(
          `It's almost ${activeMeal.label} time. A proper meal is a small kindness to myself.`,
          `快到${activeMeal.label}时间了。好好吃一顿饭，是给自己的小小善意。`,
        ),
      );
    }

    const workoutPlanToday = settings.workoutSchedule.find(
      (item) => item.dayOfWeek === new Date().getDay() && item.enabled,
    );
    if (workoutPlanToday) {
      const workoutReminderMin = toMinutes(workoutPlanToday.time) - lead;
      if (nowMin >= workoutReminderMin && nowMin <= workoutReminderMin + 120 && !hasWorkoutToday) {
        const label = workoutPlanToday.label ? ` (${workoutPlanToday.label})` : '';
        messages.push(
          s(
            `Workout time${label} is coming up. I can just start with 5 minutes and build from there.`,
            `锻炼时间${label}快到了。先开始 5 分钟就很好，然后再慢慢加。`,
          ),
        );
      }
    }

    if (completedIslandsToday >= 3) {
      messages.push(
        s(
          `Nice, I already cared for ${completedIslandsToday} islands today. This is real progress.`,
          `不错，今天我已经照顾了 ${completedIslandsToday} 个岛屿。这就是实实在在的进步。`,
        ),
      );
    }

    if (hasCuriosityToday) {
      messages.push(
        s(
          'I noticed something new today. I am not stuck in the same old loop.',
          '今天我发现了新东西。我没有陷在同样的循环里。',
        ),
      );
    }

    if (hasAchievementToday) {
      messages.push(
        s(
          "Today's progress is visible. I'll keep this rhythm steady.",
          '今天的进展是看得见的。继续保持这个节奏。',
        ),
      );
    }

    if (completedIslandsToday === 0 && hour >= 12) {
      messages.push(
        s(
          'No worries, I can restart with one tiny action. One short log is already a win.',
          '没关系，我可以从一个小动作重新开始。记录一小条就已经是胜利。',
        ),
      );
    }

    if (topPriorityTodo) {
      messages.push(
        s(
          `My next focus can be: ${topPriorityTodo.text}. I only need one small step to begin.`,
          `我现在最该先做的是：${topPriorityTodo.text}。先迈出一个小步骤就够了。`,
        ),
      );
    }

    const baselineMessages = [
      s("Step by step. I'll take care of the next small thing.", '一步一步来。我先照顾好下一个小任务。'),
      s('A tiny action still counts as progress. I can start small.', '哪怕只做一点点，也是在进步。我可以先从小处开始。'),
      s('I do not need a perfect day. I just need one next kind step.', '我不需要完美的一天。我只需要下一个温柔的小步骤。'),
    ];

    return Array.from(new Set([...messages, ...baselineMessages])).slice(0, 8);
  }, [
    progress.healthCheckIns,
    progress.workDailyLogs,
    progress.learningDailyLogs,
    progress.relationshipLogs,
    progress.curiosityLogs,
    progress.compassionJournals,
    progress.breathingSessions,
    progress.todos,
    progress.routineSettings,
    language,
  ]);

  useEffect(() => {
    setBubbleIndex(0);
  }, [avatarMessages.length]);

  const cycleBubble = () => {
    if (avatarMessages.length <= 1) return;
    setBubbleIndex((prev) => (prev + 1) % avatarMessages.length);
  };

  const quickPrompt = useMemo(
    () => getQuickPrompt(progress),
    [progress.healthCheckIns, progress.compassionJournals, progress.quickPromptCheckIns],
  );
  const latestQuickCheckIn = useMemo(
    () =>
      progress.quickPromptCheckIns
        .slice()
        .reverse()
        .find(
          (checkIn) =>
            checkIn.promptId === quickPrompt.id &&
            checkIn.createdAt.slice(0, 10) === getDateKey(),
        ),
    [progress.quickPromptCheckIns, quickPrompt.id],
  );
  const selectedQuickOption = quickPrompt.options.find(
    (option) => option.id === latestQuickCheckIn?.answerId,
  );

  const openQuickLog = (
    source: 'global' | 'otter' | 'quick-check-in' = 'global',
    returnFocus?: HTMLElement,
  ) => {
    openComposer(source, returnFocus);
  };

  const answerQuickPrompt = (option: QuickPromptOption) => {
    addQuickPromptCheckIn({
      promptId: quickPrompt.id,
      promptText: t(quickPrompt.questionEn, quickPrompt.questionZh),
      category: quickPrompt.category,
      trigger: quickPrompt.trigger,
      answerId: option.id,
      answer: t(option.en, option.zh),
    });
  };

  const sayMoreFromPrompt = (returnFocus?: HTMLElement) => {
    if (latestQuickCheckIn) {
      updateQuickPromptCheckIn(latestQuickCheckIn.id, { continuedToQuickLog: true });
    }
    openQuickLog('quick-check-in', returnFocus);
  };

  const goToHarborFromPrompt = () => {
    if (latestQuickCheckIn) {
      updateQuickPromptCheckIn(latestQuickCheckIn.id, { continuedToHarbor: true });
    }
    navigate('/island/compassion');
  };

  const activeTodos = progress.todos.filter((todo) => !todo.completed);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#103542] text-foreground">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6, 23, 28, 0.34), rgba(8, 34, 41, 0.2)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,218,224,0.18),transparent_45%)]" />

      <div className="relative z-10 flex h-[100dvh] items-center justify-center px-0 py-0 sm:px-8 sm:py-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[calc(50%-220px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[calc(50%-220px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />

        <div className="relative h-full w-full max-w-[420px] overflow-hidden sm:h-[min(92dvh,860px)] sm:rounded-[36px] sm:border sm:border-white/20 sm:shadow-[0_28px_90px_rgba(4,24,30,0.42)]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2e38]/10 via-transparent to-[#0a2e38]/18" />

          <MobileHomeOrMemories
            mobileOverlay={mobileOverlay}
            setMobileOverlay={setMobileOverlay}
            bubbleMessage={avatarMessages[bubbleIndex]}
            canCycle={avatarMessages.length > 1}
            onBubbleClick={cycleBubble}
            onOtterClick={(returnFocus) => openQuickLog('otter', returnFocus)}
            quickPrompt={quickPrompt}
            quickCheckIn={latestQuickCheckIn}
            selectedQuickOption={selectedQuickOption}
            onQuickPromptAnswer={answerQuickPrompt}
            onSayMore={sayMoreFromPrompt}
            onGoToHarbor={goToHarborFromPrompt}
            t={t}
            activeTodosCount={activeTodos.length}
            cleanupCompletedTodos={cleanupCompletedTodos}
            logout={logout}
            language={language}
            setLanguage={setLanguage}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  );
}

function MobileHomeOrMemories({
  mobileOverlay,
  setMobileOverlay,
  bubbleMessage,
  canCycle,
  onBubbleClick,
  onOtterClick,
  quickPrompt,
  quickCheckIn,
  selectedQuickOption,
  onQuickPromptAnswer,
  onSayMore,
  onGoToHarbor,
  t,
  activeTodosCount,
  cleanupCompletedTodos,
  logout,
  language,
  setLanguage,
  navigate,
}: {
  mobileOverlay: MobileOverlay;
  setMobileOverlay: (overlay: MobileOverlay) => void;
  bubbleMessage: string;
  canCycle: boolean;
  onBubbleClick: () => void;
  onOtterClick: (returnFocus: HTMLElement) => void;
  quickPrompt: QuickPromptDefinition;
  quickCheckIn?: QuickPromptCheckIn;
  selectedQuickOption?: QuickPromptOption;
  onQuickPromptAnswer: (option: QuickPromptOption) => void;
  onSayMore: (returnFocus?: HTMLElement) => void;
  onGoToHarbor: () => void;
  t: (en: string, zh: string) => string;
  activeTodosCount: number;
  cleanupCompletedTodos: (olderThanDays: number) => number;
  logout: () => void;
  language: 'en' | 'zh';
  setLanguage: (language: 'en' | 'zh') => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden px-4 pb-5 pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative flex-1">
        <button
            type="button"
            onClick={() => navigate('/island/curiosity')}
            aria-label={t('Open Inspiration Island', '打开灵感岛')}
            className="absolute -top-2 left-0 z-20 flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/45 bg-[rgba(250,253,252,0.9)] px-3.5 text-[12px] font-semibold text-[#476f79] shadow-[0_8px_22px_rgba(11,43,53,0.14)] backdrop-blur-lg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('Inspiration', '灵感')}</span>
          </button>
        <button
          type="button"
          aria-label={t('Open settings', '打开设置')}
          onClick={() => setMobileOverlay('settings')}
          className={`absolute -top-2 right-0 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-white/78 text-[#557a84] shadow-[0_8px_22px_rgba(16,48,57,0.14)] backdrop-blur-lg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            mobileOverlay === 'settings' ? 'bg-white text-[#456c75]' : ''
          }`}
        >
          <Settings className="h-5 w-5" />
        </button>

        <div className="flex h-full flex-col items-center pb-[7.1rem] pt-9">
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start">
              <button
                type="button"
                onClick={onBubbleClick}
                aria-label={canCycle ? t('Read another reflection', '切换一句自我支持') : undefined}
                className={`home-companion-float relative mt-1 w-[86%] max-w-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${canCycle ? 'cursor-pointer' : ''}`}
              >
                <div className="relative" style={{ aspectRatio: '510 / 176' }}>
                  <img
                    src={bubbleFrame}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                  />
                  <div className="absolute inset-[14%_11%_24%_11%] flex items-center justify-center">
                    <p className="text-[13px] font-medium leading-5 text-slate-900">
                      {bubbleMessage}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={(event) => onOtterClick(event.currentTarget)}
                aria-label={t('Talk to my otter', '和我的海獭聊聊')}
                className="home-companion-float relative z-10 -mt-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="home-companion-character block">
                  <IllustratedCharacter type="otter" mood="neutral" size="xl" />
                </span>
              </button>

              <QuickPromptCard
                prompt={quickPrompt}
                checkIn={quickCheckIn}
                selectedOption={selectedQuickOption}
                onAnswer={onQuickPromptAnswer}
                onSayMore={onSayMore}
                onGoToHarbor={onGoToHarbor}
                t={t}
              />
            </div>
          </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-900/22 via-slate-900/8 to-transparent" />

      <PrimaryNav active="home" actionsBadge={activeTodosCount} />

      <AnimatePresence>
        {mobileOverlay === 'settings' && (
          <OverlayShell title={t('Settings', '设置')} onClose={() => setMobileOverlay(null)} className="z-50">
            <div className="space-y-4 rounded-[28px] border border-white/18 bg-[rgba(240,246,248,0.8)] p-5 text-slate-700">
              <section className="rounded-2xl bg-[rgba(252,253,254,0.72)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('Language', '语言')}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant={language === 'en' ? 'default' : 'outline'}
                    className={language === 'en' ? 'bg-[#6b98a2] text-white hover:bg-[#5a8791]' : 'border-white/30 bg-white/70 text-slate-700'}
                    onClick={() => setLanguage('en')}
                  >
                    EN
                  </Button>
                  <Button
                    variant={language === 'zh' ? 'default' : 'outline'}
                    className={language === 'zh' ? 'bg-[#6b98a2] text-white hover:bg-[#5a8791]' : 'border-white/30 bg-white/70 text-slate-700'}
                    onClick={() => setLanguage('zh')}
                  >
                    中文
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl bg-[rgba(252,253,254,0.72)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('Review', '回顾')}</p>
                <div className="mt-3 text-sm">
                  <Button variant="outline" className="w-full justify-start border-white/30 bg-white/70 text-slate-700" onClick={() => navigate('/memories?view=insights')}>
                    {t('Insights', '洞察')}
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl bg-[rgba(252,253,254,0.72)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('To-do Cleanup', '待办清理')}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {t('Remove completed to-dos that are no longer useful to keep around.', '清理那些已经完成、且没有必要继续保留的待办。')}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/30 bg-white/70 text-slate-700"
                    onClick={() => cleanupCompletedTodos(7)}
                  >
                    {t('Clear 7+ days', '清理 7 天前')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-white/30 bg-white/70 text-slate-700"
                    onClick={() => cleanupCompletedTodos(30)}
                  >
                    {t('Clear 30+ days', '清理 30 天前')}
                  </Button>
                </div>
              </section>

              <Button onClick={logout} className="w-full bg-slate-700 text-white hover:bg-slate-800">
                {t('Sign Out', '退出登录')}
              </Button>
            </div>
          </OverlayShell>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickPromptCard({
  prompt,
  checkIn,
  selectedOption,
  onAnswer,
  onSayMore,
  onGoToHarbor,
  t,
}: {
  prompt: QuickPromptDefinition;
  checkIn?: QuickPromptCheckIn;
  selectedOption?: QuickPromptOption;
  onAnswer: (option: QuickPromptOption) => void;
  onSayMore: (returnFocus?: HTMLElement) => void;
  onGoToHarbor: () => void;
  t: (en: string, zh: string) => string;
}) {
  return (
    <section
      aria-label={t('Optional quick check-in', '可选的快速记录')}
      className="home-quick-card relative z-10 mt-1 w-[94%] rounded-[26px] border border-white/40 bg-[rgba(242,247,247,0.93)] px-4 py-3.5 text-slate-800 shadow-[0_16px_38px_rgba(7,34,42,0.18)] backdrop-blur-lg"
    >
      {!checkIn ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#587d86]">
                {t('Optional check-in', '可选记录')}
              </p>
              <h2 className="mt-1 text-[15px] font-semibold leading-5 text-slate-800">
                {t(prompt.questionEn, prompt.questionZh)}
              </h2>
            </div>
            <button
              type="button"
              onClick={(event) => onSayMore(event.currentTarget)}
              className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-[11px] font-medium text-[#507580] transition-colors hover:bg-[#e0eaeb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
            >
              {t('Say more', '多说一点')}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {prompt.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onAnswer(option)}
                className="cursor-pointer rounded-full border border-[#b8cdd1] bg-white/78 px-3 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:border-[#7199a2] hover:bg-[#e5eff0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
              >
                {t(option.en, option.zh)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#587d86]">
            {t('Noted for today', '今天已记下')}
          </p>
          <p className="mt-1.5 text-[14px] font-medium leading-5 text-slate-800">
            {selectedOption
              ? t(selectedOption.responseEn, selectedOption.responseZh)
              : t('I have made space for how I feel today.', '我已经为今天的感受留出了空间。')}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={(event) => onSayMore(event.currentTarget)}
              className="cursor-pointer rounded-full bg-[#6b98a2] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#5b8893] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
            >
              {t('Say more', '继续说说')}
            </button>
            {selectedOption?.offerHarbor && (
              <button
                type="button"
                onClick={onGoToHarbor}
                className="cursor-pointer rounded-full border border-[#87a6ad] bg-white/72 px-4 py-2 text-[12px] font-semibold text-[#365d67] transition-colors hover:bg-[#dfebed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
              >
                {t('Go to Harbor', '去栖息地')}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function OverlayLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}

function OverlayShell({
  title,
  onClose,
  children,
  className = 'z-30',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`absolute inset-0 ${className} flex items-center justify-center bg-slate-900/16 px-4 py-4 backdrop-blur-[2px]`}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="flex h-full max-h-[calc(100%-0.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[rgba(229,237,241,0.92)] shadow-[0_24px_80px_rgba(6,33,43,0.22)] backdrop-blur-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-300/45 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500/90">Mind Islands</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-800">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-white/35 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}
