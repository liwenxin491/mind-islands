import { BookOpen, Heart, Home, ListTodo, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useQuickLog } from './QuickLogCapture';
import { useLanguage } from '../context/LanguageContext';

type PrimaryDestination = 'home' | 'memories' | 'actions' | 'harbor';

export function PrimaryNav({
  active,
  actionsBadge,
}: {
  active: PrimaryDestination;
  actionsBadge?: number;
}) {
  const navigate = useNavigate();
  const { openComposer } = useQuickLog();
  const { t } = useLanguage();
  const items = [
    { id: 'home' as const, label: t('Home', '首页'), icon: Home, route: '/' },
    { id: 'memories' as const, label: t('Memories', '记忆'), icon: BookOpen, route: '/memories' },
    { id: 'quick-log' as const, label: t('Quick Log', '速记'), icon: MessageCircle },
    { id: 'actions' as const, label: t('Actions', '行动'), icon: ListTodo, route: '/actions' },
    { id: 'harbor' as const, label: t('Harbor', '栖息地'), icon: Heart, route: '/island/compassion' },
  ];

  return (
    <nav
      aria-label={t('Primary navigation', '主要导航')}
      className="fixed bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[388px] -translate-x-1/2 rounded-[32px] border border-white/25 bg-white/90 px-3 py-3 shadow-[0_20px_60px_rgba(6,33,43,0.26)] backdrop-blur-xl"
    >
      <div className="grid grid-cols-5 gap-1 text-center text-slate-600">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const isCapture = item.id === 'quick-log';
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-label={isCapture ? t('Open Quick Log', '打开速记') : undefined}
              onClick={(event) =>
                isCapture ? openComposer('global', event.currentTarget) : navigate(item.route)
              }
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 text-[11px] font-medium transition ${
                isCapture
                  ? 'bg-[#6b98a2] text-white shadow-[0_5px_12px_rgba(43,78,89,0.22)] hover:bg-[#5a8791]'
                  : selected
                    ? 'bg-[#d9e8eb] text-[#416a74]'
                    : 'hover:bg-slate-100/65'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.id === 'actions' && actionsBadge && actionsBadge > 0 ? (
                <span className="absolute right-2 top-1 min-w-4 rounded-full bg-[#6b98a2] px-1 text-[10px] leading-4 text-white">
                  {actionsBadge > 99 ? '99+' : actionsBadge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
