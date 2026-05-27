import { ListTodo, Target } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { PlansPanel } from '../components/PlansPanel';
import { PrimaryNav } from '../components/PrimaryNav';
import { SceneShell } from '../components/SceneShell';
import { TodoPanel } from '../components/TodoPanel';
import { useLanguage } from '../context/LanguageContext';
import { useMindIslands } from '../context/MindIslandsContext';

export function Actions() {
  const { t } = useLanguage();
  const { progress } = useMindIslands();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'plans' ? 'plans' : 'todos';
  const activeTodos = progress.todos.filter((todo) => !todo.completed).length;

  return (
    <SceneShell>
      <div className="relative min-h-full pb-28 text-slate-800">
        <header className="sticky top-0 z-10 bg-[rgba(232,242,245,0.82)] px-5 pb-4 pt-6 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#527a84]">Mind Islands</p>
          <h1 className="mt-2 text-3xl font-semibold">{t('Actions', '行动')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('Tasks and plans, ready when I need them', '待办与计划，在需要时集中管理')}</p>
          <div className="mt-5 grid grid-cols-2 rounded-full bg-white/55 p-1">
            <button type="button" onClick={() => setParams({})} className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium ${tab === 'todos' ? 'bg-white text-[#426a74] shadow-sm' : 'text-slate-500'}`}><ListTodo className="h-4 w-4" />{t('To-do', '待办')}</button>
            <button type="button" onClick={() => setParams({ tab: 'plans' })} className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium ${tab === 'plans' ? 'bg-white text-[#426a74] shadow-sm' : 'text-slate-500'}`}><Target className="h-4 w-4" />{t('Plans', '计划')}</button>
          </div>
        </header>
        <main className="px-5 pt-4">
          {tab === 'todos' ? (
            <div className="rounded-[26px] bg-white/54 p-2">
              <TodoPanel variant="overlay" />
            </div>
          ) : (
            <PlansPanel />
          )}
        </main>
      </div>
      <PrimaryNav active="actions" actionsBadge={activeTodos} />
    </SceneShell>
  );
}
