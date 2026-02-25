import { motion } from 'motion/react';
import { MessageCircle, X, Menu, BarChart3, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { IllustratedCharacter } from '../components/IllustratedCharacter';
import { IslandCard } from '../components/IslandCard';
import { TodoPanel } from '../components/TodoPanel';
import { AIChat } from '../components/AIChat';
import { Button } from '../components/ui/button';
import { getDateKey, getNowInAppTimeZoneISO } from '../lib/time';

export function Hub() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { progress } = useMindIslands();
  const { user, logout } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [showDesktopTodoPanel, setShowDesktopTodoPanel] = useState(false); // Desktop todo panel visibility - NOW HIDDEN BY DEFAULT
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const handleBubbleNext = () => {
    if (avatarMessages.length <= 1) return;
    setBubbleIndex((prev) => (prev + 1) % avatarMessages.length);
  };
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (!progress.onboardingComplete) {
      navigate('/onboarding');
    }
  }, [progress.onboardingComplete, navigate]);

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

    if (!settings.avatarRemindersEnabled) {
      return [s('I will stay quiet for now. You can re-enable reminders in Health Island anytime.', '我先安静待着。你可以随时在健康岛重新开启提醒。')];
    }

    const completedIslandsToday = [
      progress.healthCheckIns.some((i) => i.date === today),
      progress.workDailyLogs.some((i) => i.date === today),
      progress.learningDailyLogs.some((i) => i.date === today),
      progress.relationshipLogs.some((i) => i.date === today),
      progress.curiosityLogs.some((i) => i.date === today),
      progress.compassionJournals.some((i) => i.date === today) || progress.breathingSessions.some((i) => i.date === today),
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

    const sleepTargetMin = toMinutes(settings.sleepTargetTime);
    const bedtimeReminderMin = sleepTargetMin - lead;
    if (
      nowMin >= bedtimeReminderMin &&
      !progress.healthCheckIns.some((i) => i.date === today && i.sleepTime)
    ) {
      messages.push(
        s("It's almost bedtime. Let me start slowing down now so tomorrow feels easier.", '快到睡觉时间了。现在开始慢下来，明天会更轻松。'),
      );
    }

    const mealWindows = [
      {
        label: s('breakfast', '早餐'),
        minute: toMinutes(settings.mealTimes.breakfast) - lead,
      },
      {
        label: s('lunch', '午餐'),
        minute: toMinutes(settings.mealTimes.lunch) - lead,
      },
      {
        label: s('dinner', '晚餐'),
        minute: toMinutes(settings.mealTimes.dinner) - lead,
      },
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

    const urgentReminder = pendingTodos.find((todo) => {
      if (!todo.remindAt) return false;
      const remind = new Date(todo.remindAt).getTime();
      const now = Date.now();
      return now >= remind && now <= remind + 60 * 60 * 1000;
    });
    if (urgentReminder) {
      messages.push(
        s(`Hey, reminder time: ${urgentReminder.text}. I'll do one small step first.`, `提醒时间到：${urgentReminder.text}。先做一个小步骤。`),
      );
    } else {
      const upcomingDeadline = pendingTodos
        .filter((todo) => todo.deadline)
        .sort(
          (a, b) =>
            new Date(a.deadline as string).getTime() -
            new Date(b.deadline as string).getTime(),
        )[0];

      if (upcomingDeadline) {
        const deadlineTs = new Date(upcomingDeadline.deadline as string).getTime();
        const leftHours = (deadlineTs - Date.now()) / (1000 * 60 * 60);
        if (leftHours > 0 && leftHours <= 24) {
          messages.push(
            s(
              `${upcomingDeadline.text} is due within 24 hours. I can start a little now and reduce stress later.`,
              `${upcomingDeadline.text} 将在 24 小时内到期。现在先开始一点，后面会轻松很多。`,
            ),
          );
        }
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
      messages.push(s("I noticed something new today. I'm not stuck in the same old loop.", '今天我发现了新东西。我没有陷在同样的循环里。'));
    }

    if (hasAchievementToday) {
      messages.push(s("Today's progress is visible. I'll keep this rhythm steady.", '今天的进展是看得见的。继续保持这个节奏。'));
    }

    if (completedIslandsToday === 0 && hour >= 12) {
      messages.push(
        s('No worries, I can restart with one tiny action. One short log is already a win.', '没关系，我可以从一个小动作重新开始。记录一小条就已经是胜利。'),
      );
    }

    if (messages.length === 0) {
      messages.push(s("Step by step. I'll take care of the next small thing.", '一步一步来。我先照顾好下一个小任务。'));
    }

    return messages;
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

  // Island positions optimized for laptop screens - arc arrangement above avatar
  // All islands positioned in an arc in the upper portion of the screen
  // Adjusted to avoid being covered by the todo panel on the right
  const islandPositions = [
    { x: 12, y: 30 },  // Island 1 - Far left (Health)
    { x: 26, y: 18 },  // Island 2 - Left upper (Work)
    { x: 40, y: 12 },  // Island 3 - Center-left upper (Learning)
    { x: 54, y: 12 },  // Island 4 - Center-right upper (Relationships)
    { x: 68, y: 18 },  // Island 5 - Right upper (Curiosity)
    { x: 80, y: 30 },  // Island 6 - Far right (Self Compassion) - moved left to avoid todo panel
  ];

  // Character position - bottom-middle of screen
  const characterPosition = { x: 50, y: 72 };

  return (
    <div className="h-screen overflow-hidden relative">
      {/* Main hub area - always full width */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Starry background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4f] to-[#1a0f2e]">
          {/* Stars */}
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-6 relative z-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-medium text-foreground mb-2">{t('Mind Islands', '心灵群岛')}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {t('Welcome back! Care for your islands, care for yourself 🌙', '欢迎回来！照顾你的岛屿，也是在照顾你自己 🌙')}
                </p>
                {user && (
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {t('Signed in as', '已登录账号')}: {user.email}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                {/* Insights button */}
                <Button
                  onClick={() => navigate('/insights')}
                  className="hidden md:flex md:fixed md:top-4 md:right-[180px] z-[79] bg-secondary/20 hover:bg-secondary/30 text-foreground"
                  size="sm"
                  title={t('View your progress summary, streaks, and achievements across all islands', '查看你在所有岛屿上的进度、连胜与成就')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('Insights', '洞察')}
                </Button>
                
                {/* Mobile menu button */}
                <Button
                  onClick={() => setShowTodoPanel(!showTodoPanel)}
                  className="md:hidden bg-primary/20 hover:bg-primary/30 text-foreground"
                  size="sm"
                >
                  <Menu className="w-5 h-5" />
                </Button>

                <Button
                  onClick={() => logout()}
                  variant="outline"
                  className="bg-background/20 border-white/20 hover:bg-background/30 text-foreground"
                  size="sm"
                  title={t('Sign out', '退出登录')}
                >
                  <LogOut className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{t('Sign Out', '退出')}</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Islands, Character, and Paths Container */}
          <div className="flex-1 relative min-h-0">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              {/* Paths from character to each island */}
              {progress.islands.map((island, index) => {
                const islandPos = islandPositions[index];
                const startX = characterPosition.x;
                const startY = characterPosition.y;
                const endX = islandPos.x;
                const endY = islandPos.y;
                
                return (
                  <motion.path
                    key={island.id}
                    d={`M ${startX}% ${startY}% Q ${(startX + endX) / 2}% ${(startY + endY) / 2 - 5}% ${endX}% ${endY}%`}
                    stroke={island.color}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                    opacity="0.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.5 }}
                    transition={{ duration: 1.5, delay: index * 0.1 }}
                  />
                );
              })}
            </svg>

            {/* Central Character */}
            <motion.div 
              className="absolute z-20"
              style={{
                left: `${characterPosition.x}%`,
                top: `${characterPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative flex flex-col items-center gap-2">
                <motion.div
                  key={`${bubbleIndex}-${avatarMessages[bubbleIndex]}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 max-w-[85vw] px-4 py-3 rounded-2xl bg-card/90 backdrop-blur-xl border border-white/20 shadow-xl"
                >
                  <p className="text-xs md:text-sm text-foreground leading-relaxed text-center">
                    {avatarMessages[bubbleIndex]}
                  </p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-card/90 border-r border-b border-white/20 rotate-45" />
                </motion.div>
                <button
                  type="button"
                  onClick={handleBubbleNext}
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  title={
                    avatarMessages.length > 1
                      ? t('Click to see another self-reminder', '点击查看下一条自我提醒')
                      : t('Your current self-reminder', '当前自我提醒')
                  }
                >
                  <IllustratedCharacter
                    type={progress.character.type}
                    mood={progress.character.mood}
                    size="lg"
                  />
                </button>
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-base text-foreground/90 font-medium">{progress.character.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{progress.character.mood}</p>
                  <p className="text-xs text-muted-foreground">Lv {progress.character.level}</p>
                  {avatarMessages.length > 1 && (
                    <p className="mt-1 text-[11px] text-muted-foreground/80">{t('Click avatar to switch message', '点击头像切换提示语')}</p>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Floating Islands */}
            {progress.islands.map((island, index) => (
              <IslandCard
                key={island.id}
                island={island}
                position={islandPositions[index]}
                delay={index * 0.1}
              />
            ))}
          </div>

          {/* Bottom action buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-6 left-6 z-30 flex gap-3"
          >
            <Button
              onClick={() => setShowChat(!showChat)}
              className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-full w-14 h-14 shadow-lg"
            >
              {showChat ? (
                <X className="w-6 h-6" />
              ) : (
                <MessageCircle className="w-6 h-6" />
              )}
            </Button>
            
            {/* Mobile insights button */}
            <Button
              onClick={() => navigate('/insights')}
              className="md:hidden bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full w-14 h-14 shadow-lg"
            >
              <BarChart3 className="w-6 h-6" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Todo Panel - Desktop (overlay on right side) */}
      <motion.div
        className="hidden md:block fixed right-0 top-0 bottom-0 z-30"
        initial={false}
        animate={{ x: showDesktopTodoPanel ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <TodoPanel />
      </motion.div>
      
      {/* Toggle button for desktop todo panel - fixed position */}
      <motion.button
        onClick={() => setShowDesktopTodoPanel(!showDesktopTodoPanel)}
        className="hidden md:flex fixed top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-xl border border-border rounded-l-lg hover:bg-card transition-colors shadow-lg z-[60] items-center gap-2 pr-3 pl-2 py-3"
        animate={{ right: showDesktopTodoPanel ? '320px' : '0' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={showDesktopTodoPanel ? t('Hide To-Do List', '隐藏待办列表') : t('Show To-Do List', '显示待办列表')}
      >
        {showDesktopTodoPanel ? (
          <>
            <ChevronRight className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{t('Hide', '隐藏')}</span>
          </>
        ) : (
          <>
            <ChevronLeft className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{t('To-Do', '待办')}</span>
          </>
        )}
      </motion.button>

      {/* Todo Panel - Mobile Overlay */}
      {showTodoPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden absolute inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setShowTodoPanel(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <TodoPanel />
          </motion.div>
        </motion.div>
      )}

      {/* AI Chat Overlay */}
      {showChat && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4 md:p-6"
          onClick={() => setShowChat(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="h-[min(92vh,760px)] min-h-[420px] w-full max-w-2xl overflow-hidden md:min-h-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            <AIChat />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
