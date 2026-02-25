import { useState } from 'react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4f] to-[#1a0f2e] text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-background/10 border border-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-2">{t('Mind Islands', '心灵群岛')}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t('Sign in to access your personal cloud space.', '登录后进入你的专属云端空间。')}
        </p>

        {setupError && (
          <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
            {setupError}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t('Username', '用户名')}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('Your name', '你的名字')}
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t('Email', '邮箱')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t('Password', '密码')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('At least 8 characters', '至少 8 位')}
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
            />
          </div>

          {error && <div className="text-sm text-red-300">{error}</div>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
          >
            {submitting
              ? t('Please wait...', '请稍候...')
              : mode === 'login'
                ? t('Sign In', '登录')
                : t('Create Account', '创建账户')}
          </Button>
        </form>

        <div className="mt-4 text-sm text-muted-foreground">
          {mode === 'login' ? (
            <button
              className="underline underline-offset-2"
              onClick={() => setMode('register')}
              type="button"
            >
              {t("Don't have an account? Register", '还没有账户？去注册')}
            </button>
          ) : (
            <button
              className="underline underline-offset-2"
              onClick={() => setMode('login')}
              type="button"
            >
              {t('Already have an account? Sign in', '已有账户？去登录')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

