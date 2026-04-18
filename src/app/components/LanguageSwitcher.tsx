import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="fixed right-4 top-4 z-[79]">
      <div className="flex h-10 items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 shadow-lg backdrop-blur-xl">
        <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
          <Languages className="h-4 w-4" />
        </span>
        <Button
          size="sm"
          variant={language === 'en' ? 'default' : 'ghost'}
          className="h-8 rounded-full px-3 text-xs"
          onClick={() => setLanguage('en')}
          title={t('Switch to English', '切换到英文')}
        >
          EN
        </Button>
        <Button
          size="sm"
          variant={language === 'zh' ? 'default' : 'ghost'}
          className="h-8 rounded-full px-3 text-xs"
          onClick={() => setLanguage('zh')}
          title={t('Switch to Chinese', '切换到中文')}
        >
          中文
        </Button>
      </div>
    </div>
  );
}
