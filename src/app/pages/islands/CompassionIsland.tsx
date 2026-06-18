import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle, Wind, BookHeart, Send, Sparkles, Pencil, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import { formatTime24, getDateKey, getNowInAppTimeZoneISO } from '../../lib/time';

const COMPASSION_CHAT_STORAGE_PREFIX = 'mindIslands:compassionChatHistory';

type HarborGuardrailLevel = 'support' | 'elevated' | 'dangerous_request' | 'crisis';
type HarborGuardrailAction = 'comfort' | 'refuse' | 'handoff';
type HarborInterventionType = 'dbt_abc' | 'grounding' | 'emotion_reflection';
type HarborResourceKind = 'phone' | 'text' | 'link' | 'emergency';

interface HarborGuardrail {
  level: HarborGuardrailLevel;
  action: HarborGuardrailAction;
  shouldShowResourceCard: boolean;
  reason?: string;
}

interface HarborIntervention {
  type: HarborInterventionType;
  title: string;
  intro: string;
  prompts: Array<{ label: string; question: string }>;
  closingPrompt: string;
}

interface HarborResource {
  label: string;
  value: string;
  kind: HarborResourceKind;
}

interface HarborChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  guardrail?: HarborGuardrail;
  intervention?: HarborIntervention | null;
  resources?: HarborResource[];
}

interface HarborChatResponse {
  reply?: string;
  guardrail?: unknown;
  intervention?: unknown;
  resources?: unknown;
}

interface HarborLocationState {
  quickLogHandoff?: {
    message?: string;
    level?: HarborGuardrailLevel;
    createdAt?: string;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object');

const isGuardrailLevel = (value: unknown): value is HarborGuardrailLevel =>
  value === 'support' || value === 'elevated' || value === 'dangerous_request' || value === 'crisis';

const isGuardrailAction = (value: unknown): value is HarborGuardrailAction =>
  value === 'comfort' || value === 'refuse' || value === 'handoff';

const isInterventionType = (value: unknown): value is HarborInterventionType =>
  value === 'dbt_abc' || value === 'grounding' || value === 'emotion_reflection';

const isResourceKind = (value: unknown): value is HarborResourceKind =>
  value === 'phone' || value === 'text' || value === 'link' || value === 'emergency';

const normalizeHarborGuardrail = (value: unknown): HarborGuardrail | undefined => {
  if (!isRecord(value) || !isGuardrailLevel(value.level)) return undefined;
  return {
    level: value.level,
    action: isGuardrailAction(value.action) ? value.action : 'comfort',
    shouldShowResourceCard: Boolean(value.shouldShowResourceCard),
    reason: typeof value.reason === 'string' ? value.reason : undefined,
  };
};

const normalizeHarborIntervention = (value: unknown): HarborIntervention | null => {
  if (!isRecord(value) || !isInterventionType(value.type)) return null;
  const prompts = Array.isArray(value.prompts)
    ? value.prompts
        .map((prompt) => {
          if (!isRecord(prompt)) return null;
          const label = typeof prompt.label === 'string' ? prompt.label.trim() : '';
          const question = typeof prompt.question === 'string' ? prompt.question.trim() : '';
          return label && question ? { label, question } : null;
        })
        .filter((prompt): prompt is { label: string; question: string } => Boolean(prompt))
        .slice(0, 4)
    : [];
  if (prompts.length === 0) return null;

  return {
    type: value.type,
    title: typeof value.title === 'string' ? value.title : '',
    intro: typeof value.intro === 'string' ? value.intro : '',
    prompts,
    closingPrompt: typeof value.closingPrompt === 'string' ? value.closingPrompt : '',
  };
};

const normalizeHarborResources = (value: unknown): HarborResource[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((resource) => {
      if (!isRecord(resource)) return null;
      const label = typeof resource.label === 'string' ? resource.label.trim() : '';
      const itemValue = typeof resource.value === 'string' ? resource.value.trim() : '';
      const kind = isResourceKind(resource.kind) ? resource.kind : 'link';
      return label && itemValue ? { label, value: itemValue, kind } : null;
    })
    .filter((resource): resource is HarborResource => Boolean(resource))
    .slice(0, 6);
};

const loadCompassionChatHistory = (storageKey: string): HarborChatMessage[] => {
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
        guardrail: normalizeHarborGuardrail(item?.guardrail),
        intervention: normalizeHarborIntervention(item?.intervention),
        resources: normalizeHarborResources(item?.resources),
      }))
      .filter((item) => item.content.trim().length > 0)
      .slice(-200);
  } catch {
    return [];
  }
};

export function CompassionIsland() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const {
    progress,
    addCompassionJournal,
    updateCompassionJournal,
    deleteCompassionJournal,
    addBreathingSession,
    addMemoryEntry,
    profileSummary,
    memorySettings,
  } = useMindIslands();
  const [activeTab, setActiveTab] = useState<'chat' | 'breathe' | 'journal'>('chat');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  
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
  const [chatHistory, setChatHistory] = useState<HarborChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const consumedQuickLogHandoffRef = useRef<string | null>(null);
  const compassionChatStorageKey = `${COMPASSION_CHAT_STORAGE_PREFIX}:${user?.id || 'anonymous'}:v1`;

  const clip = (value?: string, max = 160) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 1)}…`;
  };

  const compassionContext = useMemo(() => {
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
      memoryProfilePreview: {
        enabled: memorySettings.aiPersonalizationEnabled && memorySettings.harborMemoryEnabled,
        knownStressors: profileSummary?.knownStressors?.slice(0, 3) || [],
        helpfulSupportStyle: profileSummary?.helpfulSupportStyle?.slice(0, 3) || [],
        copingStrategies: profileSummary?.copingStrategies?.slice(0, 3) || [],
        pinnedMemories: profileSummary?.pinnedMemories?.slice(0, 3) || [],
      },
    };
  }, [memorySettings.aiPersonalizationEnabled, memorySettings.harborMemoryEnabled, profileSummary, progress, today]);

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

  const handleSendMessage = async (messageOverride?: string) => {
    const trimmed = (messageOverride ?? chatInput).trim();
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

      const result = (await response.json()) as HarborChatResponse;
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
        guardrail: normalizeHarborGuardrail(result.guardrail),
        intervention: normalizeHarborIntervention(result.intervention),
        resources: normalizeHarborResources(result.resources),
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

  const isHarborContentSavedToMemories = (content: string) =>
    progress.memoryEntries.some(
      (entry) => entry.source === 'harbor-saved' && entry.content === content.trim(),
    );

  const saveHarborContentToMemories = (title: string, content: string, date: string) => {
    if (!content.trim() || isHarborContentSavedToMemories(content)) return;
    addMemoryEntry({
      date,
      title,
      content: content.trim(),
      tags: [t('reflection', '反思')],
      source: 'harbor-saved',
      template: 'general',
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  const conversationSummary = chatHistory
    .slice(-2)
    .map((message) => `${message.role === 'user' ? t('Me', '我') : t('Reflection', '回应')}: ${message.content}`)
    .join('\n');

  useEffect(() => {
    setChatHistory(loadCompassionChatHistory(compassionChatStorageKey));
  }, [compassionChatStorageKey]);

  useEffect(() => {
    const state = location.state as HarborLocationState | null;
    const handoff = state?.quickLogHandoff;
    const handoffMessage = handoff?.message?.trim();
    if (!handoffMessage) return;

    const key = `${handoff.createdAt || 'handoff'}:${handoffMessage}`;
    if (consumedQuickLogHandoffRef.current === key) return;
    consumedQuickLogHandoffRef.current = key;
    setActiveTab('chat');
    window.setTimeout(() => {
      void handleSendMessage(handoffMessage);
    }, 0);
    navigate(location.pathname, { replace: true, state: null });
    // This effect should only react to a route-level Quick Log handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state, navigate]);

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

  const getResourceHref = (resource: HarborResource) => {
    if (resource.kind === 'phone') return `tel:${resource.value.replace(/[^\d+]/g, '') || resource.value}`;
    if (resource.kind === 'text') return `sms:${resource.value.replace(/[^\d+]/g, '') || resource.value}`;
    if (resource.kind === 'link') return resource.value;
    return '';
  };

  const renderSupportResourceCard = (resources: HarborResource[]) => (
    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-slate-800 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-800">
        <AlertTriangle className="h-4 w-4" />
        {t('Human support is important right now', '现在需要真人支持')}
      </div>
      <div className="space-y-2">
        {resources.map((resource, index) => {
          const href = getResourceHref(resource);
          const key = `${resource.kind}-${resource.value}-${index}`;
          if (!href) {
            return (
              <div key={key} className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700">
                <div className="font-medium text-slate-800">{resource.label}</div>
                <div>{resource.value}</div>
              </div>
            );
          }
          return (
            <a
              key={key}
              href={href}
              target={resource.kind === 'link' ? '_blank' : undefined}
              rel={resource.kind === 'link' ? 'noreferrer' : undefined}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/75 px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-white"
            >
              <span>
                <span className="block font-medium text-slate-800">{resource.label}</span>
                <span className="break-all">{resource.value}</span>
              </span>
              {resource.kind === 'link' && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
            </a>
          );
        })}
      </div>
    </div>
  );

  const renderInterventionCard = (intervention: HarborIntervention) => (
    <div className="mt-2 rounded-xl border border-[#b8d2d7] bg-white/80 p-3 text-slate-800 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#527a84]">
        <Sparkles className="h-4 w-4" />
        {intervention.title || t('A tiny support card', '一张很小的支持卡')}
      </div>
      {intervention.intro && <p className="mb-3 text-xs text-slate-600">{intervention.intro}</p>}
      <div className="space-y-2">
        {intervention.prompts.map((prompt, index) => (
          <div key={`${prompt.label}-${index}`} className="rounded-lg bg-[#eef6f7] px-3 py-2 text-xs">
            <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6b98a2] px-1.5 text-[11px] font-semibold text-white">
              {prompt.label}
            </span>
            <span className="text-slate-700">{prompt.question}</span>
          </div>
        ))}
      </div>
      {intervention.closingPrompt && (
        <p className="mt-3 text-xs font-medium text-[#527a84]">{intervention.closingPrompt}</p>
      )}
    </div>
  );

  return (
    <SceneShell>
      <div className="harbor-screen mx-auto max-w-6xl space-y-4 px-4 pb-8 pt-5 text-slate-800">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="harbor-surface flex items-center gap-3 rounded-2xl p-3"
        >
          <Button onClick={() => navigate('/')} variant="ghost" aria-label={t('Back to home', '返回首页')} className="text-slate-700 hover:bg-white/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-medium text-slate-800">{t('Harbor', '栖息地')}</h1>
            <p className="text-sm text-slate-600">{t('Rest, reflect, or breathe', '休息、倾诉或呼吸')}</p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="harbor-surface flex gap-2 rounded-2xl p-2"
        >
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'bg-[#8bb3bc]/20 text-[#6b98a2]'
                : 'text-slate-500 hover:bg-white/55'
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
                : 'text-slate-500 hover:bg-white/55'
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
                : 'text-slate-500 hover:bg-white/55'
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
            className="harbor-surface flex h-[min(66dvh,500px)] flex-col rounded-2xl p-4"
          >
              <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-slate-800">
                <MessageCircle className="w-5 h-5" />
                {t('Self-Compassion Chat', '自我关怀对话')}
              </h2>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ${
                    apiStatus === 'ready'
                      ? 'bg-emerald-100 text-emerald-700'
                      : apiStatus === 'checking'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {apiStatus === 'ready'
                    ? t('AI connected', 'AI 已连接')
                    : apiStatus === 'checking'
                      ? t('Checking AI connection...', '正在检查 AI 连接...')
                      : t('AI offline (check backend / API key)', 'AI 离线（请检查后端 / API Key）')}
                </span>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                {t(
                  'This chat can reference recent saved context when it helps.',
                  '需要时，这个对话会参考近期已保存的内容。',
                )}
              </p>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 mb-4">
              {chatHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">{t('I am here to listen to myself', '我在这里听见自己')}</p>
                  <p className="text-sm">{t('Share what feels heavy or meaningful right now', '分享你现在感到沉重或有意义的事')}</p>
                </div>
              ) : (
                <>
                  {chatHistory.map((message) => {
                    const resources =
                      message.guardrail?.shouldShowResourceCard && message.resources
                        ? message.resources
                        : [];
                    const showResources = message.role === 'assistant' && resources.length > 0;
                    const showIntervention = message.role === 'assistant' && Boolean(message.intervention);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex max-w-[80%] flex-col ${
                            message.role === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-[#e6eff1] border border-[#c5dade] text-slate-800'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {formatTime24(message.timestamp)}
                            </p>
                          </div>
                          {showResources && renderSupportResourceCard(resources)}
                          {showIntervention && message.intervention && renderInterventionCard(message.intervention)}
                        </div>
                      </div>
                    );
                  })}
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
                className="flex-1 rounded-xl border border-[#c5dade] bg-white/80 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isChatSending || !chatInput.trim()}
                className="bg-[#6b98a2] hover:bg-[#5a8791]"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            {conversationSummary && (
              <button
                type="button"
                disabled={isHarborContentSavedToMemories(conversationSummary)}
                onClick={() =>
                  saveHarborContentToMemories(
                    t('A Harbor reflection I chose to keep', '我选择留下的栖息地反思'),
                    conversationSummary,
                    today,
                  )
                }
                className="mt-3 self-end rounded-full bg-[#e4eef0] px-4 py-2 text-xs font-medium text-[#527a84] disabled:opacity-50"
              >
                {isHarborContentSavedToMemories(conversationSummary)
                  ? t('Saved to Memories', '已保存到记忆')
                  : t('Save summary to Memories', '保存摘要到记忆')}
              </button>
            )}
          </motion.div>
        )}

        {/* Breathe Tab */}
        {activeTab === 'breathe' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="harbor-surface rounded-2xl p-5"
          >
            <h2 className="mb-6 flex items-center gap-2 text-xl font-medium text-slate-800">
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
            className="harbor-surface rounded-2xl p-5"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-medium text-slate-800">
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
                  className="min-h-40 w-full rounded-xl border border-[#c5dade] bg-white/80 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/50"
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
                      {mood}
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
                            {journal.mood && <div className="text-xs text-muted-foreground">{t('Mood', '感受')} {journal.mood}/5</div>}
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
                              disabled={isHarborContentSavedToMemories(journal.journalEntry)}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveHarborContentToMemories(
                                  t('A reflection I chose to keep', '我选择留下的反思'),
                                  journal.journalEntry,
                                  journal.date,
                                );
                              }}
                            >
                              {isHarborContentSavedToMemories(journal.journalEntry) ? t('Saved', '已保存') : t('Save to Memories', '保存到记忆')}
                            </Button>
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
