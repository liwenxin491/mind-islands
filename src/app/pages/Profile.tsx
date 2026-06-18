import { ArrowLeft, Brain, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PrimaryNav } from '../components/PrimaryNav';
import { SceneShell } from '../components/SceneShell';
import { useLanguage } from '../context/LanguageContext';
import { useMindIslands } from '../context/MindIslandsContext';
import type { ProfileSignalCategory } from '../types';

const categoryLabels: Record<ProfileSignalCategory, { en: string; zh: string }> = {
  stressor: { en: 'Recurring stressors', zh: '反复出现的压力' },
  goal: { en: 'Goals', zh: '目标' },
  routine: { en: 'Routines', zh: '日常习惯' },
  support_style: { en: 'Helpful support style', zh: '适合我的支持方式' },
  coping_strategy: { en: 'Coping strategies', zh: '有效的稳定方式' },
  relationship_theme: { en: 'Relationship themes', zh: '关系主题' },
  tone_preference: { en: 'Tone preferences', zh: '语气偏好' },
  identity: { en: 'Identity context', zh: '身份/处境' },
  interest: { en: 'Interests', zh: '兴趣' },
};

export function Profile() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    progress,
    memorySettings,
    profileFacts,
    updateMemorySettings,
    deleteProfileFact,
  } = useMindIslands();
  const activeTodos = progress.todos.filter((todo) => !todo.completed).length;
  const grouped = profileFacts.reduce<Record<string, typeof profileFacts>>((acc, fact) => {
    acc[fact.category] = [...(acc[fact.category] || []), fact];
    return acc;
  }, {});

  const settingRows = [
    {
      key: 'saveMemoriesEnabled' as const,
      label: t('Save memories', '保存记忆'),
      detail: t('Keep confirmed inputs as revisitable memory events.', '把确认后的输入保存为可回看的记忆。'),
    },
    {
      key: 'profileLearningEnabled' as const,
      label: t('Learn my profile', '学习我的画像'),
      detail: t('Update explainable profile facts from saved memories.', '从保存的记忆中更新可解释的画像事实。'),
    },
    {
      key: 'aiPersonalizationEnabled' as const,
      label: t('AI personalization', 'AI 个性化'),
      detail: t('Allow AI features to use a compact profile summary.', '允许 AI 使用紧凑的画像摘要。'),
    },
    {
      key: 'harborMemoryEnabled' as const,
      label: t('Harbor memory', '栖息地使用记忆'),
      detail: t('Let Self-Compassion Chat use safe summaries and pinned memories.', '允许自我关怀对话使用安全摘要和固定记忆。'),
    },
  ];

  return (
    <SceneShell>
      <div className="relative min-h-full pb-28 text-slate-800">
        <div className="sticky top-0 z-10 bg-[rgba(232,242,245,0.86)] px-5 pb-4 pt-6 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate('/memories')}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-2 text-xs font-semibold text-[#557f89]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Memories', '记忆')}
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#527a84]">Mind Islands</p>
          <h1 className="mt-2 text-3xl font-semibold">{t('Memory Profile', '记忆画像')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t('What the system has learned, with controls to remove it.', '系统学到的内容，以及可以移除它的控制。')}
          </p>
        </div>

        <main className="space-y-5 px-5 pt-4">
          <section className="rounded-[25px] bg-white/72 p-5">
            <div className="flex items-center gap-2 text-[#547f89]">
              <Brain className="h-4 w-4" />
              <h2 className="text-sm font-semibold">{t('Consent layers', '同意设置')}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {settingRows.map((row) => (
                <label key={row.key} className="flex items-center justify-between gap-4 rounded-2xl bg-[#eef6f7] px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{row.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{row.detail}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={memorySettings[row.key]}
                    onChange={(event) => updateMemorySettings({ [row.key]: event.target.checked })}
                    className="h-5 w-5"
                  />
                </label>
              ))}
            </div>
          </section>

          {profileFacts.length === 0 ? (
            <section className="rounded-[25px] bg-white/68 p-6 text-sm leading-6 text-slate-500">
              {t('No profile facts yet. Confirmed memories will gradually create explainable patterns here.', '还没有画像事实。确认保存的记忆会逐渐在这里形成可解释的模式。')}
            </section>
          ) : (
            Object.entries(grouped).map(([category, facts]) => {
              const label = categoryLabels[category as ProfileSignalCategory];
              return (
                <section key={category} className="rounded-[25px] bg-white/72 p-5">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {label ? t(label.en, label.zh) : category}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {facts.map((fact) => (
                      <article key={fact.id} className="flex items-start justify-between gap-3 rounded-2xl bg-[#eef6f7] px-4 py-3">
                        <div>
                          <p className="text-sm leading-6 text-slate-700">{fact.value}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t('Confidence', '置信度')} {Math.round(fact.confidence * 100)}% · {fact.evidenceMemoryIds.length} {t('source(s)', '条来源')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteProfileFact(fact.id)}
                          aria-label={t('Delete profile fact', '删除画像事实')}
                          className="rounded-full p-2 text-rose-500 transition hover:bg-white/75"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </main>
      </div>
      <PrimaryNav active="memories" actionsBadge={activeTodos} />
    </SceneShell>
  );
}
