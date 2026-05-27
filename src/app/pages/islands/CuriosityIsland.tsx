import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, ChevronUp, Lightbulb, Pencil, Send, Sparkles, Trash2 } from 'lucide-react';
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

const parseTagsText = (raw = '') => dedupeTags(raw.split(','));

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
  const today = getDateKey();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';

  const [activeTab, setActiveTab] = useState<'capture' | 'develop'>('capture');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showCaptureDetails, setShowCaptureDetails] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const todayLog = [...progress.curiosityLogs].reverse().find((log) => log.date === today);
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
  const logComposerVisible = showLogForm || !todayLog;
  const recentLogs = useMemo(
    () =>
      [...progress.curiosityLogs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .filter((log) => log.id !== todayLog?.id)
        .slice(0, 6),
    [progress.curiosityLogs, todayLog?.id],
  );

  const [ideaInput, setIdeaInput] = useState('');
  const [isIdeaSending, setIsIdeaSending] = useState(false);
  const [ideaApiStatus, setIdeaApiStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [ideaChatHistory, setIdeaChatHistory] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>
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
    return (
      [...active].sort(
        (a, b) =>
          new Date(b.lastDiscussedAt || b.date).getTime() -
          new Date(a.lastDiscussedAt || a.date).getTime(),
      )[0] || null
    );
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
        if (alive) setIdeaApiStatus(data.ok && data.hasKey ? 'ready' : 'offline');
      } catch {
        if (alive) setIdeaApiStatus('offline');
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
      setIdeaChatHistory(
        (activeIdeaThread?.conversation || []).map((item, index) => ({
          id: `${nextThreadId}-${index}-${item.timestamp}`,
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
        })),
      );
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
    const target = logId ? progress.curiosityLogs.find((log) => log.id === logId) : todayLog;
    setEditingLogId(logId || null);
    setShowCaptureDetails(Boolean(target?.newSkillOrFact || target?.tags?.length));
    setShowLogForm(true);
  };

  const handleSaveLog = () => {
    if (!logForm.newThingNoticed.trim()) return;
    const payload = {
      newThingNoticed: logForm.newThingNoticed.trim(),
      newSkillOrFact: logForm.newSkillOrFact.trim(),
      photoUrl: logForm.photoUrl,
      tags: dedupeTags(logForm.tags),
    };
    const targetLog = editingLog || todayLog;
    if (targetLog) {
      updateCuriosityLog(targetLog.id, payload);
    } else {
      addCuriosityLog({ date: today, ...payload });
    }
    setShowLogForm(false);
    setEditingLogId(null);
    setShowCaptureDetails(false);
    setShowSuccess(true);
    setTagInput('');
    setTimeout(() => setShowSuccess(false), 2400);
  };

  const handleDeleteLog = (logId: string) => {
    if (!window.confirm(t('Delete this inspiration?', '删除这条灵感吗？'))) return;
    deleteCuriosityLog(logId);
    if (editingLogId === logId) {
      setEditingLogId(null);
      setShowLogForm(false);
    }
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setLogForm((current) => ({ ...current, tags: dedupeTags([...current.tags, next]) }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setLogForm((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }));
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
      conversation: [userMessage, assistantMessage],
    });
  };

  const markIdeaSavedToast = () => {
    setShowIdeaSaved(true);
    setTimeout(() => setShowIdeaSaved(false), 2400);
  };

  const ideaContext = useMemo(() => {
    const clip = (value?: string, max = 160) => {
      const raw = (value || '').trim();
      return raw.length > max ? `${raw.slice(0, max - 3)}...` : raw;
    };
    return {
      today,
      recentDiscoveries: [...progress.curiosityLogs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6)
        .map((item) => ({
          date: item.date,
          newThingNoticed: clip(item.newThingNoticed, 140),
          newSkillOrFact: clip(item.newSkillOrFact, 120),
        })),
      recentIdeas: ideaList.slice(0, 8).map((item) => ({
        date: item.date,
        title: clip(item.title, 80),
        content: clip(item.content, 150),
        status: item.status || 'archived',
        summary: clip(item.summary, 180),
        tags: item.tags || [],
      })),
    };
  }, [progress.curiosityLogs, ideaList, today]);

  const handleSendIdeaMessage = async () => {
    const trimmed = ideaInput.trim();
    if (!trimmed || isIdeaSending) return;
    const nowISO = getNowInAppTimeZoneISO();
    const userMessage = { id: `idea-${Date.now()}-u`, role: 'user' as const, content: trimmed, timestamp: nowISO };
    const history = [...ideaChatHistory, userMessage]
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.content, timestamp: item.timestamp }));
    const lastTimestamp =
      activeIdeaThread?.lastDiscussedAt ||
      activeIdeaThread?.conversation?.[activeIdeaThread.conversation.length - 1]?.timestamp ||
      null;
    const gapMinutes = lastTimestamp
      ? Math.max(0, Math.round((new Date(nowISO).getTime() - new Date(lastTimestamp).getTime()) / 60000))
      : null;
    const activeThread = activeIdeaThread
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

    setIdeaChatHistory((current) => [...current, userMessage]);
    setIdeaInput('');
    setIsIdeaSending(true);
    try {
      const response = await fetch('/api/curiosity-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history,
          context: ideaContext,
          nowISO,
          activeThread,
          gapMinutes,
          preferredLanguage: language,
        }),
      });
      if (!response.ok) throw new Error((await response.text()) || 'inspiration chat api failed');
      setIdeaApiStatus('ready');
      const result = (await response.json()) as {
        reply?: string;
        shouldSaveIdea?: boolean;
        topicShift?: boolean;
        threadSummary?: string;
        nextTopicTitle?: string;
        ideaDraft?: { title?: string; content?: string; tags?: string[] } | null;
      };
      const assistantMessage = {
        id: `idea-${Date.now()}-a`,
        role: 'assistant' as const,
        content:
          result.reply?.trim() ||
          t('That is worth keeping. What part feels most alive to you?', '这值得留下。你觉得其中最有生命力的部分是什么？'),
        timestamp: getNowInAppTimeZoneISO(),
      };
      setIdeaChatHistory((current) => [...current, assistantMessage]);
      const nextDraft: IdeaDraft = {
        title: result.ideaDraft?.title?.trim() || fallbackIdeaTitle(trimmed),
        content: result.ideaDraft?.content?.trim() || trimmed,
        tags: dedupeTags(Array.isArray(result.ideaDraft?.tags) ? result.ideaDraft.tags : []),
      };
      setIdeaDraft(nextDraft);
      const shouldShift =
        Boolean(result.topicShift) ||
        (Boolean(activeIdeaThread) && gapMinutes !== null && gapMinutes >= TOPIC_SHIFT_GAP_MINUTES);

      if (activeIdeaThread && shouldShift) {
        updateCuriosityIdea(activeIdeaThread.id, {
          status: 'archived',
          summary: result.threadSummary?.trim() || activeIdeaThread.summary || activeIdeaThread.content,
          concludedAt: nowISO,
          lastDiscussedAt: nowISO,
        });
        createNewIdeaThread(
          nowISO,
          { role: 'user', content: trimmed, timestamp: userMessage.timestamp },
          { role: 'assistant', content: assistantMessage.content, timestamp: assistantMessage.timestamp },
          nextDraft,
          result.nextTopicTitle?.trim() || nextDraft.title,
        );
        setShowThreadArchived(true);
        setTimeout(() => setShowThreadArchived(false), 2800);
      } else if (activeIdeaThread) {
        updateCuriosityIdea(activeIdeaThread.id, {
          title: nextDraft.title || activeIdeaThread.title,
          content: nextDraft.content || activeIdeaThread.content,
          tags: mergeTags(activeIdeaThread.tags, nextDraft.tags),
          lastDiscussedAt: nowISO,
          conversation: [
            ...(activeIdeaThread.conversation || []),
            { role: 'user', content: trimmed, timestamp: userMessage.timestamp },
            { role: 'assistant', content: assistantMessage.content, timestamp: assistantMessage.timestamp },
          ],
          status: 'active',
        });
      } else {
        createNewIdeaThread(
          nowISO,
          { role: 'user', content: trimmed, timestamp: userMessage.timestamp },
          { role: 'assistant', content: assistantMessage.content, timestamp: assistantMessage.timestamp },
          nextDraft,
          result.nextTopicTitle?.trim() || nextDraft.title,
        );
      }
      if (result.shouldSaveIdea) markIdeaSavedToast();
    } catch (error) {
      setIdeaApiStatus('offline');
      setIdeaChatHistory((current) => [
        ...current,
        {
          id: `idea-${Date.now()}-a`,
          role: 'assistant',
          content: t(
            'I cannot connect right now. You can still keep this thought as a note.',
            '现在暂时无法连接。你仍然可以先把这个想法保存下来。',
          ),
          timestamp: getNowInAppTimeZoneISO(),
        },
      ]);
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
        tags: mergeTags(activeIdeaThread.tags, ideaDraft.tags),
        lastDiscussedAt: nowISO,
      });
    } else {
      addCuriosityIdea({
        date: today,
        title: ideaDraft.title.trim() || t('Untitled thought', '未命名想法'),
        content: ideaDraft.content.trim(),
        tags: dedupeTags(ideaDraft.tags),
        status: 'active',
        lastDiscussedAt: nowISO,
        conversation: [],
      });
    }
    markIdeaSavedToast();
  };

  const startEditIdea = (ideaId: string) => {
    const target = progress.curiosityIdeas.find((idea) => idea.id === ideaId);
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
    if (!editingIdeaId || !ideaEditForm.content.trim()) return;
    updateCuriosityIdea(editingIdeaId, {
      title: ideaEditForm.title.trim() || t('Untitled thought', '未命名想法'),
      content: ideaEditForm.content.trim(),
      summary: ideaEditForm.summary.trim() || undefined,
      tags: parseTagsText(ideaEditForm.tagsText),
      status: ideaEditForm.status,
      lastDiscussedAt: getNowInAppTimeZoneISO(),
    });
    cancelEditIdea();
  };

  const handleDeleteIdea = (ideaId: string) => {
    if (!window.confirm(t('Delete this saved idea?', '删除这条已保存的想法吗？'))) return;
    deleteCuriosityIdea(ideaId);
    if (editingIdeaId === ideaId) cancelEditIdea();
    if (expandedIdeaId === ideaId) setExpandedIdeaId(null);
  };

  const addDraftTag = () => {
    if (!ideaDraft || !draftTagInput.trim()) return;
    setIdeaDraft({ ...ideaDraft, tags: dedupeTags([...ideaDraft.tags, draftTagInput]) });
    setDraftTagInput('');
  };

  const removeDraftTag = (tag: string) => {
    if (ideaDraft) setIdeaDraft({ ...ideaDraft, tags: ideaDraft.tags.filter((item) => item !== tag) });
  };

  return (
    <SceneShell>
      <div className="inspiration-screen mx-auto max-w-xl space-y-4 px-4 pb-8 pt-5 text-slate-800">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inspiration-surface flex items-center gap-3 rounded-2xl p-3"
        >
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            aria-label={t('Back to home', '返回首页')}
            className="text-slate-700 hover:bg-white/55"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-medium text-slate-800">{t('Inspiration', '灵感')}</h1>
            <p className="text-sm text-slate-600">{t('Catch a thought before it slips away', '趁想法消失前，先把它留下')}</p>
          </div>
        </motion.header>

        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label={t('Inspiration views', '灵感视图')}
          className="inspiration-surface flex gap-2 rounded-2xl p-2"
        >
          <button
            type="button"
            onClick={() => setActiveTab('capture')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]/50 ${
              activeTab === 'capture' ? 'bg-[#dfecef] text-[#47737d]' : 'text-slate-500 hover:bg-white/55'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {t('Capture', '随手记下')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('develop')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]/50 ${
              activeTab === 'develop' ? 'bg-[#dfecef] text-[#47737d]' : 'text-slate-500 hover:bg-white/55'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            {t('Explore', '深入展开')}
          </button>
        </motion.nav>

        {activeTab === 'capture' && (
          <>
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inspiration-surface rounded-2xl p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-slate-800">{t('A new thought', '一个新想法')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('No category required. Write first.', '无需分类，先写下来。')}</p>
                </div>
                {todayLog && !logComposerVisible && (
                  <button
                    type="button"
                    onClick={() => openLogEditor(todayLog.id)}
                    className="cursor-pointer rounded-full bg-[#e3eef0] px-4 py-2 text-sm font-medium text-[#527a84] transition-colors hover:bg-[#d6e6e9]"
                  >
                    {t('Edit', '编辑')}
                  </button>
                )}
              </div>

              {logComposerVisible ? (
                <div className="space-y-3">
                  {editingLog && editingLog.date !== today && (
                    <p className="text-xs text-slate-500">
                      {t('Editing saved note from', '正在编辑保存于')}{' '}
                      {new Date(editingLog.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  <label className="sr-only" htmlFor="inspiration-note">{t('What caught your attention?', '什么吸引了你的注意？')}</label>
                  <textarea
                    id="inspiration-note"
                    value={logForm.newThingNoticed}
                    onChange={(event) => setLogForm({ ...logForm, newThingNoticed: event.target.value })}
                    placeholder={t('What caught your attention?', '什么吸引了你的注意？')}
                    className="min-h-28 w-full resize-none rounded-2xl border border-[#c5dade] bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/45"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCaptureDetails((current) => !current)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#527a84] transition-colors hover:text-[#3e6069]"
                  >
                    {showCaptureDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showCaptureDetails ? t('Hide optional details', '收起可选内容') : t('Add details or tags', '添加详情或标签')}
                  </button>
                  {showCaptureDetails && (
                    <div className="space-y-3 rounded-2xl bg-[#edf4f5] p-3">
                      <label className="sr-only" htmlFor="inspiration-detail">{t('A useful detail', '补充一点细节')}</label>
                      <input
                        id="inspiration-detail"
                        value={logForm.newSkillOrFact}
                        onChange={(event) => setLogForm({ ...logForm, newSkillOrFact: event.target.value })}
                        placeholder={t('A useful detail (optional)', '补充一点细节（可选）')}
                        className="w-full rounded-xl border border-[#c5dade] bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/45"
                      />
                      <div className="flex gap-2">
                        <label className="sr-only" htmlFor="inspiration-tag">{t('Add tag', '添加标签')}</label>
                        <input
                          id="inspiration-tag"
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder={t('Tag (optional)', '标签（可选）')}
                          className="min-w-0 flex-1 rounded-xl border border-[#c5dade] bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/45"
                        />
                        <Button type="button" variant="outline" onClick={addTag} className="border-[#c5dade] bg-white text-[#527a84]">
                          {t('Add', '添加')}
                        </Button>
                      </div>
                      {logForm.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {logForm.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs text-[#527a84]"
                              aria-label={t(`Remove ${tag}`, `移除 ${tag}`)}
                            >
                              {tag} x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {todayLog && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowLogForm(false);
                          setEditingLogId(null);
                        }}
                        className="flex-1 border-[#c5dade] bg-white/70 text-slate-600"
                      >
                        {t('Cancel', '取消')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSaveLog}
                      disabled={!logForm.newThingNoticed.trim()}
                      className="flex-1 bg-[#6b98a2] hover:bg-[#5a8791]"
                    >
                      {t('Save', '保存')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#edf4f5] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{todayLog.newThingNoticed}</p>
                  {todayLog.newSkillOrFact && <p className="mt-2 text-sm text-slate-500">{todayLog.newSkillOrFact}</p>}
                  {todayLog.tags && todayLog.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {todayLog.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs text-[#527a84]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.section>

            {recentLogs.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inspiration-surface rounded-2xl p-4">
                <h2 className="mb-3 text-base font-medium text-slate-800">{t('Saved recently', '最近保存')}</h2>
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <article key={log.id} className="rounded-2xl bg-[#edf4f5] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            {new Date(log.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-700">{log.newThingNoticed}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label={t('Edit', '编辑')} onClick={() => openLogEditor(log.id)} className="text-[#527a84] hover:bg-white">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" aria-label={t('Delete', '删除')} onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:bg-white hover:text-slate-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}

        {activeTab === 'develop' && (
          <>
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inspiration-surface rounded-2xl p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-slate-800">{t('Shape an idea', '把想法展开')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('Talk it through only when you need more room.', '需要更多空间时，再在这里聊开。')}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${
                  ideaApiStatus === 'ready'
                    ? 'bg-emerald-100 text-emerald-700'
                    : ideaApiStatus === 'checking'
                      ? 'bg-[#edf4f5] text-[#527a84]'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {ideaApiStatus === 'ready' ? t('Ready', '可使用') : ideaApiStatus === 'checking' ? t('Connecting', '连接中') : t('Offline', '离线')}
                </span>
              </div>
              {activeIdeaThread && (
                <p className="mb-3 rounded-xl bg-[#edf4f5] px-3 py-2 text-xs text-slate-600">
                  {t('Continuing:', '继续展开：')} {activeIdeaThread.title}
                </p>
              )}
              <div className="flex max-h-[42dvh] min-h-44 flex-col">
                <div className="mb-3 flex-1 space-y-3 overflow-y-auto pr-1 hide-scrollbar">
                  {ideaChatHistory.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      {t('Share an idea you would like to develop.', '写下一个你想继续展开的想法。')}
                    </div>
                  ) : (
                    ideaChatHistory.map((message) => (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          message.role === 'user'
                            ? 'bg-[#6b98a2] text-white'
                            : 'border border-[#d4e3e5] bg-[#edf4f5] text-slate-700'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="mt-1 text-[11px] opacity-60">{formatTime24(message.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={ideaChatEndRef} />
                </div>
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="develop-idea">{t('Develop an idea', '展开想法')}</label>
                  <input
                    id="develop-idea"
                    value={ideaInput}
                    onChange={(event) => setIdeaInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendIdeaMessage();
                      }
                    }}
                    placeholder={t('Write an idea...', '写下一个想法...')}
                    disabled={isIdeaSending}
                    className="min-w-0 flex-1 rounded-xl border border-[#c5dade] bg-white/85 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b98a2]/45"
                  />
                  <Button type="button" onClick={handleSendIdeaMessage} disabled={isIdeaSending || !ideaInput.trim()} className="bg-[#6b98a2] hover:bg-[#5a8791]" aria-label={t('Send', '发送')}>
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.section>

            {ideaDraft && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inspiration-surface rounded-2xl p-4">
                <h2 className="mb-3 text-base font-medium text-slate-800">{t('Ready to keep', '整理后保存')}</h2>
                <div className="space-y-3">
                  <label className="sr-only" htmlFor="idea-title">{t('Idea title', '想法标题')}</label>
                  <input id="idea-title" value={ideaDraft.title} onChange={(event) => setIdeaDraft({ ...ideaDraft, title: event.target.value })} placeholder={t('Idea title', '想法标题')} className="w-full rounded-xl border border-[#c5dade] bg-white/85 px-3 py-2.5 text-sm text-slate-800" />
                  <label className="sr-only" htmlFor="idea-summary">{t('Idea summary', '想法摘要')}</label>
                  <textarea id="idea-summary" value={ideaDraft.content} onChange={(event) => setIdeaDraft({ ...ideaDraft, content: event.target.value })} placeholder={t('Idea summary', '想法摘要')} className="min-h-20 w-full resize-none rounded-xl border border-[#c5dade] bg-white/85 px-3 py-2.5 text-sm text-slate-800" />
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor="idea-tag">{t('Add tag', '添加标签')}</label>
                    <input id="idea-tag" value={draftTagInput} onChange={(event) => setDraftTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDraftTag(); } }} placeholder={t('Tag (optional)', '标签（可选）')} className="min-w-0 flex-1 rounded-xl border border-[#c5dade] bg-white/85 px-3 py-2.5 text-sm text-slate-800" />
                    <Button type="button" variant="outline" onClick={addDraftTag} className="border-[#c5dade] bg-white text-[#527a84]">{t('Add', '添加')}</Button>
                  </div>
                  {ideaDraft.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ideaDraft.tags.map((tag) => (
                        <button key={tag} type="button" onClick={() => removeDraftTag(tag)} className="cursor-pointer rounded-full bg-[#edf4f5] px-3 py-1 text-xs text-[#527a84]">{tag} x</button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" onClick={saveDraftIdea} className="flex-1 bg-[#6b98a2] hover:bg-[#5a8791]">{t('Save idea', '保存想法')}</Button>
                    <Button type="button" variant="outline" onClick={() => setIdeaDraft(null)} className="border-[#c5dade] bg-white/70 text-slate-600">{t('Clear', '清除')}</Button>
                  </div>
                </div>
              </motion.section>
            )}

            {ideaList.length > 0 && (
              <details className="inspiration-surface rounded-2xl p-4">
                <summary className="cursor-pointer list-none text-base font-medium text-slate-700">
                  {t('Saved ideas', '已保存想法')} <span className="ml-1 text-sm font-normal text-slate-500">({ideaList.length})</span>
                </summary>
                <div className="mt-4 space-y-2">
                  {ideaList.map((idea) => {
                    const conversation = idea.conversation || [];
                    const expanded = expandedIdeaId === idea.id;
                    return (
                      <article key={idea.id} className="rounded-2xl bg-[#edf4f5] p-3">
                        {editingIdeaId === idea.id ? (
                          <div className="space-y-2">
                            <input value={ideaEditForm.title} onChange={(event) => setIdeaEditForm({ ...ideaEditForm, title: event.target.value })} className="w-full rounded-xl border border-[#c5dade] bg-white px-3 py-2 text-sm" aria-label={t('Idea title', '想法标题')} />
                            <textarea value={ideaEditForm.content} onChange={(event) => setIdeaEditForm({ ...ideaEditForm, content: event.target.value })} className="min-h-20 w-full rounded-xl border border-[#c5dade] bg-white px-3 py-2 text-sm" aria-label={t('Idea content', '想法内容')} />
                            <input value={ideaEditForm.tagsText} onChange={(event) => setIdeaEditForm({ ...ideaEditForm, tagsText: event.target.value })} placeholder={t('Tags, separated by commas', '标签，用逗号分隔')} className="w-full rounded-xl border border-[#c5dade] bg-white px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <Button type="button" onClick={saveEditedIdea} className="bg-[#6b98a2] hover:bg-[#5a8791]">{t('Save', '保存')}</Button>
                              <Button type="button" variant="outline" onClick={cancelEditIdea} className="border-[#c5dade] bg-white text-slate-600">{t('Cancel', '取消')}</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-700">{idea.title}</p>
                                <p className="mt-1 text-xs text-slate-500">{new Date(idea.lastDiscussedAt || idea.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</p>
                              </div>
                              <div className="flex shrink-0">
                                <Button type="button" size="icon" variant="ghost" aria-label={t('Edit', '编辑')} onClick={() => startEditIdea(idea.id)} className="text-[#527a84] hover:bg-white"><Pencil className="h-4 w-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" aria-label={t('Delete', '删除')} onClick={() => handleDeleteIdea(idea.id)} className="text-slate-400 hover:bg-white hover:text-slate-600"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{idea.summary || idea.content}</p>
                            {conversation.length > 0 && (
                              <button type="button" onClick={() => setExpandedIdeaId(expanded ? null : idea.id)} className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#527a84]">
                                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                {t('Conversation', '对话')} ({conversation.length})
                              </button>
                            )}
                            {expanded && (
                              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-white/70 p-2 hide-scrollbar">
                                {conversation.map((turn, index) => (
                                  <p key={`${idea.id}-${index}-${turn.timestamp}`} className="text-xs text-slate-600">
                                    <span className="font-medium">{turn.role === 'user' ? t('You', '你') : t('Assistant', '助手')}:</span> {turn.content}
                                  </p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        )}

        <AnimatePresence>
          {(showSuccess || showIdeaSaved || showThreadArchived) && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/50 bg-white/95 px-5 py-3 text-sm font-medium text-[#527a84] shadow-lg">
              {showSuccess
                ? t('Saved to Memories', '已保存到记忆')
                : showThreadArchived
                  ? t('Previous idea saved. New thread started.', '上一条想法已保存，新的展开已开始。')
                  : t('Idea updated', '想法已更新')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneShell>
  );
}
