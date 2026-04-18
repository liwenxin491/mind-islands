import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Heart, MessageCircle, Wind, BookHeart, Send, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import { formatTime24, getDateKey, getNowInAppTimeZoneISO } from '../../lib/time';

const COMPASSION_CHAT_STORAGE_PREFIX = 'mindIslands:compassionChatHistory';

const loadCompassionChatHistory = (storageKey: string) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: typeof item?.id === 'string' ? item.id : `restored-${Math.random().toString(36).slice(2)}`,
        role: item?.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: typeof item?.content === 'string' ? item.content : '',
        timestamp:
          typeof item?.timestamp === 'string' && item.timestamp
            ? item.timestamp
            : getNowInAppTimeZoneISO(),
      }))
      .filter((item) => item.content.trim().length > 0)
      .slice(-200);
  } catch {
    return [];
  }
};

export function CompassionIsland() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const {
    progress,
    addCompassionJournal,
    updateCompassionJournal,
    deleteCompassionJournal,
    addBreathingSession,
  } = useMindIslands();
  const [activeTab, setActiveTab] = useState<'chat' | 'breathe' | 'journal'>('chat');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  
  const island = progress.islands.find(i => i.id === 'compassion');
  const today = getDateKey();
  const todayJournal = [...progress.compassionJournals].reverse().find(j => j.date === today);
  const editingJournal = editingJournalId
    ? progress.compassionJournals.find((journal) => journal.id === editingJournalId) || null
    : null;
  const activeJournal = editingJournal || todayJournal;

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const compassionChatStorageKey = `${COMPASSION_CHAT_STORAGE_PREFIX}:${user?.id || 'anonymous'}:v1`;

  const clip = (value?: string, max = 160) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 1)}…`;
  };

  const compassionContext = useMemo(() => {
    const byDateDesc = <T extends { date: string }>(items: T[]) =>
      [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const recentHealth = byDateDesc(progress.healthCheckIns).slice(0, 4).map((item) => ({
      date: item.date,
      sleepTime: item.sleepTime,
      wakeTime: item.wakeTime,
      workoutCompleted: item.workoutCompleted,
      workoutType: item.workoutType,
      workoutDuration: item.workoutDuration,
      energyLevel: item.energyLevel,
      notes: clip(item.notes, 120),
    }));

    const recentWork = byDateDesc(progress.workDailyLogs).slice(0, 4).map((item) => ({
      date: item.date,
      progressStep: clip(item.progressStep, 140),
      stressLevel: item.stressLevel,
      todaysWin: clip(item.todaysWin, 120),
    }));

    const recentLearning = byDateDesc(progress.learningDailyLogs).slice(0, 4).map((item) => ({
      date: item.date,
      focusedStudyMinutes: item.focusedStudyMinutes,
      whatILearned: clip(item.whatILearned, 140),
    }));

    const recentRelationships = byDateDesc(progress.relationshipLogs).slice(0, 4).map((item) => ({
      date: item.date,
      category: item.category,
      emotionalResult: item.emotionalResult,
      momentNote: clip(item.momentNote, 140),
      gratitudeNote: clip(item.gratitudeNote, 120),
    }));

    const recentCuriosity = byDateDesc(progress.curiosityLogs).slice(0, 4).map((item) => ({
      date: item.date,
      newThingNoticed: clip(item.newThingNoticed, 140),
      newSkillOrFact: clip(item.newSkillOrFact, 120),
    }));
    const recentCuriosityIdeas = byDateDesc(progress.curiosityIdeas).slice(0, 4).map((item) => ({
      date: item.date,
      title: clip(item.title, 100),
      content: clip(item.content, 160),
      tags: item.tags || [],
    }));

    const recentCompassion = byDateDesc(progress.compassionJournals).slice(0, 5).map((item) => ({
      date: item.date,
      mood: item.mood,
      reflectionPrompt: clip(item.reflectionPrompt, 100),
      journalEntry: clip(item.journalEntry, 160),
    }));

    const pendingTodos = progress.todos
      .filter((item) => !item.completed)
      .slice(0, 6)
      .map((item) => ({
        text: clip(item.text, 120),
        deadline: item.deadline,
        remindAt: item.remindAt,
      }));

    return {
      today,
      character: {
        mood: progress.character.mood,
        level: progress.character.level,
      },
      completionToday: progress.islands
        .filter((item) => item.completedToday)
        .map((item) => item.id),
      pendingTodos,
      recentRecords: {
        body: recentHealth,
        work: recentWork,
        learning: recentLearning,
        relationships: recentRelationships,
        curiosity: recentCuriosity,
        curiosityIdeas: recentCuriosityIdeas,
        compassion: recentCompassion,
      },
    };
  }, [progress, today]);

  // Breathing state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [breathDuration, setBreathDuration] = useState(0);

  // Journal state
  const [journalForm, setJournalForm] = useState({
    prompt: activeJournal?.reflectionPrompt || '',
    entry: activeJournal?.journalEntry || '',
    mood: activeJournal?.mood || 3,
  });

  const reflectionPrompts = [
    "What am I grateful for today?",
    "What did I do well today?",
    "What's one thing I can forgive myself for?",
    "How can I be kinder to myself right now?",
    "What would I say to a friend feeling the way I do?",
    "What small win can I celebrate today?",
  ];

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatSending) return;

    const userMessage = {
      id: `local-${Date.now()}-u`,
      role: 'user' as const,
      content: trimmed,
      timestamp: getNowInAppTimeZoneISO(),
    };
    const historyForRequest = [...chatHistory, userMessage]
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.content, timestamp: item.timestamp }));

    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const response = await fetch('/api/compassion-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForRequest,
          context: compassionContext,
          nowISO: getNowInAppTimeZoneISO(),
          preferredLanguage: language,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'compassion chat api failed');
      }
      setApiStatus('ready');

      const result = (await response.json()) as { reply?: string };
      const assistantMessage = {
        id: `local-${Date.now()}-a`,
        role: 'assistant' as const,
        content:
          result.reply?.trim() ||
          t(
            'I hear myself. I can take one gentle step right now, and that is enough.',
            '我听见自己了。现在做一个温和的小步骤就已经足够。',
          ),
        timestamp: getNowInAppTimeZoneISO(),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setApiStatus('offline');
      const detail = error instanceof Error ? error.message : String(error);
      const fallback = {
        id: `local-${Date.now()}-a`,
        role: 'assistant' as const,
        content:
          t(
            `I couldn't reach the AI service just now (${detail}). I'll pause, breathe, and try again in a moment.`,
            `刚刚暂时连不上 AI 服务（${detail}）。我先停一下、呼吸一下，稍后再试。`,
          ),
        timestamp: getNowInAppTimeZoneISO(),
      };
      setChatHistory((prev) => [...prev, fallback]);
      // eslint-disable-next-line no-console
      console.error('[CompassionIsland] chat request failed:', error);
    } finally {
      setIsChatSending(false);
    }
  };

  const startBreathing = (type: 'box-breathing' | 'deep-breathing' | '4-7-8') => {
    setBreathingActive(true);
    setBreathPhase('inhale');
    setBreathCount(0);
    setBreathDuration(0);
    
    // Start breathing cycle
    const interval = setInterval(() => {
      setBreathDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    if (breathDuration > 0) {
      addBreathingSession({
        date: today,
        duration: breathDuration,
        type: 'box-breathing',
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSaveJournal = () => {
    if (journalForm.entry.trim()) {
      const payload = {
        reflectionPrompt: journalForm.prompt,
        journalEntry: journalForm.entry,
        mood: journalForm.mood,
      };
      if (activeJournal) {
        updateCompassionJournal(activeJournal.id, payload);
      } else {
        addCompassionJournal({
          date: today,
          ...payload,
        });
      }
      setEditingJournalId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const openJournalEditor = (journalId?: string) => {
    const journal = journalId
      ? progress.compassionJournals.find((item) => item.id === journalId)
      : todayJournal;
    setEditingJournalId(journal?.id || null);
    setJournalForm({
      prompt: journal?.reflectionPrompt || '',
      entry: journal?.journalEntry || '',
      mood: journal?.mood || 3,
    });
    setActiveTab('journal');
  };

  const handleDeleteJournal = (journalId: string) => {
    if (!window.confirm('Delete this reflection log?')) return;
    deleteCompassionJournal(journalId);
    if (editingJournalId === journalId) {
      setEditingJournalId(null);
      setJournalForm({
        prompt: '',
        entry: '',
        mood: 3,
      });
    }
  };

  useEffect(() => {
    setChatHistory(loadCompassionChatHistory(compassionChatStorageKey));
  }, [compassionChatStorageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem(compassionChatStorageKey, JSON.stringify(chatHistory.slice(-200)));
  }, [chatHistory, compassionChatStorageKey]);

  useEffect(() => {
    let alive = true;
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('health check failed');
        const data = (await response.json()) as { ok?: boolean; hasKey?: boolean };
        if (!alive) return;
        setApiStatus(data.ok && data.hasKey ? 'ready' : 'offline');
      } catch {
        if (!alive) return;
        setApiStatus('offline');
      }
    };
    checkAPI();
    return () => {
      alive = false;
    };
  }, []);

  // Breathing cycle effect
  useEffect(() => {
    if (!breathingActive) return;

    const phases: Array<'inhale' | 'hold' | 'exhale' | 'rest'> = ['inhale', 'hold', 'exhale', 'rest'];
    const durations = { inhale: 4, hold: 4, exhale: 4, rest: 4 };
    
    let phaseTime = 0;
    const interval = setInterval(() => {
      phaseTime++;
      const currentPhaseDuration = durations[breathPhase];
      
      if (phaseTime >= currentPhaseDuration) {
        phaseTime = 0;
        const currentIndex = phases.indexOf(breathPhase);
        const nextPhase = phases[(currentIndex + 1) % phases.length];
        setBreathPhase(nextPhase);
        
        if (nextPhase === 'inhale') {
          setBreathCount(prev => prev + 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingActive, breathPhase]);

  useEffect(() => {
    if (activeTab !== 'journal') return;
    if (!activeJournal && editingJournalId) {
      setEditingJournalId(null);
    }
  }, [activeTab, activeJournal, editingJournalId]);

  useEffect(() => {
    if (activeTab !== 'journal') return;
    if (editingJournalId) return;
    setJournalForm({
      prompt: todayJournal?.reflectionPrompt || '',
      entry: todayJournal?.journalEntry || '',
      mood: todayJournal?.mood || 3,
    });
  }, [activeTab, todayJournal?.id, editingJournalId]);

  return (
    <SceneShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-foreground hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-medium text-foreground flex items-center gap-3">
                <span className="text-4xl">{island?.icon}</span>
                {island?.name}
              </h1>
              <p className="text-muted-foreground">{t('A safe space for reflection and care', '一个用于反思与自我照顾的安全空间')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: island?.color }}>
              {island?.streak} day streak
            </div>
          </div>
        </motion.div>

        {/* Gentle Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#8bb3bc]/12 to-[#6b98a2]/12 backdrop-blur-md border border-[#8bb3bc]/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-3">
            <Heart className="w-6 h-6 text-[#6b98a2] flex-shrink-0 mt-1" />
            <div>
              <p className="text-foreground mb-2">{t('This is your space to rest, reflect, and be kind to yourself.', '这是你用来休息、反思和善待自己的空间。')}</p>
              <p className="text-sm text-muted-foreground">{t("There's no pressure here. Take what you need.", '这里没有压力，只需要拿走你此刻需要的部分。')}</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-2"
        >
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'bg-[#8bb3bc]/20 text-[#6b98a2]'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">{t('Chat', '对话')}</span>
          </button>
          <button
            onClick={() => setActiveTab('breathe')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'breathe'
                ? 'bg-[#8bb3bc]/20 text-[#6b98a2]'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <Wind className="w-5 h-5" />
            <span className="font-medium">{t('Breathe', '呼吸')}</span>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'journal'
                ? 'bg-[#8bb3bc]/20 text-[#6b98a2]'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <BookHeart className="w-5 h-5" />
            <span className="font-medium">{t('Journal', '日志')}</span>
          </button>
        </motion.div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-[500px] flex flex-col"
          >
              <h2 className="text-xl font-medium text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {t('Self-Compassion Chat', '自我关怀对话')}
              </h2>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ${
                    apiStatus === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : apiStatus === 'checking'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-red-500/20 text-red-200'
                  }`}
                >
                  {apiStatus === 'ready'
                    ? t('AI connected', 'AI 已连接')
                    : apiStatus === 'checking'
                      ? t('Checking AI connection...', '正在检查 AI 连接...')
                      : t('AI offline (check backend / API key)', 'AI 离线（请检查后端 / API Key）')}
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t(
                  'This chat can reference your recent island records to respond with context.',
                  '这个对话会参考你最近的岛屿记录来给出更有上下文的回应。',
                )}
              </p>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 mb-4">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">{t('I am here to listen to myself', '我在这里听见自己')}</p>
                  <p className="text-sm">{t('Share what feels heavy or meaningful right now', '分享你现在感到沉重或有意义的事')}</p>
                </div>
              ) : (
                <>
                  {chatHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-[#8bb3bc]/10 border border-[#8bb3bc]/20 text-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {formatTime24(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t("Share what's on your mind...", '说说你现在的心情和想法...')}
                disabled={isChatSending}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isChatSending || !chatInput.trim()}
                className="bg-[#6b98a2] hover:bg-[#5a8791]"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Breathe Tab */}
        {activeTab === 'breathe' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
              <Wind className="w-5 h-5" />
              Breathing Exercise
            </h2>

            {!breathingActive ? (
              <div className="text-center space-y-8">
                <div className="space-y-3">
                  <p className="text-foreground">Take a moment to ground yourself</p>
                  <p className="text-sm text-muted-foreground">
                    Follow the visual guide to breathe deeply and release tension
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => startBreathing('box-breathing')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-colors"
                  >
                    <div className="text-lg font-medium text-foreground mb-2">Box Breathing</div>
                    <div className="text-sm text-muted-foreground">4-4-4-4 rhythm</div>
                  </button>
                  <button
                    onClick={() => startBreathing('deep-breathing')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-colors"
                  >
                    <div className="text-lg font-medium text-foreground mb-2">Deep Breathing</div>
                    <div className="text-sm text-muted-foreground">Calm and center</div>
                  </button>
                  <button
                    onClick={() => startBreathing('4-7-8')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-colors"
                  >
                    <div className="text-lg font-medium text-foreground mb-2">4-7-8 Method</div>
                    <div className="text-sm text-muted-foreground">Relaxation technique</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8">
                {/* Breathing Animation */}
                <div className="relative w-64 h-64 mx-auto">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8bb3bc]/22 to-[#6b98a2]/18 border-2 border-[#8bb3bc]/30"
                    animate={{
                      scale: breathPhase === 'inhale' ? 1.2 : breathPhase === 'exhale' ? 0.8 : 1,
                    }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-medium text-foreground capitalize mb-2">
                        {breathPhase}
                      </div>
                      <div className="text-muted-foreground">Cycle {breathCount}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Duration: {Math.floor(breathDuration / 60)}:{(breathDuration % 60).toString().padStart(2, '0')}
                  </div>
                  <Button onClick={stopBreathing} variant="outline">
                    End Session
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Journal Tab */}
        {activeTab === 'journal' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
                <BookHeart className="w-5 h-5" />
                Self-Compassion Journal
              </h2>
              {todayJournal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openJournalEditor(todayJournal.id)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Today
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {editingJournal && (
                <div className="text-xs text-muted-foreground">
                  Editing reflection from{' '}
                  {new Date(editingJournal.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
              {/* Reflection Prompts */}
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Choose a reflection prompt (optional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {reflectionPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setJournalForm({ ...journalForm, prompt })}
                      className={`text-left px-4 py-3 rounded-xl text-sm transition-all ${
                        journalForm.prompt === prompt
                          ? 'bg-[#8bb3bc]/18 border-2 border-[#6b98a2]/40 text-foreground'
                          : 'bg-white/5 border-2 border-transparent text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Journal Entry */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {journalForm.prompt || 'Your reflection'}
                </label>
                <textarea
                  value={journalForm.entry}
                  onChange={(e) => setJournalForm({ ...journalForm, entry: e.target.value })}
                  placeholder="Write freely, without judgment..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-48 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/50"
                />
              </div>

              {/* Mood Check */}
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">How are you feeling?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setJournalForm({ ...journalForm, mood })}
                      className={`flex-1 py-3 rounded-xl transition-all ${
                        journalForm.mood === mood
                          ? 'bg-[#6b98a2] text-white'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {mood === 1 && '😔'}
                      {mood === 2 && '😐'}
                      {mood === 3 && '🙂'}
                      {mood === 4 && '😊'}
                      {mood === 5 && '😄'}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveJournal}
                disabled={!journalForm.entry.trim()}
                className="w-full bg-[#6b98a2] hover:bg-[#5a8791]"
              >
                {editingJournal ? 'Update Reflection' : 'Save Reflection'}
              </Button>

              {/* Recent Journals */}
              {progress.compassionJournals.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h3 className="text-lg font-medium text-foreground mb-4">Recent Reflections</h3>
                  <div className="space-y-3">
                    {progress.compassionJournals
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3)
                      .map((journal) => (
                        <div
                          key={journal.id}
                          className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                          onDoubleClick={() => openJournalEditor(journal.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-muted-foreground">
                              {new Date(journal.date).toLocaleDateString('en-US', { 
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            {journal.mood && (
                              <div className="text-lg">
                                {journal.mood === 1 && '😔'}
                                {journal.mood === 2 && '😐'}
                                {journal.mood === 3 && '🙂'}
                                {journal.mood === 4 && '😊'}
                                {journal.mood === 5 && '😄'}
                              </div>
                            )}
                          </div>
                          {journal.reflectionPrompt && (
                            <div className="text-xs text-[#6b98a2] mb-1">{journal.reflectionPrompt}</div>
                          )}
                          <div className="text-sm text-foreground line-clamp-2">
                            {journal.journalEntry}
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openJournalEditor(journal.id);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteJournal(journal.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Success Feedback */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-[#6b98a2] to-[#8bb3bc] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <div>
                  <div className="font-medium">Well done</div>
                  <div className="text-sm opacity-90">You're taking care of yourself</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneShell>
  );
}
