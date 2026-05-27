import { AnimatePresence, motion } from 'motion/react';
import { Maximize2, Send, X } from 'lucide-react';
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import { useLanguage } from '../context/LanguageContext';

type QuickLogMode = 'closed' | 'composer' | 'conversation';
type QuickLogSource = 'global' | 'otter' | 'quick-check-in';

interface QuickLogContextValue {
  openComposer: (source?: QuickLogSource, returnFocus?: HTMLElement | null) => void;
}

interface ConversationHandoff {
  text: string;
  autoSend: boolean;
}

const QuickLogContext = createContext<QuickLogContextValue | null>(null);
const LazyAIChat = lazy(() =>
  import('./AIChat').then(({ AIChat }) => ({ default: AIChat })),
);

export function useQuickLog() {
  const context = useContext(QuickLogContext);
  if (!context) {
    throw new Error('useQuickLog must be used inside QuickLogProvider');
  }
  return context;
}

export function QuickLogProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useLanguage();
  const [mode, setMode] = useState<QuickLogMode>('closed');
  const [source, setSource] = useState<QuickLogSource>('global');
  const [composerText, setComposerText] = useState('');
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
    setHandoff(null);
  }, [location.pathname]);

  const openComposer = (
    nextSource: QuickLogSource = 'global',
    returnFocus: HTMLElement | null = null,
  ) => {
    setSource(nextSource);
    returnFocusRef.current = returnFocus;
    setHandoff(null);
    setMode('composer');
  };

  const close = () => {
    setMode('closed');
    setComposerText('');
    setHandoff(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const expand = (autoSend: boolean) => {
    setHandoff({ text: composerText.trim(), autoSend });
    setMode('conversation');
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
                  placeholder={t('Something I want to remember...', '我想记住的是...')}
                  className="mt-2 min-h-[82px] w-full resize-none rounded-2xl border border-[#b9cdd2] bg-white/72 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:border-[#6b98a2] focus-visible:ring-2 focus-visible:ring-[#6b98a2]/35"
                />
                <div className="mt-3 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => expand(false)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#507580] transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]"
                  >
                    <Maximize2 className="h-4 w-4" />
                    {t('Open conversation', '展开对话')}
                  </button>
                  <button
                    type="button"
                    disabled={!composerText.trim()}
                    onClick={() => expand(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#6b98a2] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5b8893] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]/55 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Send className="h-4 w-4" />
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
