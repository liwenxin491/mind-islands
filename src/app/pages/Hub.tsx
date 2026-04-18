import { AnimatePresence, motion } from 'motion/react';
import {
  CheckSquare,
  Home,
  MessageCircle,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { IllustratedCharacter } from '../components/IllustratedCharacter';
import { AIChat } from '../components/AIChat';
import { Button } from '../components/ui/button';
import { FloatingIsland } from '../components/FloatingIsland';
import { TodoPanel } from '../components/TodoPanel';
import { getDateKey, getNowInAppTimeZoneISO } from '../lib/time';
import type { Island, IslandType } from '../types';
import backgroundImage from '../../assets/background-new.png';
import bubbleFrame from '../../assets/bubble-filled.png';

type MobileView = 'home' | 'memories';
type MobileOverlay = 'chat' | 'todo' | 'settings' | null;

const MEMORY_ISLAND_IDS: IslandType[] = ['body', 'work', 'learning', 'relationships'];

export function Hub() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { progress, cleanupCompletedTodos } = useMindIslands();
  const { logout } = useAuth();

  const isPreviewMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }, []);

  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('home');
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>(null);

  useEffect(() => {
    if (!progress.onboardingComplete && !isPreviewMode) {
      navigate('/onboarding');
    }
  }, [progress.onboardingComplete, isPreviewMode, navigate]);

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
          'I will stay quiet for now. You can re-enable reminders in Health Island anytime.',
          '我先安静待着。你可以随时在健康岛重新开启提醒。',
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

  const homeDestinationCards = [
    {
      id: 'memories',
      title: t('Memories Island', '记忆岛'),
      size: 'large' as const,
      className: 'col-span-2 mx-auto w-[78%]',
      onClick: () => setMobileView('memories'),
    },
    {
      id: 'inspiration',
      title: t('Inspiration Island', '灵感岛'),
      size: 'small' as const,
      className: 'justify-self-start w-[92%]',
      onClick: () => navigate('/island/curiosity'),
    },
    {
      id: 'harbor',
      title: t('Harbor Island', '栖息地'),
      size: 'small' as const,
      className: 'justify-self-end w-[92%]',
      onClick: () => navigate('/island/compassion'),
    },
  ];

  const memoryIslands = MEMORY_ISLAND_IDS
    .map((id) => progress.islands.find((island) => island.id === id))
    .filter(Boolean) as Island[];

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
            mobileView={mobileView}
            setMobileView={setMobileView}
            mobileOverlay={mobileOverlay}
            setMobileOverlay={setMobileOverlay}
            cards={homeDestinationCards}
            memoryIslands={memoryIslands}
            bubbleMessage={avatarMessages[bubbleIndex]}
            canCycle={avatarMessages.length > 1}
            onBubbleClick={cycleBubble}
            onOtterClick={() => setMobileOverlay('chat')}
            t={t}
            progressName={progress.character.name}
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
  mobileView,
  setMobileView,
  mobileOverlay,
  setMobileOverlay,
  cards,
  memoryIslands,
  bubbleMessage,
  canCycle,
  onBubbleClick,
  onOtterClick,
  t,
  progressName,
  activeTodosCount,
  cleanupCompletedTodos,
  logout,
  language,
  setLanguage,
  navigate,
}: {
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  mobileOverlay: MobileOverlay;
  setMobileOverlay: (overlay: MobileOverlay) => void;
  cards: Array<{ id: string; title: string; size: 'large' | 'small'; className: string; onClick: () => void }>;
  memoryIslands: Island[];
  bubbleMessage: string;
  canCycle: boolean;
  onBubbleClick: () => void;
  onOtterClick: () => void;
  t: (en: string, zh: string) => string;
  progressName: string;
  activeTodosCount: number;
  cleanupCompletedTodos: (olderThanDays: number) => number;
  logout: () => void;
  language: 'en' | 'zh';
  setLanguage: (language: 'en' | 'zh') => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const memoriesCount = memoryIslands.reduce((acc, island) => acc + island.streak, 0);

  return (
    <div className="relative flex h-full flex-col overflow-hidden px-4 pb-5 pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative flex-1">
        {mobileView === 'home' ? (
          <div className="flex h-full flex-col">
            <div className="mt-4 grid grid-cols-2 gap-4 px-1">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className={`${card.className} ${card.size === 'large' ? 'h-28' : 'h-20'} rounded-[28px] border border-white/12 bg-[rgba(218,231,236,0.42)] px-5 text-left text-slate-800 shadow-[0_16px_40px_rgba(7,35,43,0.18)] backdrop-blur-md transition hover:bg-[rgba(224,235,239,0.5)]`}
                >
                  <span className={`block ${card.size === 'large' ? 'pt-8 text-2xl' : 'pt-5 text-lg'} font-semibold tracking-tight`}>
                    {card.title}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative mt-4 flex flex-1 flex-col items-center justify-end pb-28">
              <button
                type="button"
                onClick={onBubbleClick}
                className={`otter-bob-bubble absolute left-1/2 top-[8.5%] w-[76%] max-w-sm text-center ${canCycle ? 'cursor-pointer' : ''}`}
              >
                <div className="relative" style={{ aspectRatio: '435 / 176' }}>
                  <img
                    src={bubbleFrame}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                  />
                  <div className="absolute inset-[14%_11%_24%_11%] flex items-center justify-center">
                    <p
                      className="text-[14px] leading-6 text-slate-900"
                    >
                      {bubbleMessage}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onOtterClick}
                className="otter-bob-otter relative z-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <IllustratedCharacter type="otter" mood="neutral" size="xl" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="mt-3 px-2 text-center">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-100/70">{t('Memories Layer', '记忆层')}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">{t('Memories Island', '记忆岛')}</h2>
              <p className="mt-2 text-sm text-slate-100/80">
                {t('Choose one memory island below.', '选择一个记忆子岛继续查看。')}
              </p>
              {memoriesCount > 0 && (
                <p className="mt-2 text-xs text-slate-100/65">
                  {t(`${memoriesCount} active streak points across memory islands`, `当前累计 ${memoriesCount} 个记忆连胜点`) }
                </p>
              )}
            </div>

            <div className="mt-6 grid flex-1 grid-cols-2 gap-x-3 gap-y-12 px-2 pb-28 pt-3">
              {memoryIslands.map((island) => {
                const typeMap: Record<IslandType, 'health' | 'work' | 'learning' | 'relationships' | 'curiosity' | 'compassion'> = {
                  body: 'health',
                  work: 'work',
                  learning: 'learning',
                  relationships: 'relationships',
                  curiosity: 'curiosity',
                  compassion: 'compassion',
                };
                const routeMap: Record<IslandType, string> = {
                  body: '/island/body',
                  work: '/island/work',
                  learning: '/island/learning',
                  relationships: '/island/relationships',
                  curiosity: '/island/curiosity',
                  compassion: '/island/compassion',
                };
                return (
                  <button
                    key={island.id}
                    type="button"
                    onClick={() => navigate(routeMap[island.id])}
                    className="flex flex-col items-center justify-start rounded-[30px] bg-transparent px-2 py-2 text-center transition hover:bg-white/5"
                  >
                    <div className="relative h-40 w-full">
                      <FloatingIsland type={typeMap[island.id]} color={island.color} glow={island.completedToday} />
                    </div>
                    <span className="-mt-1 rounded-full bg-[rgba(235,243,246,0.8)] px-3 py-1 text-sm font-medium text-slate-800 backdrop-blur-md">
                      {island.id === 'body' ? t('Health', '健康') : island.id === 'relationships' ? t('Relationship', '关系') : island.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-900/22 via-slate-900/8 to-transparent" />

      <div className="absolute inset-x-4 bottom-5 z-20">
        <div className="relative rounded-[32px] border border-white/25 bg-white/90 px-3 pb-3 pt-3 shadow-[0_20px_60px_rgba(6,33,43,0.26)] backdrop-blur-xl">
          <div className="grid grid-cols-5 items-end gap-1 text-center text-slate-600">
            <NavButton
              icon={<Home className="h-6 w-6" />}
              label={t('Home', '首页')}
              active={mobileView === 'home' && mobileOverlay === null}
              onClick={() => {
                setMobileOverlay(null);
                setMobileView('home');
              }}
            />
            <NavButton
              icon={<Sparkles className="h-6 w-6" />}
              label={t('Memories', '记忆')}
              active={mobileView === 'memories' && mobileOverlay === null}
              onClick={() => {
                setMobileOverlay(null);
                setMobileView('memories');
              }}
            />
            <div className="relative flex justify-center">
              <button
                type="button"
                onClick={() => setMobileOverlay('chat')}
                className="-mt-7 flex h-16 w-16 appearance-none flex-col items-center justify-center rounded-full border-0 bg-[#6b98a2] text-white outline-none ring-0 shadow-[0_10px_24px_rgba(22,68,79,0.18)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="mt-0.5 text-[10px] font-semibold leading-none">{t('Quick Log', '速记')}</span>
              </button>
            </div>
            <NavButton
              icon={<CheckSquare className="h-6 w-6" />}
              label={t('To-do', '待办')}
              active={mobileOverlay === 'todo'}
              badge={activeTodosCount > 0 ? String(activeTodosCount) : undefined}
              onClick={() => setMobileOverlay('todo')}
            />
            <NavButton
              icon={<User className="h-6 w-6" />}
              label={t('Settings', '设置')}
              active={mobileOverlay === 'settings'}
              onClick={() => setMobileOverlay('settings')}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOverlay === 'chat' && (
          <OverlayShell title={t('Quick Log', '速记')} onClose={() => setMobileOverlay(null)}>
            <AIChat variant="overlay" />
          </OverlayShell>
        )}

        {mobileOverlay === 'todo' && (
          <OverlayShell title={t('To-do', '待办')} onClose={() => setMobileOverlay(null)}>
            <TodoPanel variant="overlay" />
          </OverlayShell>
        )}

        {mobileOverlay === 'settings' && (
          <OverlayShell title={t('Settings', '设置')} onClose={() => setMobileOverlay(null)}>
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
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('Navigation', '导航')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Button variant="outline" className="justify-start border-white/30 bg-white/70 text-slate-700" onClick={() => navigate('/insights')}>
                    {t('Insights', '洞察')}
                  </Button>
                  <Button variant="outline" className="justify-start border-white/30 bg-white/70 text-slate-700" onClick={() => navigate('/island/curiosity')}>
                    {t('Inspiration', '灵感')}
                  </Button>
                  <Button variant="outline" className="justify-start border-white/30 bg-white/70 text-slate-700" onClick={() => navigate('/island/compassion')}>
                    {t('Harbor', '栖息地')}
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

function NavButton({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition ${
        active ? 'bg-[#e4ecec] text-[#5d8690]' : 'text-slate-600'
      }`}
    >
      {badge && <span className="absolute -right-1 top-1 rounded-full bg-[#6b98a2] px-1.5 text-[10px] text-white">{badge}</span>}
      {icon}
      <span>{label}</span>
    </button>
  );
}

function OverlayShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/16 px-4 py-4 backdrop-blur-[2px]"
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
