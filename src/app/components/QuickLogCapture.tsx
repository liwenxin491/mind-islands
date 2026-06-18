import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, Loader2, Maximize2, Send, X } from 'lucide-react';
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../context/LanguageContext';
import { useMindIslands } from '../context/MindIslandsContext';
import { getNowInAppTimeZoneISO } from '../lib/time';
import type { AIInsightPayload } from '../types';

type QuickLogMode = 'closed' | 'composer' | 'conversation';
type QuickLogSource = 'global' | 'otter' | 'quick-check-in';

interface QuickLogContextValue {
  openComposer: (source?: QuickLogSource, returnFocus?: HTMLElement | null) => void;
}

interface ConversationHandoff {
  text: string;
  autoSend: boolean;
}

interface QuickLogCaptureHints {
  mood?: string;
  theme?: string;
  quickTextId?: string;
  quickTextSource?: string;
}

interface QuickLogChip {
  id: string;
  label: string;
  type: 'quickText' | 'mood' | 'theme';
  value: string;
  source?: string;
  text?: string;
}

interface PendingFollowup {
  originalMessage: string;
  followupQuestion: string;
}

interface PendingDraft {
  insight: AIInsightPayload;
  sourceMessage: string;
}

interface PendingSupportHandoff {
  destination: 'harbor';
  level: 'support' | 'elevated' | 'dangerous_request' | 'crisis';
  title: string;
  message: string;
  ctaLabel: string;
  sourceMessage: string;
}

type QuickLogPreviewTarget = NonNullable<AIInsightPayload['quickLogPreview']>['target'];

const QuickLogContext = createContext<QuickLogContextValue | null>(null);
const LazyAIChat = lazy(() =>
  import('./AIChat').then(({ AIChat }) => ({ default: AIChat })),
);

const hasMeaningfulEntry = (entry: unknown) => {
  if (!entry || typeof entry !== 'object') return false;
  return Object.values(entry as Record<string, unknown>).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return value === true;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
};

const compactText = (value = '', max = 52) => {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const getPreviewTargetLabel = (target: QuickLogPreviewTarget, t: (en: string, zh: string) => string) => {
  switch (target) {
    case 'todo':
      return t('To-do', '待办');
    case 'entry':
      return t('Check-in', '记录');
    case 'followup':
      return t('Needs one detail', '还差一个细节');
    case 'harbor':
      return t('Harbor', '栖息地');
    case 'memory':
    default:
      return t('Memory', '记忆');
  }
};

const buildDraftFallbackSummary = (insight: AIInsightPayload, sourceMessage: string) => {
  if (insight.quickLogPreview?.summary) return insight.quickLogPreview.summary;
  if (insight.todos?.[0]?.text) return insight.todos[0].text;
  if (insight.memory?.title) return insight.memory.title;
  if (insight.memory?.content) return insight.memory.content;
  return sourceMessage;
};

export function useQuickLog() {
  const context = useContext(QuickLogContext);
  if (!context) {
    throw new Error('useQuickLog must be used inside QuickLogProvider');
  }
  return context;
}

export function QuickLogProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { progress, memoryEvents, applyAIInsights, createMemoryEvent } = useMindIslands();
  const [mode, setMode] = useState<QuickLogMode>('closed');
  const [source, setSource] = useState<QuickLogSource>('global');
  const [composerText, setComposerText] = useState('');
  const [captureHints, setCaptureHints] = useState<QuickLogCaptureHints>({});
  const [pendingFollowup, setPendingFollowup] = useState<PendingFollowup | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [pendingSupportHandoff, setPendingSupportHandoff] = useState<PendingSupportHandoff | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [handoff, setHandoff] = useState<ConversationHandoff | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeDialogRef = useRef<HTMLElement>(null);
  const hasBottomNavigation =
    location.pathname === '/' ||
    location.pathname === '/memories' ||
    location.pathname === '/actions';

  useEffect(() => {
    setMode('closed');
    setComposerText('');
    setCaptureHints({});
    setPendingFollowup(null);
    setPendingDraft(null);
    setPendingSupportHandoff(null);
    setStatusMessage('');
    setHandoff(null);
  }, [location.pathname]);

  const quickTextChips = useMemo<QuickLogChip[]>(() => {
    const candidates = [
      ...memoryEvents.map((event) => ({
        text: event.sourceMessage || event.content || event.title,
        date: event.createdAt,
        source: 'memory',
      })),
      ...progress.memoryEntries.map((entry) => ({
        text: entry.content || entry.title,
        date: entry.createdAt,
        source: 'memory',
      })),
      ...progress.todos.map((todo) => ({
        text: todo.text,
        date: todo.deadline || '',
        source: 'todo',
      })),
    ]
      .map((item) => ({
        ...item,
        text: compactText(item.text, 64),
        time: item.date && Number.isFinite(new Date(item.date).getTime()) ? new Date(item.date).getTime() : 0,
      }))
      .filter((item) => item.text.length >= 6 && item.text.length <= 64)
      .sort((a, b) => b.time - a.time);

    const seen = new Set<string>();
    const chips: QuickLogChip[] = [];
    for (const item of candidates) {
      const key = item.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({
        id: `quick-${chips.length}-${key}`,
        label: item.text,
        type: 'quickText',
        value: item.text,
        text: item.text,
        source: item.source,
      });
      if (chips.length >= 3) break;
    }
    return chips;
  }, [memoryEvents, progress.memoryEntries, progress.todos]);

  const contextualChips = useMemo<QuickLogChip[]>(() => {
    const text = composerText.toLowerCase();
    const mood: QuickLogChip[] = [];
    const theme: QuickLogChip[] = [];
    const addMood = (value: string, label: string) => {
      if (!mood.some((chip) => chip.value === value)) {
        mood.push({ id: `mood-${value}`, label, type: 'mood', value });
      }
    };
    const addTheme = (value: string, label: string) => {
      if (!theme.some((chip) => chip.value === value)) {
        theme.push({ id: `theme-${value}`, label, type: 'theme', value });
      }
    };

    if (/tired|sleep|slept|rest|energy|累|困|睡|休息|精力/.test(text)) {
      addMood('tired', t('Tired', '累'));
      addTheme('body', t('Body', '身体'));
    }
    if (/proud|finished|done|win|progress|study|class|work|完成|推进|学习|上课|工作|进展/.test(text)) {
      addMood('proud', t('Proud', '有成就感'));
      addTheme('progress', t('Progress', '进展'));
    }
    if (/friend|family|call|message|talk|coffee|朋友|家人|联系|聊天|见面/.test(text)) {
      addMood('connected', t('Connected', '有连接'));
      addTheme('connection', t('Connection', '连接'));
    }
    if (/idea|noticed|curious|interesting|灵感|发现|好奇|想法/.test(text)) {
      addMood('curious', t('Curious', '好奇'));
      addTheme('idea', t('Idea', '灵感'));
    }
    if (/heavy|bad|overwhelmed|anxious|sad|stress|难受|焦虑|压力|心情不好|撑不住/.test(text)) {
      addMood('heavy', t('Heavy', '沉重'));
      addTheme('harbor', t('Harbor', '栖息地'));
    }

    if (mood.length + theme.length === 0 && composerText.trim()) {
      addMood('calm', t('Calm', '平静'));
      addMood('proud', t('Proud', '有成就感'));
      addTheme('progress', t('Progress', '进展'));
      addTheme('body', t('Body', '身体'));
    }

    return [...mood.slice(0, 2), ...theme.slice(0, 3)].slice(0, 5);
  }, [composerText, t]);

  const visibleChips = composerText.trim() ? contextualChips : quickTextChips;

  const openComposer = (
    nextSource: QuickLogSource = 'global',
    returnFocus: HTMLElement | null = null,
  ) => {
    setSource(nextSource);
    returnFocusRef.current = returnFocus;
    setCaptureHints({});
    setPendingFollowup(null);
    setPendingDraft(null);
    setPendingSupportHandoff(null);
    setStatusMessage('');
    setHandoff(null);
    setMode('composer');
  };

  const close = () => {
    setMode('closed');
    setComposerText('');
    setCaptureHints({});
    setPendingFollowup(null);
    setPendingDraft(null);
    setPendingSupportHandoff(null);
    setStatusMessage('');
    setHandoff(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const expand = (autoSend: boolean) => {
    setHandoff({ text: composerText.trim(), autoSend });
    setMode('conversation');
  };

  const handleChipClick = (chip: QuickLogChip) => {
    setStatusMessage('');
    if (chip.type === 'quickText') {
      setComposerText((current) => {
        const text = chip.text || chip.label;
        if (!current.trim()) return text;
        if (current.includes(text)) return current;
        return `${current.trim()}\n${text}`;
      });
      setCaptureHints((current) => ({
        ...current,
        quickTextId: chip.id,
        quickTextSource: chip.source || 'recent',
      }));
      return;
    }

    setCaptureHints((current) => {
      const key = chip.type;
      return {
        ...current,
        [key]: current[key] === chip.value ? undefined : chip.value,
      };
    });
  };

  const isChipSelected = (chip: QuickLogChip) => {
    if (chip.type === 'quickText') return captureHints.quickTextId === chip.id;
    return captureHints[chip.type] === chip.value;
  };

  const handleSubmit = async () => {
    const userInput = composerText.trim();
    if (!userInput || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage('');
    setPendingSupportHandoff(null);
    const sourceMessage = pendingDraft?.sourceMessage || pendingFollowup?.originalMessage || userInput;

    try {
      const response = await fetch('/api/chat-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          pendingContext: pendingFollowup,
          draftContext: pendingDraft
            ? { insight: pendingDraft.insight, sourceMessage: pendingDraft.sourceMessage }
            : null,
          routineSettings: progress.routineSettings,
          nowISO: getNowInAppTimeZoneISO(),
          preferredLanguage: language,
          captureHints,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'chat api failed');
      }

      const result = (await response.json()) as AIInsightPayload;
      const todoCount = Array.isArray(result.todos) ? result.todos.length : 0;
      const hasEntryDraft =
        Boolean(result.memory && hasMeaningfulEntry(result.memory)) ||
        Object.values(result.entries || {}).some((entry) => hasMeaningfulEntry(entry));

      if (result.supportHandoff?.destination === 'harbor') {
        setPendingSupportHandoff({
          ...result.supportHandoff,
          sourceMessage,
        });
        setPendingDraft(null);
        setPendingFollowup(null);
        setComposerText('');
        return;
      }

      if (result.needsFollowup) {
        setPendingFollowup({
          originalMessage: sourceMessage,
          followupQuestion:
            result.followupQuestion ||
            t(
              'Could you add one small detail?',
              '可以再补一个小细节吗？',
            ),
        });
        setPendingDraft(null);
        setComposerText('');
        return;
      }

      if (!hasEntryDraft && todoCount === 0) {
        setStatusMessage(
          t(
            'I need one more concrete detail before saving this.',
            '保存前还需要一个更具体的小细节。',
          ),
        );
        return;
      }

      setPendingFollowup(null);
      setPendingDraft({
        insight: result,
        sourceMessage,
      });
      setComposerText('');
    } catch (error) {
      setStatusMessage(
        t(
          "I couldn't reach the logging service just now. Please try again in a moment.",
          '暂时无法连接记录服务，请稍后再试。',
        ),
      );
      // eslint-disable-next-line no-console
      console.error('[QuickLogCapture] request failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!pendingDraft || isSaving) return;
    setIsSaving(true);
    setStatusMessage('');

    try {
      let memoriesAdded = 0;
      if (pendingDraft.insight.memory?.content?.trim()) {
        const draft = pendingDraft.insight.memory;
        const savedMemory = await createMemoryEvent({
          source: 'ai',
          title: draft.title,
          content: draft.content,
          tags: draft.tags || [],
          islands: pendingDraft.insight.detectedIslands || [],
          template: draft.template || 'general',
          fields: draft.fields,
          pinned: false,
          sensitivityLevel: 'normal',
          sourceMessage: pendingDraft.sourceMessage,
          profileSignals: pendingDraft.insight.profileSignals || [],
        });
        memoriesAdded = savedMemory ? 1 : 0;
      }

      const applied = applyAIInsights(
        pendingDraft.insight.memory
          ? { ...pendingDraft.insight, memory: undefined }
          : pendingDraft.insight,
        pendingDraft.sourceMessage,
      );
      const savedCount = memoriesAdded + applied.memoriesAdded + applied.todosAdded + applied.islands.length;
      setPendingDraft(null);
      setPendingFollowup(null);
      setCaptureHints({});
      setStatusMessage(
        savedCount > 0
          ? t('Saved.', '已保存。')
          : t('No duplicate was added.', '没有添加重复记录。'),
      );
      window.setTimeout(() => close(), 850);
    } catch (error) {
      setStatusMessage(t('I could not save that just now. Please try again.', '刚刚没能保存，请再试一次。'));
      // eslint-disable-next-line no-console
      console.error('[QuickLogCapture] save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDraft = () => {
    if (!pendingDraft) return;
    setComposerText(pendingDraft.sourceMessage);
    setPendingDraft(null);
    setStatusMessage('');
  };

  const handleDiscardDraft = () => {
    setPendingDraft(null);
    setPendingFollowup(null);
    setPendingSupportHandoff(null);
    setCaptureHints({});
    setStatusMessage('');
  };

  const openHarborFromHandoff = () => {
    if (!pendingSupportHandoff) return;
    navigate('/island/compassion', {
      state: {
        quickLogHandoff: {
          message: pendingSupportHandoff.sourceMessage,
          level: pendingSupportHandoff.level,
          createdAt: getNowInAppTimeZoneISO(),
        },
      },
    });
  };

  useEffect(() => {
    if (mode === 'closed') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || !activeDialogRef.current) return;

      const focusableElements = Array.from(
        activeDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !activeDialogRef.current.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  return (
    <QuickLogContext.Provider value={{ openComposer }}>
      {children}
      <AnimatePresence>
          {mode === 'composer' && (
            <motion.div
              key="quick-log-composer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-[1px]"
              onClick={close}
            >
              <motion.section
                ref={activeDialogRef}
                initial={{ opacity: 0, y: 38 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 27, stiffness: 280 }}
                role="dialog"
                aria-modal="true"
                aria-label={t('Quick Log composer', '速记输入')}
                data-entry-source={source}
                className={`absolute inset-x-0 mx-auto w-full max-w-[420px] border border-white/42 bg-[rgba(237,244,246,0.97)] px-4 pt-4 text-slate-800 shadow-[0_-14px_48px_rgba(6,33,43,0.22)] backdrop-blur-2xl ${
                  hasBottomNavigation
                    ? 'bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] rounded-[30px] pb-4 sm:bottom-[calc(4dvh+6.5rem)]'
                    : 'bottom-0 rounded-t-[30px] pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-[4dvh] sm:rounded-[30px]'
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5c8189]">
                      {t('Quick Log', '速记')}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {t("What's on your mind?", '此刻想记下什么？')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t('Close Quick Log', '关闭速记')}
                    className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <label htmlFor="quick-log-composer-input" className="text-xs font-medium text-slate-600">
                  {t('Write a quick note', '写一条记录')}
                </label>
	                <textarea
	                  id="quick-log-composer-input"
	                  autoFocus
	                  value={composerText}
	                  onChange={(event) => setComposerText(event.target.value)}
	                  placeholder={
                      pendingFollowup
                        ? t('Add one small detail...', '补一个小细节...')
                        : t('Something I want to remember...', '我想记住的是...')
                    }
	                  className="mt-2 min-h-[82px] w-full resize-none rounded-2xl border border-[#b9cdd2] bg-white/72 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:border-[#6b98a2] focus-visible:ring-2 focus-visible:ring-[#6b98a2]/35"
                    disabled={isSubmitting || isSaving}
	                />

                  {visibleChips.length > 0 && !pendingDraft && !pendingSupportHandoff && (
                    <div className="-mx-1 mt-3 flex max-h-[74px] gap-2 overflow-x-auto px-1 pb-1">
                      {visibleChips.map((chip) => {
                        const selected = isChipSelected(chip);
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => handleChipClick(chip)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? 'border-[#6b98a2] bg-[#d9e8eb] text-[#416a74] shadow-[0_4px_10px_rgba(67,106,116,0.12)]'
                                : 'border-white/65 bg-white/55 text-[#5f7883] hover:bg-white/80'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {pendingFollowup && (
                    <div className="mt-3 rounded-2xl border border-[#d4b36c]/35 bg-[#fff8e8]/75 px-3 py-2 text-xs leading-relaxed text-[#6f6248]">
                      {pendingFollowup.followupQuestion}
                    </div>
                  )}

                  {pendingDraft && (
                    <div className="mt-3 rounded-2xl border border-[#b9cdd2]/75 bg-white/62 p-3 text-slate-700 shadow-[0_8px_22px_rgba(54,84,96,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b8e98]">
                            {getPreviewTargetLabel(
                              pendingDraft.insight.quickLogPreview?.target || 'memory',
                              t,
                            )}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">
                            {compactText(
                              buildDraftFallbackSummary(pendingDraft.insight, pendingDraft.sourceMessage),
                              96,
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={isSaving}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#6b98a2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5a8791] disabled:opacity-55"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          {t('Save', '保存')}
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleEditDraft}
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-[#557983] transition hover:bg-white/70"
                        >
                          {t('Edit', '编辑')}
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-white/70"
                        >
                          {t('Discard', '丢弃')}
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingSupportHandoff && (
                    <div className="mt-3 rounded-2xl border border-[#b9cdd2]/75 bg-white/62 p-3 text-slate-700 shadow-[0_8px_22px_rgba(54,84,96,0.08)]">
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcebee] text-[#5f8f98]">
                          <Heart className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{pendingSupportHandoff.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {pendingSupportHandoff.message}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={openHarborFromHandoff}
                              className="rounded-full bg-[#6b98a2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5a8791]"
                            >
                              {pendingSupportHandoff.ctaLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingSupportHandoff(null)}
                              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/70"
                            >
                              {t('Not now', '暂时不用')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {statusMessage && (
                    <p className="mt-3 text-xs font-medium text-[#5f7883]">{statusMessage}</p>
                  )}

	                <div className="mt-3 flex justify-between gap-3">
	                  <button
	                    type="button"
	                    onClick={() => expand(false)}
	                    disabled={isSubmitting || isSaving}
	                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#507580] transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2] disabled:cursor-not-allowed disabled:opacity-45"
	                  >
	                    <Maximize2 className="h-4 w-4" />
	                    {t('Open conversation', '展开对话')}
	                  </button>
	                  <button
	                    type="button"
	                    disabled={!composerText.trim() || isSubmitting || isSaving}
	                    onClick={handleSubmit}
	                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#6b98a2] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5b8893] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]/55 disabled:cursor-not-allowed disabled:opacity-45"
	                  >
	                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
	                    {t('Send', '发送')}
	                  </button>
                </div>
              </motion.section>
            </motion.div>
          )}

          {mode === 'conversation' && (
            <motion.div
              key="quick-log-conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/16 px-0 py-0 backdrop-blur-[2px] sm:px-4 sm:py-[4dvh]"
              onClick={close}
            >
              <motion.section
                ref={activeDialogRef}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                role="dialog"
                aria-modal="true"
                aria-label={t('Quick Log conversation', '速记对话')}
                data-entry-source={source}
                className="flex h-full w-full max-w-[420px] flex-col overflow-hidden border border-white/18 bg-[rgba(229,237,241,0.96)] shadow-[0_24px_80px_rgba(6,33,43,0.24)] backdrop-blur-[20px] sm:rounded-[34px]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-300/45 px-5 py-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500/90">Mind Islands</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-800">
                      {t('Quick Log', '速记')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t('Close Quick Log', '关闭速记')}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-white/50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 p-4">
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                        {t('Opening Quick Log...', '正在打开速记...')}
                      </div>
                    }
                  >
                    <LazyAIChat
                      variant="overlay"
                      initialInput={handoff?.autoSend ? '' : handoff?.text}
                      initialMessage={handoff?.autoSend ? handoff.text : undefined}
                      autoSendInitialMessage={handoff?.autoSend}
                    />
                  </Suspense>
                </div>
              </motion.section>
            </motion.div>
          )}
      </AnimatePresence>
    </QuickLogContext.Provider>
  );
}
