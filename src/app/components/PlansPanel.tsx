import { Activity, ChevronDown, Clock, Plus, Target } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useMindIslands } from '../context/MindIslandsContext';
import type { WorkStage } from '../types';

export function PlansPanel() {
  const {
    progress,
    addWorkGoal,
    addLearningGoal,
    updateWorkGoal,
    updateLearningGoal,
    addWorkGoalCheckIn,
    addLearningGoalCheckIn,
    deleteWorkGoal,
    deleteLearningGoal,
    addWorkItem,
    updateWorkItem,
    updateRoutineSettings,
  } = useMindIslands();
  const { t } = useLanguage();
  const [newPlan, setNewPlan] = useState('');
  const [newTrack, setNewTrack] = useState<'work' | 'learning'>('work');
  const [pipelineTitle, setPipelineTitle] = useState('');

  const addPlan = () => {
    if (!newPlan.trim()) return;
    if (newTrack === 'work') {
      addWorkGoal({
        text: newPlan.trim(),
        checkInMode: 'fixed',
        cadence: 'weekly',
        cadenceInterval: 1,
        progressPercent: 0,
        progressCheckInThreshold: 25,
        checkIns: [],
      });
    } else {
      addLearningGoal({
        ultimateGoal: newPlan.trim(),
        weeklyMilestones: [],
        checkInMode: 'fixed',
        cadence: 'weekly',
        cadenceInterval: 1,
        progressPercent: 0,
        progressCheckInThreshold: 25,
        checkIns: [],
      });
    }
    setNewPlan('');
  };

  const stages: Array<{ value: WorkStage; label: string }> = [
    { value: 'planned', label: t('Planned', '计划中') },
    { value: 'applied', label: t('Started', '已开始') },
    { value: 'waiting', label: t('Waiting', '等待中') },
    { value: 'interview', label: t('Review', '复盘中') },
    { value: 'outcome', label: t('Done', '已完成') },
  ];

  return (
    <div className="space-y-4 pb-3">
      <section className="rounded-[25px] bg-white/72 p-5">
        <div className="flex items-center gap-2 text-slate-800">
          <Target className="h-4 w-4 text-[#557f89]" />
          <h2 className="text-sm font-semibold">{t('Plans', '计划')}</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">{t('Goals stay here until I need to adjust them.', '目标安静地放在这里，只在需要管理时打开。')}</p>
        <details className="mt-4">
          <summary className="cursor-pointer rounded-full bg-[#e6eff1] px-4 py-2.5 text-sm font-medium text-[#547983]">
            <Plus className="mr-1.5 inline h-4 w-4" />
            {t('Create a plan', '创建计划')}
          </summary>
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              {(['work', 'learning'] as const).map((track) => (
                <button key={track} type="button" onClick={() => setNewTrack(track)} className={`rounded-full px-3 py-2 text-xs ${newTrack === track ? 'bg-[#6b98a2] text-white' : 'bg-[#e9f0f2] text-slate-600'}`}>
                  {track === 'work' ? t('Work', '工作') : t('Learning', '学习')}
                </button>
              ))}
            </div>
            <input value={newPlan} onChange={(event) => setNewPlan(event.target.value)} placeholder={t('What am I working toward?', '我希望推进什么？')} className="w-full rounded-xl border border-[#c9dadd] bg-white px-3 py-3 text-sm" />
            <button type="button" onClick={addPlan} disabled={!newPlan.trim()} className="w-full rounded-full bg-[#6b98a2] py-2.5 text-sm font-semibold text-white disabled:opacity-40">{t('Save plan', '保存计划')}</button>
          </div>
        </details>
        <div className="mt-4 space-y-3">
          {progress.workGoals.map((goal) => (
            <PlanCard
              key={goal.id}
              title={goal.text}
              label={t('Work', '工作')}
              progress={goal.progressPercent}
              onProgress={(value) => updateWorkGoal(goal.id, { progressPercent: value })}
              onCheckIn={() => addWorkGoalCheckIn(goal.id)}
              onDelete={() => deleteWorkGoal(goal.id)}
            />
          ))}
          {progress.learningGoals.map((goal) => (
            <PlanCard
              key={goal.id}
              title={goal.ultimateGoal}
              label={t('Learning', '学习')}
              progress={goal.progressPercent}
              onProgress={(value) => updateLearningGoal(goal.id, { progressPercent: value })}
              onCheckIn={() => addLearningGoalCheckIn(goal.id)}
              onDelete={() => deleteLearningGoal(goal.id)}
            />
          ))}
          {progress.workGoals.length + progress.learningGoals.length === 0 && (
            <p className="rounded-2xl bg-[#edf3f4] px-4 py-5 text-center text-sm text-slate-500">{t('No plans set right now.', '目前还没有计划。')}</p>
          )}
        </div>
      </section>

      <details className="rounded-[25px] bg-white/68 p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#557f89]" />{t('Progress pipeline', '进展流程')}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </summary>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input value={pipelineTitle} onChange={(event) => setPipelineTitle(event.target.value)} placeholder={t('Add an item', '添加事项')} className="min-w-0 flex-1 rounded-xl border border-[#c9dadd] bg-white px-3 py-2.5 text-sm" />
            <button
              type="button"
              onClick={() => {
                if (!pipelineTitle.trim()) return;
                addWorkItem({ title: pipelineTitle.trim(), stage: 'planned' });
                setPipelineTitle('');
              }}
              className="rounded-full bg-[#6b98a2] px-4 text-sm font-medium text-white"
            >
              {t('Add', '添加')}
            </button>
          </div>
          {progress.workItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-xl bg-[#edf3f4] p-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <select value={item.stage} onChange={(event) => updateWorkItem(item.id, { stage: event.target.value as WorkStage })} className="rounded-lg bg-white px-2 py-1 text-xs">
                {stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-[25px] bg-white/68 p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
          <span>{t('Rhythm settings', '节奏设置')}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </summary>
        <p className="mt-3 text-sm text-slate-500">{t('Low-frequency settings stay out of daily memories.', '低频配置不再占据日常记忆界面。')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <TimeWheelField
            label={t('Sleep', '入睡')}
            value={progress.routineSettings.sleepTargetTime}
            onChange={(value) => updateRoutineSettings({ sleepTargetTime: value })}
          />
          <TimeWheelField
            label={t('Wake', '起床')}
            value={progress.routineSettings.wakeTargetTime}
            onChange={(value) => updateRoutineSettings({ wakeTargetTime: value })}
          />
          <TimeWheelField
            label={t('Breakfast', '早餐')}
            value={progress.routineSettings.mealTimes.breakfast}
            onChange={(value) =>
              updateRoutineSettings({
                mealTimes: { ...progress.routineSettings.mealTimes, breakfast: value },
              })
            }
          />
          <TimeWheelField
            label={t('Lunch', '午餐')}
            value={progress.routineSettings.mealTimes.lunch}
            onChange={(value) =>
              updateRoutineSettings({
                mealTimes: { ...progress.routineSettings.mealTimes, lunch: value },
              })
            }
          />
          <TimeWheelField
            label={t('Dinner', '晚餐')}
            value={progress.routineSettings.mealTimes.dinner}
            onChange={(value) =>
              updateRoutineSettings({
                mealTimes: { ...progress.routineSettings.mealTimes, dinner: value },
              })
            }
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={progress.routineSettings.avatarRemindersEnabled} onChange={(event) => updateRoutineSettings({ avatarRemindersEnabled: event.target.checked })} />
          {t('Otter reminders enabled', '开启海獭提醒')}
        </label>
      </details>
    </div>
  );
}

function TimeWheelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => splitTime(value));
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => padTimePart(index)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, index) => padTimePart(index)), []);

  useEffect(() => {
    if (!open) {
      setDraft(splitTime(value));
      return;
    }
    const next = splitTime(value);
    setDraft(next);
    window.setTimeout(() => {
      document.getElementById(`${safeId}-hour-${next.hour}`)?.scrollIntoView({ block: 'center' });
      document.getElementById(`${safeId}-minute-${next.minute}`)?.scrollIntoView({ block: 'center' });
    }, 40);
  }, [open, safeId, value]);

  const commit = () => {
    onChange(`${draft.hour}:${draft.minute}`);
    setOpen(false);
  };

  return (
    <div>
      <div className="font-semibold text-slate-600">{label}</div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-[#c9dadd] bg-white px-3 py-2 text-left text-lg font-medium text-slate-700 shadow-sm transition-colors hover:bg-[#f7fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b98a2]/45"
        aria-haspopup="dialog"
        aria-label={`${label}: ${value}`}
      >
        <span>{value}</span>
        <Clock className="h-4 w-4 text-[#527a84]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/20 px-4 pb-4 backdrop-blur-[2px]" role="presentation">
          <button
            type="button"
            aria-label={t('Close time picker', '关闭时间选择')}
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('Choose time', '选择时间')}
            className="relative w-full max-w-sm rounded-[28px] border border-white/55 bg-[rgba(244,249,250,0.97)] p-4 text-slate-800 shadow-[0_24px_80px_rgba(6,33,43,0.24)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{label}</h3>
                <p className="mt-1 text-xs text-slate-500">{t('Scroll to choose hour and minute', '上下滑动选择小时和分钟')}</p>
              </div>
              <div className="rounded-full bg-[#e2eef0] px-3 py-1 text-sm font-semibold text-[#527a84]">
                {draft.hour}:{draft.minute}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <TimeWheelColumn
                idPrefix={`${safeId}-hour`}
                label={t('Hour', '小时')}
                values={hours}
                selected={draft.hour}
                onSelect={(hour) => setDraft((current) => ({ ...current, hour }))}
              />
              <TimeWheelColumn
                idPrefix={`${safeId}-minute`}
                label={t('Minute', '分钟')}
                values={minutes}
                selected={draft.minute}
                onSelect={(minute) => setDraft((current) => ({ ...current, minute }))}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 cursor-pointer rounded-full border border-[#c9dadd] bg-white/75 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-white"
              >
                {t('Cancel', '取消')}
              </button>
              <button
                type="button"
                onClick={commit}
                className="flex-1 cursor-pointer rounded-full bg-[#6b98a2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5a8791]"
              >
                {t('Done', '完成')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeWheelColumn({
  idPrefix,
  label,
  values,
  selected,
  onSelect,
}: {
  idPrefix: string;
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="h-52 snap-y snap-mandatory overflow-y-auto rounded-2xl border border-[#d5e3e6] bg-white/74 px-2 py-20 hide-scrollbar">
        {values.map((value) => (
          <button
            key={value}
            id={`${idPrefix}-${value}`}
            type="button"
            onClick={() => onSelect(value)}
            className={`mb-1 flex h-11 w-full snap-center cursor-pointer items-center justify-center rounded-xl text-lg font-semibold transition-colors ${
              value === selected
                ? 'bg-[#6b98a2] text-white shadow-sm'
                : 'text-slate-500 hover:bg-[#e8f1f3] hover:text-slate-700'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

const padTimePart = (value: number) => value.toString().padStart(2, '0');

const splitTime = (value: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return { hour: '08', minute: '00' };
  return { hour: match[1], minute: match[2] };
};

function PlanCard({
  title,
  label,
  progress,
  onProgress,
  onCheckIn,
  onDelete,
}: {
  title: string;
  label: string;
  progress: number;
  onProgress: (value: number) => void;
  onCheckIn: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <article className="rounded-2xl bg-[#edf3f4] p-4">
      <div className="flex justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#557f89]">{label}</span>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
        </div>
        <button type="button" onClick={onDelete} className="text-xs text-slate-400 hover:text-slate-600">{t('Remove', '移除')}</button>
      </div>
      <input aria-label={t('Plan progress', '计划进度')} className="mt-3 w-full accent-[#6b98a2]" type="range" min="0" max="100" value={progress} onChange={(event) => onProgress(Number(event.target.value))} />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{Math.round(progress)}%</span>
        <button type="button" onClick={onCheckIn} className="rounded-full bg-white px-3 py-1.5 font-medium text-[#557f89]">{t('Record progress', '记录进展')}</button>
      </div>
    </article>
  );
}
