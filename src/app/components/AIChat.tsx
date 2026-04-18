import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Send, Sparkles, Trash2 } from 'lucide-react';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate24, formatTime24, getNowInAppTimeZoneISO } from '../lib/time';
import type { AIInsightPayload, IslandType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PendingFollowup {
  originalMessage: string;
  followupQuestion: string;
}

interface PendingDraft {
  insight: AIInsightPayload;
  sourceMessage: string;
}

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

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

const shouldDirectArchiveTodo = (message: string) => {
  const text = message.toLowerCase();
  const hasTodoIntent = /(to[- ]?do|todo|to do list|task|tasks|待办|任务)/i.test(message);
  const hasDirectVerb =
    /\b(add|put|save|record|directly|immediately|now|right away)\b/.test(text) ||
    /(直接|立刻|马上|现在|加入|放进|写进)/.test(message);
  return hasTodoIntent && hasDirectVerb;
};

const summarizeDraft = (insight: AIInsightPayload, language: 'en' | 'zh') => {
  const s = (en: string, zh: string) => (language === 'zh' ? zh : en);
  const lines: string[] = [];
  const entries = insight.entries || {};

  if (entries.body) {
    const parts: string[] = [];
    if (typeof entries.body.workoutCompleted === 'boolean') {
      parts.push(
        entries.body.workoutCompleted
          ? s('workout completed', '已完成锻炼')
          : s('workout not completed', '未完成锻炼'),
      );
    }
    if (hasText(entries.body.workoutType)) parts.push(entries.body.workoutType as string);
    if (typeof entries.body.workoutDuration === 'number') {
      parts.push(`${entries.body.workoutDuration} min`);
    }
    if (hasText(entries.body.notes)) parts.push(entries.body.notes as string);
    if (parts.length > 0) lines.push(`${s('Body', '健康')}: ${parts.join(', ')}`);
  }

  if (entries.work) {
    const parts: string[] = [];
    if (hasText(entries.work.progressStep)) parts.push(entries.work.progressStep as string);
    if (hasText(entries.work.todaysWin))
      parts.push(`${s('win', '收获')}: ${entries.work.todaysWin}`);
    if (parts.length > 0) lines.push(`${s('Work', '工作')}: ${parts.join(', ')}`);
  }

  if (entries.learning && hasText(entries.learning.whatILearned)) {
    lines.push(`${s('Learning', '学习')}: ${entries.learning.whatILearned}`);
  }

  if (entries.relationships) {
    const parts: string[] = [];
    if (hasText(entries.relationships.category)) parts.push(entries.relationships.category as string);
    if (hasText(entries.relationships.momentNote)) parts.push(entries.relationships.momentNote as string);
    if (parts.length > 0) lines.push(`${s('Relationships', '关系')}: ${parts.join(', ')}`);
  }

  if (entries.curiosity) {
    const text =
      (entries.curiosity.newThingNoticed as string) ||
      (entries.curiosity.newSkillOrFact as string) ||
      '';
    if (hasText(text)) lines.push(`${s('Curiosity', '好奇')}: ${text}`);
  }

  if (entries.compassion && hasText(entries.compassion.journalEntry)) {
    lines.push(`${s('Self-Compassion', '自我关怀')}: ${entries.compassion.journalEntry}`);
  }

  if (Array.isArray(insight.todos) && insight.todos.length > 0) {
    const todoText = insight.todos.slice(0, 2).map((item) => item.text).filter(Boolean).join(' | ');
    if (todoText) lines.push(`${s('To-do', '待办')}: ${todoText}`);
  }

  return lines.slice(0, 6);
};

export function AIChat({ variant = 'standalone' }: { variant?: 'standalone' | 'overlay' }) {
  const { progress, addChatMessage, applyAIInsights } = useMindIslands();
  const { language, t } = useLanguage();
  const isOverlay = variant === 'overlay';
  const islandNameMap: Record<IslandType, string> = {
    body: t('Body & Health', '健康与运动'),
    work: t('Work', '工作'),
    learning: t('Learning', '学习'),
    relationships: t('Relationships', '关系'),
    curiosity: t('Curiosity', '好奇'),
    compassion: t('Self-Compassion', '自我关怀'),
  };
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFollowup, setPendingFollowup] = useState<PendingFollowup | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress.chatHistory.length, isTyping, pendingFollowup, pendingDraft]);

  const appendAssistantMessage = (content: string) => {
    addChatMessage({
      role: 'assistant',
      content,
    });
  };

  const handleConfirmDraft = () => {
    if (!pendingDraft) return;

    const applied = applyAIInsights(pendingDraft.insight, pendingDraft.sourceMessage);
    const parts: string[] = [];
    if (applied.islands.length > 0) {
      parts.push(
        t(
          `Archived to: ${applied.islands.join(' / ')}`,
          `已归档到：${applied.islands.join(' / ')}`,
        ),
      );
    }
    if (applied.todosAdded > 0) {
      parts.push(
        t(
          `Added ${applied.todosAdded} to-do item(s)`,
          `已添加 ${applied.todosAdded} 条待办`,
        ),
      );
    }

    appendAssistantMessage(
      parts.length > 0
        ? `${t('Confirmed.', '已确认。')} ${parts.join('; ')}.`
        : t('Confirmed. Archived.', '已确认并归档。'),
    );
    setPendingDraft(null);
    setPendingFollowup(null);
  };

  const handleDiscardDraft = () => {
    setPendingDraft(null);
    setPendingFollowup(null);
    appendAssistantMessage(t('Draft discarded. Share a new update whenever you want.', '草稿已丢弃。你可以随时重新输入新的记录。'));
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userInput = input.trim();

    addChatMessage({
      role: 'user',
      content: userInput,
    });

    setInput('');
    setIsTyping(true);

    const sourceMessage = pendingDraft?.sourceMessage || pendingFollowup?.originalMessage || userInput;

    try {
      const response = await fetch('/api/chat-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          pendingContext: pendingFollowup,
          draftContext: pendingDraft ? { insight: pendingDraft.insight, sourceMessage: pendingDraft.sourceMessage } : null,
          routineSettings: progress.routineSettings,
          nowISO: getNowInAppTimeZoneISO(),
          preferredLanguage: language,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'chat api failed');
      }

      const result = (await response.json()) as AIInsightPayload;
      const todoCount = Array.isArray(result.todos) ? result.todos.length : 0;
      const hasEntryDraft = Object.values(result.entries || {}).some((entry) => hasMeaningfulEntry(entry));

      if (result.needsFollowup) {
        const followup =
          result.followupQuestion ||
          t(
            'Could you share one more detail so I can log it accurately?',
            '请补充一个细节，这样我能更准确地记录。',
          );
        setPendingFollowup({
          originalMessage: sourceMessage,
          followupQuestion: followup,
        });
        appendAssistantMessage(followup);
        return;
      }

      if (!hasEntryDraft && todoCount === 0) {
        appendAssistantMessage(
          `${result.assistantReply}\n\n${t(
            'I did not get a structured draft yet. Please include at least one concrete task or log detail.',
            '我还没有拿到结构化草稿，请至少补充一条具体任务或记录细节。',
          )}`,
        );
        setPendingFollowup(null);
        return;
      }

      if (todoCount > 0 && !hasEntryDraft && shouldDirectArchiveTodo(userInput)) {
        const applied = applyAIInsights(result, sourceMessage);
        appendAssistantMessage(
          t(
            `Added directly to your to-do list: ${applied.todosAdded} item(s). You can adjust priority in the To-Do panel.`,
            `已直接加入待办：${applied.todosAdded} 条。你可以在待办面板调整优先级。`,
          ),
        );
        setPendingDraft(null);
        setPendingFollowup(null);
        return;
      }

      setPendingFollowup(null);
      setPendingDraft({
        insight: result,
        sourceMessage,
      });

      const modeLine = pendingDraft
        ? t(
            'Draft updated. Review, edit in chat if needed, then confirm to archive.',
            '草稿已更新。可继续在聊天中修改，确认后再归档。',
          )
        : t(
            'Draft ready. You can edit it in chat, then confirm to archive.',
            '草稿已生成。可先在聊天中修改，再确认归档。',
          );
      appendAssistantMessage(`${result.assistantReply}\n\n${modeLine}`);
    } catch (error) {
      const fallback = pendingFollowup
        ? t(
            "I couldn't reach the logging service just now. Please resend your extra detail and I'll continue.",
            '暂时无法连接记录服务。请重新发送补充细节，我会继续处理。',
          )
        : t(
            "I couldn't reach the logging service just now. Please try again in a moment.",
            '暂时无法连接记录服务，请稍后再试。',
          );
      appendAssistantMessage(fallback);
      // eslint-disable-next-line no-console
      console.error('[AIChat] request failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const draftSummary = pendingDraft ? summarizeDraft(pendingDraft.insight, language) : [];
  const draftIslands = pendingDraft?.insight.detectedIslands || [];

  return (
    <div
      className={
        isOverlay
          ? 'flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] bg-[rgba(238,243,246,0.38)]'
          : 'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-xl'
      }
    >
      <div className={isOverlay ? 'border-b border-slate-300/35 bg-[rgba(241,246,248,0.72)] p-4' : 'border-b border-border bg-primary/5 p-4'}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOverlay ? 'bg-[#8bb3bc]/28' : 'bg-gradient-to-br from-primary/40 to-secondary/40'}`}>
            <Sparkles className={`h-5 w-5 ${isOverlay ? 'text-[#5f8f98]' : 'text-accent'}`} />
          </div>
          <div>
            <h3 className={`font-medium ${isOverlay ? 'text-slate-800' : 'text-foreground'}`}>{t('AI Log Assistant', 'AI 记录助手')}</h3>
            <p className={`text-xs ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('Draft first, then confirm archive', '先生成草稿，再确认归档')}</p>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar overscroll-contain p-4 scroll-smooth ${isOverlay ? 'bg-transparent' : ''}`}
        ref={scrollRef}
      >
        <div className="space-y-4">
          {progress.chatHistory.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`py-8 text-center ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}
            >
              <Sparkles className={`mx-auto mb-3 h-8 w-8 ${isOverlay ? 'text-[#5f8f98]/70' : 'text-primary/50'}`} />
              <p className="text-sm">{t('Tell me what you did today, and I will draft a log first.', '告诉我你今天做了什么，我会先帮你生成记录草稿。')}</p>
              <p className="mt-2 text-xs">{t('Example: Leg workout for 40 minutes tonight.', '示例：今晚练腿 40 分钟。')}</p>
            </motion.div>
          )}

          {pendingFollowup && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${isOverlay ? 'border-amber-300/40 bg-amber-50/80 text-amber-700' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>
              {t('Need one detail before drafting:', '生成草稿前还需要一个细节：')} {pendingFollowup.followupQuestion}
            </div>
          )}

          {pendingDraft && (
            <div className={`rounded-xl border p-3 ${isOverlay ? 'border-[#6b98a2]/22 bg-[rgba(188,214,220,0.22)]' : 'border-primary/30 bg-primary/10'}`}>
              <p className={`text-xs font-medium ${isOverlay ? 'text-slate-800' : 'text-foreground'}`}>
                {t('Pending Draft', '待确认草稿')}
              </p>
              <p className={`mt-1 text-xs ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>
                {t('Target:', '目标分区：')} {draftIslands.length > 0 ? draftIslands.map((id) => islandNameMap[id]).join(' / ') : t('Not decided', '未确定')}
              </p>
              {draftSummary.length > 0 && (
                <div className="mt-2 space-y-1">
                  {draftSummary.map((line) => (
                    <p key={line} className={`text-xs ${isOverlay ? 'text-slate-700' : 'text-foreground/90'}`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
              {Array.isArray(pendingDraft.insight.todos) && pendingDraft.insight.todos.length > 0 && (
                <div className={`mt-2 text-xs ${isOverlay ? 'text-slate-600' : 'text-foreground/80'}`}>
                  {t('To-do preview:', '待办预览：')}{' '}
                  {pendingDraft.insight.todos
                    .slice(0, 2)
                    .map((todo) => {
                      const deadlineDate = todo.deadline ? new Date(todo.deadline) : null;
                      const hasDeadline = deadlineDate && Number.isFinite(deadlineDate.getTime());
                      if (!hasDeadline || !deadlineDate) return todo.text;
                      return `${todo.text} (${formatDate24(deadlineDate)} ${formatTime24(deadlineDate)})`;
                    })
                    .join(' | ')}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleConfirmDraft}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {t('Confirm & Archive', '确认并归档')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={isOverlay ? 'border-red-200/70 bg-white/65 text-red-500 hover:bg-red-50' : 'border-red-300/50 text-red-200 hover:bg-red-500/20'}
                  onClick={handleDiscardDraft}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t('Discard', '丢弃')}
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {progress.chatHistory.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl p-3 ${
                    message.role === 'user'
                      ? isOverlay
                        ? 'rounded-br-sm bg-[rgba(183,206,214,0.62)] text-slate-800'
                        : 'rounded-br-sm bg-primary/20 text-foreground'
                      : isOverlay
                        ? 'rounded-bl-sm bg-[rgba(249,251,252,0.9)] text-slate-800 shadow-[0_6px_18px_rgba(25,53,67,0.08)]'
                        : 'rounded-bl-sm bg-muted/50 text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  <p className={`mt-1 text-xs ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>{formatTime24(message.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className={`rounded-2xl rounded-bl-sm p-3 ${isOverlay ? 'bg-[rgba(249,251,252,0.9)] shadow-[0_6px_18px_rgba(25,53,67,0.08)]' : 'bg-muted/50'}`}>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`h-2 w-2 rounded-full ${isOverlay ? 'bg-slate-400/70' : 'bg-muted-foreground/50'}`}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className={`shrink-0 border-t p-4 ${isOverlay ? 'border-slate-300/35 bg-[rgba(88,130,142,0.18)]' : 'border-border bg-background/50'}`}>
        {pendingDraft && (
          <div className={`mb-3 rounded-lg border p-2 ${isOverlay ? 'border-[#6b98a2]/18 bg-[rgba(188,214,220,0.22)]' : 'border-primary/30 bg-primary/10'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs ${isOverlay ? 'text-slate-700' : 'text-foreground/90'}`}>
                {t('Pending draft:', '待确认草稿：')} {draftSummary.length > 0 ? draftSummary[0] : t(`${(pendingDraft.insight.todos || []).length} to-do item(s)`, `${(pendingDraft.insight.todos || []).length} 条待办`)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-500"
                  onClick={handleConfirmDraft}
                >
                  {t('Confirm', '确认')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={isOverlay ? 'h-7 border-red-200/70 bg-white/65 px-2 text-xs text-red-500 hover:bg-red-50' : 'h-7 border-red-300/50 px-2 text-xs text-red-200 hover:bg-red-500/20'}
                  onClick={handleDiscardDraft}
                >
                  {t('Discard', '丢弃')}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              pendingFollowup
                ? t('Add missing detail...', '补充缺失细节...')
                : pendingDraft
                  ? t('Edit this draft in natural language...', '用自然语言修改这条草稿...')
                  : t("Type today's update...", '输入今天的记录...')
            }
            className={isOverlay ? 'border-slate-300/35 bg-[rgba(215,228,232,0.58)] text-slate-800 placeholder:text-slate-500' : 'border-border/50 bg-input-background text-foreground placeholder:text-muted-foreground'}
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={isOverlay ? 'bg-[#6b98a2] text-white hover:bg-[#5a8791]' : 'bg-primary text-primary-foreground hover:bg-primary/80'}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
