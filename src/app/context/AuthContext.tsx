import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setupError: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
    verificationCode: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  sendVerificationCode: (username: string, email: string) => Promise<{
    ok: boolean;
    error?: string;
    devCode?: string;
    retryAfterSec?: number;
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const OFFLINE_MODE = import.meta.env.VITE_LOCAL_OFFLINE === 'true';
const OFFLINE_USER: AuthUser = {
  id: 'local-offline',
  username: 'Local User',
  email: 'offline@localhost',
  createdAt: '',
};

const parseErrorMessage = (errorCode = 'unknown_error') => {
  const map: Record<string, string> = {
    invalid_username: 'Username should be 2-32 characters.',
    invalid_email: 'Please enter a valid email address.',
    invalid_password: 'Password should be at least 8 characters.',
    user_already_exists: 'This email or username is already registered.',
    email_already_registered: 'This email is already registered.',
    invalid_credentials: 'Email or password is incorrect.',
    invalid_verification_code: 'Verification code is incorrect.',
    verification_code_required: 'Please request an email verification code first.',
    verification_code_expired: 'Verification code expired. Please request a new one.',
    verification_code_locked: 'Too many incorrect verification attempts. Please request a new code.',
    verification_code_too_frequent: 'Please wait before requesting another code.',
    email_not_verified: 'Please verify your email before signing in.',
    email_service_not_configured: 'Email verification service is not configured yet.',
    rate_limited: 'Too many attempts. Please wait and try again.',
    database_not_configured: 'Server database is not configured yet.',
    jwt_secret_not_configured: 'Server auth secret is missing.',
    missing_credentials: 'Please enter both email and password.',
  };
  return map[errorCode] || 'Something went wrong. Please try again.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const refresh = async () => {
    if (OFFLINE_MODE) {
      setUser(OFFLINE_USER);
      setSetupError(null);
      return;
    }

    try {
      const response = await fetch('/api/auth/me');
      if (response.status === 401) {
        setUser(null);
        setSetupError(null);
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        setUser(null);
        setSetupError(parseErrorMessage(payload?.error));
        return;
      }
      setUser(payload.user || null);
      setSetupError(null);
    } catch {
      setUser(null);
      setSetupError('Cannot connect to server.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      if (OFFLINE_MODE) {
        if (!cancelled) {
          setUser(OFFLINE_USER);
          setSetupError(null);
          setLoading(false);
        }
        return;
      }
      await refresh();
      if (!cancelled) setLoading(false);
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (OFFLINE_MODE) {
      setUser(OFFLINE_USER);
      setSetupError(null);
      return { ok: true };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return { ok: false, error: parseErrorMessage(payload?.error) };
      }
      setUser(payload.user || null);
      setSetupError(null);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Cannot connect to server.' };
    }
  };

  const sendVerificationCode = async (username: string, email: string) => {
    if (OFFLINE_MODE) return { ok: true };

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return {
          ok: false,
          error: parseErrorMessage(payload?.error),
          retryAfterSec: payload?.retryAfterSec,
        };
      }
      return {
        ok: true,
        devCode: payload?.devCode,
        retryAfterSec: payload?.retryAfterSec,
      };
    } catch {
      return { ok: false, error: 'Cannot connect to server.' };
    }
  };

  const register = async (username: string, email: string, password: string, verificationCode: string) => {
    if (OFFLINE_MODE) {
      setUser({
        ...OFFLINE_USER,
        username: username.trim() || OFFLINE_USER.username,
        email: email.trim() || OFFLINE_USER.email,
      });
      setSetupError(null);
      return { ok: true };
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, verificationCode }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return { ok: false, error: parseErrorMessage(payload?.error) };
      }
      setUser(payload.user || null);
      setSetupError(null);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Cannot connect to server.' };
    }
  };

  const logout = async () => {
    if (OFFLINE_MODE) {
      setUser(OFFLINE_USER);
      setSetupError(null);
      return;
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setupError,
      login,
      register,
      sendVerificationCode,
      logout,
      refresh,
    }),
    [user, loading, setupError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
