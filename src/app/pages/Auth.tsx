import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import backgroundImage from '../../assets/background-new.png';
import seaOtterImage from '../../assets/sea-otter.png';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const { t } = useLanguage();
  const { login, register, setupError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [mode]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result =
      mode === 'login'
        ? await login(email.trim(), password)
        : await register(username.trim(), email.trim(), password);
    if (!result.ok) {
      setError(result.error || t('Request failed.', '请求失败。'));
    }
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#103542] text-foreground">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6, 23, 28, 0.34), rgba(8, 34, 41, 0.2)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,218,224,0.18),transparent_45%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[calc(50%-240px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[calc(50%-240px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />

        <div className="w-full max-w-[430px] rounded-[34px] border border-white/20 bg-[rgba(241,246,248,0.78)] p-6 shadow-[0_28px_90px_rgba(4,24,30,0.32)] backdrop-blur-xl md:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-white/55 shadow-[0_10px_30px_rgba(25,54,66,0.16)]">
              <img src={seaOtterImage} alt="Sea otter" className="h-14 w-14 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-800">{t('Mind Islands', '心灵群岛')}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {t('A gentle place to log, reflect, and keep going.', '一个温柔记录、整理、继续前行的地方。')}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/55 p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`rounded-[14px] px-4 py-2.5 text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-[#6b98a2] text-white shadow-[0_10px_20px_rgba(55,104,117,0.28)]'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {t('Sign In', '登录')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`rounded-[14px] px-4 py-2.5 text-sm font-medium transition ${
                mode === 'register'
                  ? 'bg-[#6b98a2] text-white shadow-[0_10px_20px_rgba(55,104,117,0.28)]'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {t('Create Account', '创建账户')}
            </button>
          </div>

          <p className="mb-6 text-sm leading-6 text-slate-600">
            {mode === 'login'
              ? t('Sign in to return to your islands and continue where you left off.', '登录后回到你的岛屿，继续上一次的记录。')
              : t('Create an account to save your islands, goals, and reflections.', '创建账户后，你的岛屿、目标和记录都会被保存。')}
          </p>

          {setupError && (
            <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-700">
              {setupError}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('Username', '用户名')}</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('Your name', '你的名字')}
                  className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#6b98a2]/60 focus:ring-2 focus:ring-[#6b98a2]/20"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('Email', '邮箱')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#6b98a2]/60 focus:ring-2 focus:ring-[#6b98a2]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('Password', '密码')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('At least 8 characters', '至少 8 位')}
                className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#6b98a2]/60 focus:ring-2 focus:ring-[#6b98a2]/20"
                required
                minLength={8}
              />
            </div>
            {error && <div className="text-sm text-red-700">{error}</div>}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#6b98a2] py-3 text-white hover:bg-[#5c8892]"
            >
              {submitting
                ? t('Please wait...', '请稍候...')
                : mode === 'login'
                  ? t('Sign In', '登录')
                  : t('Create Account', '创建账户')}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            {mode === 'login' ? (
              <button
                className="underline underline-offset-2"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                type="button"
              >
                {t("Don't have an account? Register", '还没有账户？去注册')}
              </button>
            ) : (
              <button
                className="underline underline-offset-2"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                type="button"
              >
                {t('Already have an account? Sign in', '已有账户？去登录')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
