import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Camera,
  Star,
  TrendingUp,
  Pencil,
  Trash2,
  MessageCircle,
  Send,
  Brain,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import { formatTime24, getDateKey, getNowInAppTimeZoneISO } from '../../lib/time';

type IdeaDraft = {
  title: string;
  content: string;
  tags: string[];
};

const TOPIC_SHIFT_GAP_MINUTES = 90;

const dedupeTags = (values: string[]) => {
  const seen = new Set<string>();
  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
};

const parseTagsText = (raw = '') =>
  dedupeTags(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const fallbackIdeaTitle = (text = '') => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Untitled thought';
  const snippet = normalized.split(' ').slice(0, 8).join(' ');
  return snippet.length > 64 ? `${snippet.slice(0, 61)}...` : snippet;
};

const mergeTags = (base: string[] = [], incoming: string[] = []) => dedupeTags([...base, ...incoming]);

export function CuriosityIsland() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const {
    progress,
    addCuriosityLog,
    updateCuriosityLog,
    deleteCuriosityLog,
    addCuriosityIdea,
    updateCuriosityIdea,
    deleteCuriosityIdea,
  } = useMindIslands();

  const [activeTab, setActiveTab] = useState<'discovery' | 'idea'>('discovery');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const island = progress.islands.find((i) => i.id === 'curiosity');
  const today = getDateKey();
  const todayLog = [...progress.curiosityLogs].reverse().find((l) => l.date === today);
  const editingLog = editingLogId
    ? progress.curiosityLogs.find((log) => log.id === editingLogId) || null
    : null;
  const activeLog = editingLog || todayLog;

  const getLogForm = (source = activeLog) => ({
    newThingNoticed: source?.newThingNoticed || '',
    newSkillOrFact: source?.newSkillOrFact || '',
    photoUrl: source?.photoUrl || '',
    tags: source?.tags || [],
  });

  const [logForm, setLogForm] = useState(getLogForm);
  const [tagInput, setTagInput] = useState('');

  const [ideaInput, setIdeaInput] = useState('');
  const [isIdeaSending, setIsIdeaSending] = useState(false);
  const [ideaApiStatus, setIdeaApiStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [ideaChatHistory, setIdeaChatHistory] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>
  >([]);
  const [ideaDraft, setIdeaDraft] = useState<IdeaDraft | null>(null);
  const [draftTagInput, setDraftTagInput] = useState('');
  const [showIdeaSaved, setShowIdeaSaved] = useState(false);
  const [showThreadArchived, setShowThreadArchived] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
  const [boundThreadId, setBoundThreadId] = useState<string | null>(null);
  const [ideaEditForm, setIdeaEditForm] = useState({
    title: '',
    content: '',
    summary: '',
    tagsText: '',
    status: 'archived' as 'active' | 'archived',
  });
  const ideaChatEndRef = useRef<HTMLDivElement>(null);

  const ideaList = useMemo(
    () =>
      [...progress.curiosityIdeas].sort(
        (a, b) =>
          new Date(b.lastDiscussedAt || b.concludedAt || b.date).getTime() -
          new Date(a.lastDiscussedAt || a.concludedAt || a.date).getTime(),
      ),
    [progress.curiosityIdeas],
  );

  const activeIdeaThread = useMemo(() => {
    const active = progress.curiosityIdeas.filter((item) => item.status === 'active');
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) =>
        new Date(b.lastDiscussedAt || b.date).getTime() -
        new Date(a.lastDiscussedAt || a.date).getTime(),
    )[0];
  }, [progress.curiosityIdeas]);

  useEffect(() => {
    if (!showLogForm) return;
    setLogForm(getLogForm());
    setTagInput('');
  }, [showLogForm, activeLog?.id]);

  useEffect(() => {
    ideaChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ideaChatHistory]);

  useEffect(() => {
    let alive = true;
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('health check failed');
        const data = (await response.json()) as { ok?: boolean; hasKey?: boolean };
        if (!alive) return;
        setIdeaApiStatus(data.ok && data.hasKey ? 'ready' : 'offline');
      } catch {
        if (!alive) return;
        setIdeaApiStatus('offline');
      }
    };

    checkAPI();
    return () => {
      alive = false;
    };
  }, []);

  const activeConversationLength = activeIdeaThread?.conversation?.length || 0;
  useEffect(() => {
    const nextThreadId = activeIdeaThread?.id || null;
    if (nextThreadId !== boundThreadId) {
      setBoundThreadId(nextThreadId);
      if (activeIdeaThread?.conversation && activeIdeaThread.conversation.length > 0) {
        setIdeaChatHistory(
          activeIdeaThread.conversation.map((item, index) => ({
            id: `${nextThreadId}-${index}-${item.timestamp}`,
            role: item.role,
            content: item.content,
            timestamp: item.timestamp,
          })),
        );
      } else {
        setIdeaChatHistory([]);
      }
      return;
    }

    if (activeIdeaThread && !isIdeaSending) {
      setIdeaChatHistory(
        (activeIdeaThread.conversation || []).map((item, index) => ({
          id: `${activeIdeaThread.id}-${index}-${item.timestamp}`,
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
        })),
      );
    }
  }, [activeIdeaThread?.id, activeConversationLength, isIdeaSending, boundThreadId]);

  const openLogEditor = (logId?: string) => {
    setEditingLogId(logId || null);
    setShowLogForm(true);
  };

  const handleSaveLog = () => {
    if (logForm.newThingNoticed.trim()) {
      const payload = {
        newThingNoticed: logForm.newThingNoticed,
        newSkillOrFact: logForm.newSkillOrFact,
        photoUrl: logForm.photoUrl,
        tags: logForm.tags,
      };

      const targetLog = editingLog || todayLog;
      if (targetLog) {
        updateCuriosityLog(targetLog.id, payload);
      } else {
        addCuriosityLog({
          date: today,
          ...payload,
        });
      }
      setShowLogForm(false);
      setEditingLogId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2800);
      setTagInput('');
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (!window.confirm(t('Delete this discovery log?', '删除这条新发现记录吗？'))) return;
    deleteCuriosityLog(logId);
    if (editingLogId === logId) {
      setEditingLogId(null);
      setShowLogForm(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !logForm.tags.includes(tagInput.trim())) {
      setLogForm({ ...logForm, tags: [...logForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setLogForm({ ...logForm, tags: logForm.tags.filter((t) => t !== tag) });
  };

  const getWeeklyDiscoveries = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return progress.curiosityLogs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= weekAgo;
    });
  };

  const getAllDiscoveries = () => {
    return progress.curiosityLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  };

  const getAllTags = () => {
    const tagMap = new Map<string, number>();
    progress.curiosityLogs.forEach((log) => {
      log.tags?.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const createNewIdeaThread = (
    nowISO: string,
    userMessage: { role: 'user'; content: string; timestamp: string },
    assistantMessage: { role: 'assistant'; content: string; timestamp: string },
    draft: IdeaDraft | null,
    titleHint?: string,
  ) => {
    addCuriosityIdea({
      date: today,
      title: (titleHint || draft?.title || fallbackIdeaTitle(userMessage.content)).trim(),
      content: (draft?.content || userMessage.content).trim(),
      tags: dedupeTags(draft?.tags || []),
      status: 'active',
      lastDiscussedAt: nowISO,
      conversation: [
        {
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        },
        {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp,
        },
      ],
    });
  };

  const markIdeaSavedToast = () => {
    setShowIdeaSaved(true);
    setTimeout(() => setShowIdeaSaved(false), 2400);
  };

  const ideaContext = useMemo(() => {
    const clip = (value?: string, max = 160) => {
      const raw = (value || '').trim();
      if (!raw) return '';
      if (raw.length <= max) return raw;
      return `${raw.slice(0, max - 1)}...`;
    };

    const recentDiscoveries = [...progress.curiosityLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((item) => ({
        date: item.date,
        newThingNoticed: clip(item.newThingNoticed, 140),
        newSkillOrFact: clip(item.newSkillOrFact, 120),
      }));

    const recentIdeas = ideaList.slice(0, 8).map((item) => ({
      date: item.date,
      title: clip(item.title, 80),
      content: clip(item.content, 150),
      status: item.status || 'archived',
      summary: clip(item.summary, 180),
      tags: item.tags || [],
    }));

    return {
      today,
      streak: island?.streak || 0,
      recentDiscoveries,
      recentIdeas,
    };
  }, [progress.curiosityLogs, ideaList, island?.streak, today]);

  const handleSendIdeaMessage = async () => {
    const trimmed = ideaInput.trim();
    if (!trimmed || isIdeaSending) return;

    const nowISO = getNowInAppTimeZoneISO();
    const userMessage = {
      id: `idea-${Date.now()}-u`,
      role: 'user' as const,
      content: trimmed,
      timestamp: nowISO,
    };

    const localHistoryForRequest = [...ideaChatHistory, userMessage]
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.content, timestamp: item.timestamp }));

    const lastActiveTimestamp =
      activeIdeaThread?.lastDiscussedAt ||
      activeIdeaThread?.conversation?.[activeIdeaThread.conversation.length - 1]?.timestamp ||
      null;
    const gapMinutes = lastActiveTimestamp
      ? Math.max(0, Math.round((new Date(nowISO).getTime() - new Date(lastActiveTimestamp).getTime()) / 60000))
      : null;

    const activeThreadPayload = activeIdeaThread
      ? {
          id: activeIdeaThread.id,
          title: activeIdeaThread.title,
          content: activeIdeaThread.content,
          summary: activeIdeaThread.summary || '',
          tags: activeIdeaThread.tags || [],
          lastDiscussedAt: activeIdeaThread.lastDiscussedAt || activeIdeaThread.date,
          conversation: (activeIdeaThread.conversation || []).slice(-12),
        }
      : null;

    setIdeaChatHistory((prev) => [...prev, userMessage]);
    setIdeaInput('');
    setIsIdeaSending(true);

    try {
      const response = await fetch('/api/curiosity-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: localHistoryForRequest,
          context: ideaContext,
          nowISO,
          activeThread: activeThreadPayload,
          gapMinutes,
          preferredLanguage: language,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'curiosity chat api failed');
      }

      setIdeaApiStatus('ready');
      const result = (await response.json()) as {
        reply?: string;
        shouldSaveIdea?: boolean;
        topicShift?: boolean;
        topicShiftReason?: string;
        threadSummary?: string;
        nextTopicTitle?: string;
        ideaDraft?: { title?: string; content?: string; tags?: string[] } | null;
      };

      const assistantMessage = {
        id: `idea-${Date.now()}-a`,
        role: 'assistant' as const,
        content:
          result.reply?.trim() ||
          'Interesting spark. I can help shape it so it is easier to revisit later.',
        timestamp: getNowInAppTimeZoneISO(),
      };
      setIdeaChatHistory((prev) => [...prev, assistantMessage]);

      const nextDraft: IdeaDraft | null = result.ideaDraft
        ? {
            title: (result.ideaDraft.title || '').trim() || fallbackIdeaTitle(trimmed),
            content: (result.ideaDraft.content || '').trim() || trimmed,
            tags: dedupeTags(Array.isArray(result.ideaDraft.tags) ? result.ideaDraft.tags : []),
          }
        : {
            title: fallbackIdeaTitle(trimmed),
            content: trimmed,
            tags: [],
          };
      setIdeaDraft(nextDraft);

      const isTopicShiftByGap = Boolean(gapMinutes !== null && gapMinutes >= TOPIC_SHIFT_GAP_MINUTES);
      const shouldShift = Boolean(result.topicShift) || (Boolean(activeIdeaThread) && isTopicShiftByGap);

      if (activeIdeaThread && shouldShift) {
        const summary =
          (result.threadSummary || '').trim() ||
          activeIdeaThread.summary ||
          `We explored ${activeIdeaThread.title} and clarified a workable next step.`;

        updateCuriosityIdea(activeIdeaThread.id, {
          status: 'archived',
          summary,
          concludedAt: nowISO,
          lastDiscussedAt: nowISO,
        });

        createNewIdeaThread(
          nowISO,
          {
            role: 'user',
            content: trimmed,
            timestamp: userMessage.timestamp,
          },
          {
            role: 'assistant',
            content: assistantMessage.content,
            timestamp: assistantMessage.timestamp,
          },
          nextDraft,
          (result.nextTopicTitle || '').trim() || nextDraft.title,
        );

        setShowThreadArchived(true);
        setTimeout(() => setShowThreadArchived(false), 3200);
      } else if (activeIdeaThread) {
        const mergedConversation = [
          ...(activeIdeaThread.conversation || []),
          {
            role: 'user' as const,
            content: trimmed,
            timestamp: userMessage.timestamp,
          },
          {
            role: 'assistant' as const,
            content: assistantMessage.content,
            timestamp: assistantMessage.timestamp,
          },
        ];

        updateCuriosityIdea(activeIdeaThread.id, {
          title: nextDraft.title || activeIdeaThread.title,
          content: nextDraft.content || activeIdeaThread.content,
          tags: mergeTags(activeIdeaThread.tags || [], nextDraft.tags || []),
          lastDiscussedAt: nowISO,
          conversation: mergedConversation,
          status: 'active',
        });
      } else {
        createNewIdeaThread(
          nowISO,
          {
            role: 'user',
            content: trimmed,
            timestamp: userMessage.timestamp,
          },
          {
            role: 'assistant',
            content: assistantMessage.content,
            timestamp: assistantMessage.timestamp,
          },
          nextDraft,
          (result.nextTopicTitle || '').trim() || nextDraft.title,
        );
      }

      if (result.shouldSaveIdea) {
        markIdeaSavedToast();
      }
    } catch (error) {
      setIdeaApiStatus('offline');
      const detail = error instanceof Error ? error.message : String(error);
      const fallback = {
        id: `idea-${Date.now()}-a`,
        role: 'assistant' as const,
        content: t(
          `I couldn't reach Idea Lab right now (${detail}). You can still write your thought below and save it manually.`,
          `目前无法连接 Idea Lab（${detail}）。你仍然可以先在下方输入想法并手动保存。`,
        ),
        timestamp: getNowInAppTimeZoneISO(),
      };
      setIdeaChatHistory((prev) => [...prev, fallback]);
      // eslint-disable-next-line no-console
      console.error('[CuriosityIsland] idea chat request failed:', error);
    } finally {
      setIsIdeaSending(false);
    }
  };

  const saveDraftIdea = () => {
    if (!ideaDraft) return;
    const nowISO = getNowInAppTimeZoneISO();

    if (activeIdeaThread) {
      updateCuriosityIdea(activeIdeaThread.id, {
        title: ideaDraft.title.trim() || activeIdeaThread.title,
        content: ideaDraft.content.trim() || activeIdeaThread.content,
        tags: mergeTags(activeIdeaThread.tags || [], ideaDraft.tags || []),
        lastDiscussedAt: nowISO,
      });
      markIdeaSavedToast();
      return;
    }

    addCuriosityIdea({
      date: today,
      title: ideaDraft.title.trim() || 'Untitled thought',
      content: ideaDraft.content.trim(),
      tags: dedupeTags(ideaDraft.tags),
      status: 'active',
      lastDiscussedAt: nowISO,
      conversation: [],
    });
    markIdeaSavedToast();
  };

  const startEditIdea = (ideaId: string) => {
    const target = progress.curiosityIdeas.find((item) => item.id === ideaId);
    if (!target) return;
    setEditingIdeaId(ideaId);
    setIdeaEditForm({
      title: target.title,
      content: target.content,
      summary: target.summary || '',
      tagsText: (target.tags || []).join(', '),
      status: target.status || 'archived',
    });
  };

  const cancelEditIdea = () => {
    setEditingIdeaId(null);
    setIdeaEditForm({ title: '', content: '', summary: '', tagsText: '', status: 'archived' });
  };

  const saveEditedIdea = () => {
    if (!editingIdeaId) return;
    const title = ideaEditForm.title.trim();
    const content = ideaEditForm.content.trim();
    if (!content) return;

    updateCuriosityIdea(editingIdeaId, {
      title: title || 'Untitled thought',
      content,
      summary: ideaEditForm.summary.trim() || undefined,
      tags: parseTagsText(ideaEditForm.tagsText),
      status: ideaEditForm.status,
      lastDiscussedAt: getNowInAppTimeZoneISO(),
    });
    cancelEditIdea();
  };

  const handleDeleteIdea = (ideaId: string) => {
    if (!window.confirm(t('Delete this idea from your vault?', '要从想法库中删除这条想法吗？'))) return;
    deleteCuriosityIdea(ideaId);
    if (editingIdeaId === ideaId) {
      cancelEditIdea();
    }
    if (expandedIdeaId === ideaId) {
      setExpandedIdeaId(null);
    }
  };

  const addDraftTag = () => {
    if (!ideaDraft) return;
    const next = draftTagInput.trim();
    if (!next) return;
    const merged = dedupeTags([...(ideaDraft.tags || []), next]);
    setIdeaDraft({ ...ideaDraft, tags: merged });
    setDraftTagInput('');
  };

  const removeDraftTag = (tag: string) => {
    if (!ideaDraft) return;
    setIdeaDraft({
      ...ideaDraft,
      tags: ideaDraft.tags.filter((item) => item !== tag),
    });
  };

  return (
    <SceneShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
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
              <p className="text-muted-foreground">{t('Discover something new and keep your wild ideas', '每天发现一点新东西，也把奇思妙想留下来')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: island?.color }}>
              {island?.streak} day streak
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-amber-400" />
                {t('This Week', '本周')}
              </h2>
              <p className="text-muted-foreground mt-1">{t('Keep exploring and growing', '持续探索，持续成长')}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-amber-400">{getWeeklyDiscoveries().length}</div>
              <div className="text-sm text-muted-foreground">{t('Discoveries', '发现')}</div>
            </div>
          </div>

          {getWeeklyDiscoveries().length > 0 && (
            <div className="mt-6 relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/20" />
              <div className="space-y-4 pl-6">
                {getWeeklyDiscoveries().map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative cursor-pointer"
                    onDoubleClick={() => openLogEditor(log.id)}
                  >
                    <div className="absolute -left-6 top-2 w-2 h-2 rounded-full bg-amber-400" />
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-foreground text-sm">{log.newThingNoticed}</div>
                      {log.tags && log.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {log.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogEditor(log.id);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex gap-2 bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-2"
        >
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'discovery'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">{t('Discovery Log', '新发现记录')}</span>
          </button>
          <button
            onClick={() => setActiveTab('idea')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === 'idea'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span className="font-medium">{t('Idea Lab', '灵感实验室')}</span>
          </button>
        </motion.div>

        {activeTab === 'discovery' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  {t("Today's Discovery", '今日发现')}
                </h2>
                <Button
                  onClick={() => {
                    if (showLogForm) {
                      setShowLogForm(false);
                      setEditingLogId(null);
                    } else {
                      openLogEditor(todayLog?.id);
                    }
                  }}
                  className="bg-primary hover:bg-primary/80"
                >
                  {todayLog ? t('Edit', '编辑') : t('Add Discovery', '添加发现')}
                </Button>
              </div>

              {showLogForm && editingLog && (
                <div className="mb-4 text-xs text-muted-foreground">
                  {t('Editing discovery from', '正在编辑以下日期的发现：')}{' '}
                  {new Date(editingLog.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}

              {showLogForm ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      {t('What new thing did you notice or discover today?', '你今天发现了什么新事物？')}
                    </label>
                    <textarea
                      value={logForm.newThingNoticed}
                      onChange={(e) => setLogForm({ ...logForm, newThingNoticed: e.target.value })}
                      placeholder="A new place, person, idea, observation..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-24"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      {t('New skill, fact, or experience (optional)', '新技能 / 新知识 / 新体验（可选）')}
                    </label>
                    <input
                      type="text"
                      value={logForm.newSkillOrFact}
                      onChange={(e) => setLogForm({ ...logForm, newSkillOrFact: e.target.value })}
                      placeholder="Something you learned or tried for the first time..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      {t('Memory photo (optional)', '记忆照片（可选）')}
                    </label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-white/30 transition-colors cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">{t('Click to add a photo (Coming soon)', '点击添加照片（即将支持）')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t('Tags (optional)', '标签（可选）')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder={t('Add a tag...', '添加标签...')}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground"
                      />
                      <Button onClick={addTag} size="sm">
                        {t('Add', '添加')}
                      </Button>
                    </div>
                    {logForm.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {logForm.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => removeTag(tag)}
                            className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                          >
                            {tag} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowLogForm(false);
                        setEditingLogId(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      {t('Cancel', '取消')}
                    </Button>
                    <Button onClick={handleSaveLog} className="flex-1 bg-primary">
                      {t('Save Discovery', '保存发现')}
                    </Button>
                  </div>
                </div>
              ) : todayLog ? (
                <div className="space-y-4" onDoubleClick={() => openLogEditor(todayLog.id)}>
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <Star className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="text-lg text-foreground mb-2">{todayLog.newThingNoticed}</div>
                        {todayLog.newSkillOrFact && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>{todayLog.newSkillOrFact}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    {todayLog.tags && todayLog.tags.length > 0 && (
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {todayLog.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full bg-amber-500/30 text-amber-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => openLogEditor(todayLog.id)} variant="outline" className="flex-1">
                      <Pencil className="w-4 h-4 mr-2" />
                      {t('Edit', '编辑')}
                    </Button>
                    <Button
                      onClick={() => handleDeleteLog(todayLog.id)}
                      variant="outline"
                      className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('Delete', '删除')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">{t('No discovery logged today', '今天还没有记录发现')}</p>
                  <p className="text-sm">{t('What new thing will you notice today?', '今天你会注意到什么新东西？')}</p>
                </div>
              )}
            </motion.div>

            {getAllDiscoveries().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-xl font-medium text-foreground mb-4">{t('Discovery Collection', '发现集合')}</h2>

                {getAllTags().length > 0 && (
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-3">{t('Popular themes', '热门主题')}</div>
                    <div className="flex gap-2 flex-wrap">
                      {getAllTags().map(([tag, count]) => (
                        <div
                          key={tag}
                          className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
                        >
                          {tag} <span className="text-xs opacity-60">×{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getAllDiscoveries().map((log) => (
                    <motion.div
                      key={log.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                      onDoubleClick={() => openLogEditor(log.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(log.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-foreground text-sm line-clamp-2">{log.newThingNoticed}</div>
                          {log.tags && log.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {log.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogEditor(log.id);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {activeTab === 'idea' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-xl font-medium text-foreground mb-2 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {t('Curiosity Idea Lab', '好奇岛灵感实验室')}
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ${
                    ideaApiStatus === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : ideaApiStatus === 'checking'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-red-500/20 text-red-200'
                  }`}
                >
                  {ideaApiStatus === 'ready'
                    ? t('Idea AI connected', '灵感 AI 已连接')
                    : ideaApiStatus === 'checking'
                      ? t('Checking AI connection...', '正在检查 AI 连接...')
                      : t('AI offline (check backend / API key)', 'AI 离线（请检查后端 / API Key）')}
                </span>
                {activeIdeaThread ? (
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] bg-cyan-500/20 text-cyan-200">
                    {t('Active thread:', '当前线程：')} {activeIdeaThread.title}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] bg-white/10 text-muted-foreground">
                    {t('No active thread yet', '当前还没有活跃线程')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t(
                  'If the topic changes (or the gap is long), the previous thread will be summarized and archived automatically.',
                  '当话题切换（或间隔太久）时，上一条线程会自动总结并归档。',
                )}
              </p>

              <div className="h-[430px] flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-4 pr-1">
                  {ideaChatHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-2">{t('Drop a raw thought here', '把你还很粗糙的想法先丢进来')}</p>
                      <p className="text-sm">{t('I will help sharpen it and keep your full conversation trail in the vault', '我会帮你打磨，并把完整对话轨迹保存到想法库')}</p>
                    </div>
                  ) : (
                    <>
                      {ideaChatHistory.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-cyan-500/10 border border-cyan-500/20 text-foreground'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-60 mt-1">{formatTime24(message.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={ideaChatEndRef} />
                    </>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={ideaInput}
                    onChange={(e) => setIdeaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendIdeaMessage();
                      }
                    }}
                    placeholder={t('Share a random thought or new idea...', '输入一个突然冒出的想法或新点子...')}
                    disabled={isIdeaSending}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <Button
                    onClick={handleSendIdeaMessage}
                    disabled={isIdeaSending || !ideaInput.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {ideaDraft && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-6"
              >
                <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  {t('Current Idea Draft', '当前灵感草稿')}
                </h3>
                <div className="space-y-3">
                  <input
                    value={ideaDraft.title}
                    onChange={(e) => setIdeaDraft({ ...ideaDraft, title: e.target.value })}
                    placeholder={t('Idea title', '想法标题')}
                    className="w-full bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <textarea
                    value={ideaDraft.content}
                    onChange={(e) => setIdeaDraft({ ...ideaDraft, content: e.target.value })}
                    placeholder={t('Idea summary', '想法摘要')}
                    className="w-full min-h-24 bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <input
                      value={draftTagInput}
                      onChange={(e) => setDraftTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDraftTag();
                        }
                      }}
                      placeholder={t('Add tag', '添加标签')}
                      className="flex-1 bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                    />
                    <Button variant="outline" onClick={addDraftTag}>
                      {t('Add Tag', '添加标签')}
                    </Button>
                  </div>
                  {ideaDraft.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {ideaDraft.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => removeDraftTag(tag)}
                          className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs hover:bg-cyan-500/30"
                        >
                          {tag} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={saveDraftIdea} className="bg-cyan-500 hover:bg-cyan-600">
                      {t('Apply to Active Thread', '应用到当前线程')}
                    </Button>
                    <Button variant="outline" onClick={() => setIdeaDraft(null)}>
                      {t('Clear Draft', '清空草稿')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-xl font-medium text-foreground mb-4">{t('Idea Vault', '想法库')}</h2>

              {ideaList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>{t('No ideas saved yet', '还没有保存的想法')}</p>
                  <p className="text-sm">{t('When a thought appears, capture it before it fades.', '灵感出现时，趁它消失前先抓住它。')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ideaList.map((idea) => {
                    const isExpanded = expandedIdeaId === idea.id;
                    const conversation = idea.conversation || [];
                    return (
                      <div
                        key={idea.id}
                        className="bg-white/5 rounded-xl border border-white/10 p-4"
                        onDoubleClick={() => startEditIdea(idea.id)}
                      >
                        {editingIdeaId === idea.id ? (
                          <div className="space-y-3">
                            <input
                              value={ideaEditForm.title}
                              onChange={(e) => setIdeaEditForm({ ...ideaEditForm, title: e.target.value })}
                              className="w-full bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                            />
                            <textarea
                              value={ideaEditForm.content}
                              onChange={(e) => setIdeaEditForm({ ...ideaEditForm, content: e.target.value })}
                              className="w-full min-h-24 bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                            />
                            <textarea
                              value={ideaEditForm.summary}
                              onChange={(e) => setIdeaEditForm({ ...ideaEditForm, summary: e.target.value })}
                              placeholder={t('Thread summary', '线程总结')}
                              className="w-full min-h-20 bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                            />
                            <input
                              value={ideaEditForm.tagsText}
                              onChange={(e) => setIdeaEditForm({ ...ideaEditForm, tagsText: e.target.value })}
                              placeholder={t('tags separated by comma', '标签（用逗号分隔）')}
                              className="w-full bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                            />
                            <select
                              value={ideaEditForm.status}
                              onChange={(e) =>
                                setIdeaEditForm({
                                  ...ideaEditForm,
                                  status: e.target.value as 'active' | 'archived',
                                })
                              }
                              className="w-full bg-black/10 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                            >
                              <option value="active">{t('Active', '活跃')}</option>
                              <option value="archived">{t('Archived', '已归档')}</option>
                            </select>
                            <div className="flex gap-2">
                              <Button onClick={saveEditedIdea}>{t('Save', '保存')}</Button>
                              <Button variant="outline" onClick={cancelEditIdea}>
                                {t('Cancel', '取消')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-medium text-foreground">{idea.title}</h3>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(idea.lastDiscussedAt || idea.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </p>
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                                      idea.status === 'active'
                                        ? 'bg-cyan-500/20 text-cyan-200'
                                        : 'bg-white/10 text-muted-foreground'
                                    }`}
                                  >
                                    {idea.status === 'active' ? t('Active', '活跃') : t('Archived', '已归档')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => startEditIdea(idea.id)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                                  onClick={() => handleDeleteIdea(idea.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{idea.content}</p>

                            {idea.summary && (
                              <div className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3">
                                <div className="text-xs text-cyan-200 mb-1">{t('Final thread summary', '最终线程总结')}</div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{idea.summary}</p>
                              </div>
                            )}

                            {idea.tags && idea.tags.length > 0 && (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {idea.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {conversation.length > 0 && (
                              <div className="mt-3">
                                <button
                                  onClick={() => setExpandedIdeaId(isExpanded ? null : idea.id)}
                                  className="flex items-center gap-2 text-xs text-cyan-200 hover:text-cyan-100"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  {t('Conversation trail', '对话轨迹')} ({conversation.length})
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 max-h-56 space-y-2 overflow-y-auto hide-scrollbar rounded-lg border border-white/10 bg-black/10 p-3">
                                    {conversation.map((turn, index) => (
                                      <div
                                        key={`${idea.id}-turn-${index}-${turn.timestamp}`}
                                        className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                      >
                                        <div
                                          className={`max-w-[88%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                                            turn.role === 'user'
                                              ? 'bg-primary/70 text-primary-foreground'
                                              : 'bg-cyan-500/15 border border-cyan-500/25 text-foreground'
                                          }`}
                                        >
                                          <div>{turn.content}</div>
                                          <div className="mt-1 opacity-60">{formatTime24(turn.timestamp)}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <div>
                  <div className="font-medium">{t('Discovery added!', '发现已保存！')}</div>
                  <div className="text-sm opacity-90">{t("You're embracing change and growth", '你正在拥抱变化并持续成长')}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showIdeaSaved && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <Brain className="w-6 h-6" />
                <div>
                  <div className="font-medium">{t('Idea thread updated', '想法线程已更新')}</div>
                  <div className="text-sm opacity-90">{t('Saved to your Curiosity vault', '已保存到你的想法库')}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showThreadArchived && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-slate-600 to-slate-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <Archive className="w-6 h-6" />
                <div>
                  <div className="font-medium">{t('Previous topic archived', '上一话题已归档')}</div>
                  <div className="text-sm opacity-90">{t('Summary and conversation trail saved in Idea Vault', '总结与对话轨迹已保存到想法库')}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneShell>
  );
}
