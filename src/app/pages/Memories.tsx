import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BookOpen,
  ChevronRight,
  Lightbulb,
  Mountain,
  Plus,
  Tag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PrimaryNav } from '../components/PrimaryNav';
import { SceneShell } from '../components/SceneShell';
import { useLanguage } from '../context/LanguageContext';
import { useMindIslands } from '../context/MindIslandsContext';
import { getDateKey } from '../lib/time';
import type { MemoryEntry, MemoryTemplate } from '../types';

type TimelineItem = MemoryEntry & { legacy?: boolean };
type FilterId = 'body' | 'progress' | 'connection' | string;

const systemThemeLabels: Record<string, { en: string; zh: string }> = {
  body: { en: 'Body', zh: '身体' },
  progress: { en: 'Progress', zh: '进展' },
  connection: { en: 'Connection', zh: '连接' },
  inspiration: { en: 'Inspiration', zh: '灵感' },
};

const cleanTags = (text: string) => {
  const seen = new Set<string>();
  return text
    .split(/[,，]/)
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export function Memories() {
  const { progress, addMemoryEntry, updateMemoryEntry, togglePinnedMemoryTheme } = useMindIslands();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const view = params.get('view') === 'insights' ? 'insights' : 'timeline';
  const filter = params.get('filter') || '';
  const activeTodos = progress.todos.filter((todo) => !todo.completed).length;

  const timeline = useMemo<TimelineItem[]>(() => {
    const legacy: TimelineItem[] = [
      ...progress.healthCheckIns.map((item) => ({
        id: `legacy-health-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: t('Body check-in', '身体记录'),
        content: [
          item.notes,
          typeof item.energyLevel === 'number'
            ? t(`Energy ${item.energyLevel}/5`, `精力 ${item.energyLevel}/5`)
            : '',
          item.workoutCompleted ? t('Movement completed', '完成了运动') : '',
        ]
          .filter(Boolean)
          .join(' · '),
        tags: ['body'],
        source: 'manual' as const,
        template: 'body' as const,
        legacy: true,
      })),
      ...progress.workDailyLogs.map((item) => ({
        id: `legacy-work-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: t('Progress', '进展'),
        content: [item.progressStep, item.todaysWin].filter(Boolean).join(' · '),
        tags: ['progress', 'work'],
        source: 'manual' as const,
        template: 'progress' as const,
        legacy: true,
      })),
      ...progress.learningDailyLogs.map((item) => ({
        id: `legacy-learning-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: t('Learning progress', '学习进展'),
        content: item.whatILearned,
        tags: ['progress', 'learning'],
        source: 'manual' as const,
        template: 'progress' as const,
        legacy: true,
      })),
      ...progress.relationshipLogs.map((item) => ({
        id: `legacy-relationship-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: t('Connection', '连接'),
        content: [item.personName, item.momentNote, item.gratitudeNote].filter(Boolean).join(' · '),
        tags: ['connection'],
        source: 'manual' as const,
        template: 'connection' as const,
        legacy: true,
      })),
      ...progress.curiosityLogs.map((item) => ({
        id: `legacy-inspiration-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: t('Saved inspiration', '保存的灵感'),
        content: [item.newThingNoticed, item.newSkillOrFact].filter(Boolean).join(' · '),
        tags: ['inspiration', ...(item.tags || [])],
        source: 'inspiration' as const,
        template: 'general' as const,
        legacy: true,
      })),
      ...progress.curiosityIdeas.map((item) => ({
        id: `legacy-idea-${item.id}`,
        date: item.date,
        createdAt: item.date,
        title: item.title || t('Saved inspiration', '保存的灵感'),
        content: item.summary || item.content,
        tags: ['inspiration', ...(item.tags || [])],
        source: 'inspiration' as const,
        template: 'general' as const,
        legacy: true,
      })),
    ];
    return [...progress.memoryEntries, ...legacy]
      .filter((item) => item.content.trim() || item.title.trim())
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
  }, [
    progress.memoryEntries,
    progress.healthCheckIns,
    progress.workDailyLogs,
    progress.learningDailyLogs,
    progress.relationshipLogs,
    progress.curiosityLogs,
    progress.curiosityIdeas,
    language,
  ]);

  const visibleTimeline = filter
    ? timeline.filter((item) => item.tags.some((tag) => tag.toLocaleLowerCase() === filter.toLocaleLowerCase()))
    : timeline;
  const themeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    timeline.forEach((entry) =>
      entry.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [timeline]);

  const setView = (nextView: 'timeline' | 'insights') => {
    const next = new URLSearchParams(params);
    if (nextView === 'timeline') next.delete('view');
    else next.set('view', nextView);
    setParams(next);
  };
  const setFilter = (nextFilter?: string) => {
    const next = new URLSearchParams(params);
    if (nextFilter) next.set('filter', nextFilter);
    else next.delete('filter');
    next.delete('view');
    setParams(next);
  };
  const displayTag = (tag: string) => {
    const system = systemThemeLabels[tag.toLocaleLowerCase()];
    return system ? t(system.en, system.zh) : tag;
  };

  return (
    <SceneShell>
      <div className="relative min-h-full pb-28 text-slate-800">
        <div className="sticky top-0 z-10 bg-[rgba(232,242,245,0.82)] px-5 pb-4 pt-6 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#527a84]">Mind Islands</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">{t('Memories', '记忆')}</h1>
              <p className="mt-1 text-sm text-slate-600">{t('What I chose to keep and revisit', '我选择留下、值得回看的内容')}</p>
            </div>
            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#6b98a2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t('Add', '添加')}
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 rounded-full bg-white/55 p-1">
            {(['timeline', 'insights'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-full py-2 text-sm font-medium transition ${
                  view === item ? 'bg-white text-[#426a74] shadow-sm' : 'text-slate-500'
                }`}
              >
                {item === 'timeline' ? t('Memories', '记忆') : t('Insights', '洞察')}
              </button>
            ))}
          </div>
        </div>

        <main className="space-y-5 px-5 pt-4">
          {view === 'timeline' ? (
            <>
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">{t('Personal Theme Islands', '个人主题岛')}</h2>
                  {filter && (
                    <button type="button" onClick={() => setFilter()} className="text-xs font-medium text-[#557f89]">
                      {t('Show all', '查看全部')}
                    </button>
                  )}
                </div>
                {progress.pinnedMemoryThemes.length > 0 ? (
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                    {progress.pinnedMemoryThemes.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFilter(filter === tag ? undefined : tag)}
                        className={`min-w-[92px] rounded-[24px] border px-3 py-3 text-left ${
                          filter === tag ? 'border-[#6b98a2] bg-white/90' : 'border-white/35 bg-white/48'
                        }`}
                      >
                        <Mountain className="h-5 w-5 text-[#608c96]" />
                        <span className="mt-2 block truncate text-xs font-semibold">{displayTag(tag)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-[22px] bg-white/48 p-4 text-sm text-slate-500">
                    {t('Pin a tag from a memory to shape your own islands.', '在记录中固定标签，慢慢形成属于你的主题岛。')}
                  </p>
                )}
              </section>

              <section className="space-y-3">
                {filter && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#557f89]">
                    <Tag className="h-3.5 w-3.5" />
                    {displayTag(filter)}
                  </p>
                )}
                {visibleTimeline.length === 0 ? (
                  <div className="rounded-[26px] bg-white/56 px-5 py-10 text-center text-sm text-slate-500">
                    {t('No memories here yet. Add one without choosing a category first.', '这里还没有记忆。无需先选分类，直接记下一条即可。')}
                  </div>
                ) : (
                  visibleTimeline.map((entry) => (
                    <article key={entry.id} className="rounded-[25px] bg-white/72 p-4 shadow-[0_8px_20px_rgba(20,52,64,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">{entry.date}</p>
                          <h3 className="mt-1 font-semibold text-slate-800">{entry.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {!entry.legacy && (
                            <button type="button" onClick={() => setEditingEntry(entry)} className="text-xs font-medium text-[#557f89]">
                              {t('Edit', '编辑')}
                            </button>
                          )}
                          <span className="rounded-full bg-[#deebee] px-2.5 py-1 text-[11px] text-[#517b84]">
                            {entry.source === 'inspiration' ? t('Inspiration', '灵感') : entry.source === 'harbor-saved' ? t('Saved', '主动保存') : t('Memory', '记忆')}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{entry.content}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => {
                          const pinned = progress.pinnedMemoryThemes.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase());
                          return (
                            <span key={tag} className="inline-flex items-center rounded-full bg-[#edf3f4] text-xs text-[#547983]">
                              <button type="button" onClick={() => setFilter(tag)} className="px-2.5 py-1.5">
                                {displayTag(tag)}
                              </button>
                              <button
                                type="button"
                                aria-label={pinned ? t('Unpin theme', '取消固定主题') : t('Pin theme island', '固定为主题岛')}
                                onClick={() => togglePinnedMemoryTheme(tag)}
                                className="border-l border-[#d7e3e6] px-2 py-1.5 font-semibold"
                              >
                                {pinned ? '-' : '+'}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : (
            <InsightsView
              timeline={timeline}
              themes={themeCounts}
              planCount={progress.workGoals.length + progress.learningGoals.length}
              onThemeClick={setFilter}
              onActions={() => navigate('/actions?tab=plans')}
              displayTag={displayTag}
            />
          )}
        </main>
      </div>
      <PrimaryNav active="memories" actionsBadge={activeTodos} />
      <AnimatePresence>
        {(captureOpen || editingEntry) && (
          <MemoryCapture
            initial={editingEntry || undefined}
            onClose={() => {
              setCaptureOpen(false);
              setEditingEntry(null);
            }}
            onSave={(entry) => {
              if (editingEntry) updateMemoryEntry(editingEntry.id, entry);
              else addMemoryEntry(entry);
              setCaptureOpen(false);
              setEditingEntry(null);
            }}
          />
        )}
      </AnimatePresence>
    </SceneShell>
  );
}

function InsightsView({
  timeline,
  themes,
  planCount,
  onThemeClick,
  onActions,
  displayTag,
}: {
  timeline: TimelineItem[];
  themes: Array<[string, number]>;
  planCount: number;
  onThemeClick: (tag: string) => void;
  onActions: () => void;
  displayTag: (tag: string) => string;
}) {
  const { t } = useLanguage();
  const lastSeven = timeline.filter((item) => {
    const distance = Date.now() - new Date(item.date).getTime();
    return distance <= 7 * 24 * 60 * 60 * 1000;
  });
  const activeDays = new Set(lastSeven.map((item) => item.date)).size;
  const resurfaced = timeline.find((item) => item.source === 'inspiration') || timeline[0];

  return (
    <div className="space-y-4">
      <section className="rounded-[25px] bg-white/72 p-5">
        <div className="flex items-center gap-2 text-[#547f89]">
          <TrendingUp className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{t('Themes taking shape', '正在形成的主题')}</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {themes.slice(0, 6).map(([tag, count]) => (
            <button key={tag} type="button" onClick={() => onThemeClick(tag)} className="rounded-full bg-[#e4eef0] px-3 py-2 text-sm text-[#4d747e]">
              {displayTag(tag)} <span className="ml-1 text-xs text-slate-500">{count}</span>
            </button>
          ))}
          {themes.length === 0 && <p className="text-sm text-slate-500">{t('Themes appear as I record more moments.', '多记录一些片刻后，主题会自然浮现。')}</p>}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-white/68 p-4">
          <Activity className="h-4 w-4 text-[#5a858f]" />
          <p className="mt-3 text-2xl font-semibold">{activeDays}</p>
          <p className="text-xs text-slate-500">{t('days with memories this week', '本周留下记忆的天数')}</p>
        </div>
        <div className="rounded-[24px] bg-white/68 p-4">
          <BookOpen className="h-4 w-4 text-[#5a858f]" />
          <p className="mt-3 text-2xl font-semibold">{lastSeven.length}</p>
          <p className="text-xs text-slate-500">{t('moments kept recently', '最近留下的片刻')}</p>
        </div>
      </section>
      {resurfaced && (
        <section className="rounded-[25px] bg-white/72 p-5">
          <div className="flex items-center gap-2 text-[#547f89]">
            <Lightbulb className="h-4 w-4" />
            <h2 className="text-sm font-semibold">{t('Worth seeing again', '值得再看一眼')}</h2>
          </div>
          <h3 className="mt-3 font-semibold">{resurfaced.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{resurfaced.content}</p>
        </section>
      )}
      {planCount > 0 && (
        <button type="button" onClick={onActions} className="flex w-full items-center justify-between rounded-[25px] bg-white/72 p-5 text-left">
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Users className="h-4 w-4 text-[#547f89]" />{t('Plans in motion', '进行中的计划')}</span>
            <span className="mt-1 block text-sm text-slate-500">{t(`${planCount} plans can shape future progress memories.`, `${planCount} 个计划可继续形成进展记忆。`)}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      )}
      <details className="rounded-[25px] bg-white/60 p-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium">{t('Activity overview', '活动概览')}</summary>
        <p className="mt-3">{t('A light overview stays here when I need it, without taking over the first screen.', '需要时再展开查看日期概览，不让统计占据首屏。')}</p>
      </details>
    </div>
  );
}

function MemoryCapture({
  initial,
  onClose,
  onSave,
}: {
  initial?: MemoryEntry;
  onClose: () => void;
  onSave: (entry: Omit<MemoryEntry, 'id' | 'createdAt'>) => void;
}) {
  const { t } = useLanguage();
  const [template, setTemplate] = useState<MemoryTemplate>(initial?.template || 'general');
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [energy, setEnergy] = useState(initial?.fields?.energyLevel ? String(initial.fields.energyLevel) : '');
  const [sleep, setSleep] = useState(initial?.fields?.sleepTime || '');
  const [movement, setMovement] = useState(Boolean(initial?.fields?.workoutCompleted));
  const [person, setPerson] = useState(initial?.fields?.personName || '');

  const save = () => {
    if (!content.trim()) return;
    const presetTags = template === 'general' ? [] : [template];
    onSave({
      date: initial?.date || getDateKey(),
      title: title.trim() || t('Untitled memory', '未命名记忆'),
      content: content.trim(),
      tags: [...presetTags, ...cleanTags(tags)],
      source: initial?.source || 'manual',
      template,
      fields: {
        energyLevel: energy ? Number(energy) : undefined,
        sleepTime: sleep || undefined,
        workoutCompleted: template === 'body' ? movement : undefined,
        personName: template === 'connection' ? person.trim() || undefined : undefined,
      },
    });
  };
  const choices: Array<{ id: MemoryTemplate; label: string }> = [
    { id: 'general', label: t('Memory', '普通') },
    { id: 'body', label: t('Body', '身体') },
    { id: 'progress', label: t('Progress', '进展') },
    { id: 'connection', label: t('Connection', '连接') },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/15 backdrop-blur-[2px]" onClick={onClose}>
      <motion.section
        initial={{ y: 34 }}
        animate={{ y: 0 }}
        exit={{ y: 34 }}
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-[420px] overflow-y-auto rounded-t-[30px] bg-[#edf4f5] p-5 text-slate-800 sm:bottom-[4dvh] sm:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{initial ? t('Edit memory', '编辑记忆') : t('Add a memory', '添加记忆')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close add memory', '关闭添加记忆')} className="rounded-full p-2 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-slate-500">{t('Start simple. Use a template only when it helps.', '先简单记下，需要时再使用模板。')}</p>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {choices.map((choice) => (
            <button key={choice.id} type="button" onClick={() => setTemplate(choice.id)} className={`rounded-full px-3 py-2 text-sm ${template === choice.id ? 'bg-[#6b98a2] text-white' : 'bg-white text-slate-600'}`}>
              {choice.label}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('Title (optional)', '标题（可选）')} className="w-full rounded-2xl border border-[#c9dadd] bg-white/85 px-4 py-3 text-sm outline-none focus:border-[#6b98a2]" />
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('What do I want to remember?', '我想记住什么？')} className="min-h-[110px] w-full resize-none rounded-2xl border border-[#c9dadd] bg-white/85 px-4 py-3 text-sm outline-none focus:border-[#6b98a2]" />
          {template === 'body' && (
            <div className="grid grid-cols-2 gap-2">
              <select value={energy} onChange={(event) => setEnergy(event.target.value)} className="rounded-xl border border-[#c9dadd] bg-white px-3 py-3 text-sm">
                <option value="">{t('Energy (optional)', '精力（可选）')}</option>
                {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}/5</option>)}
              </select>
              <input type="time" value={sleep} onChange={(event) => setSleep(event.target.value)} className="rounded-xl border border-[#c9dadd] bg-white px-3 py-3 text-sm" aria-label={t('Sleep time', '入睡时间')} />
              <label className="col-span-2 flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm"><input type="checkbox" checked={movement} onChange={(event) => setMovement(event.target.checked)} />{t('I moved my body today', '今天做了运动')}</label>
            </div>
          )}
          {template === 'connection' && <input value={person} onChange={(event) => setPerson(event.target.value)} placeholder={t('Person (optional)', '人物（可选）')} className="w-full rounded-2xl border border-[#c9dadd] bg-white/85 px-4 py-3 text-sm" />}
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t('Tags, separated by commas', '标签，用逗号分隔')} className="w-full rounded-2xl border border-[#c9dadd] bg-white/85 px-4 py-3 text-sm" />
        </div>
        <button type="button" disabled={!content.trim()} onClick={save} className="mt-5 w-full rounded-full bg-[#6b98a2] py-3 text-sm font-semibold text-white disabled:opacity-45">
          {initial ? t('Update memory', '更新记忆') : t('Save memory', '保存记忆')}
        </button>
      </motion.section>
    </motion.div>
  );
}
