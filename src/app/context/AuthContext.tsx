import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
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
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseErrorMessage = (errorCode = 'unknown_error') => {
  const map: Record<string, string> = {
    invalid_username: 'Username should be 2-32 characters.',
    invalid_email: 'Please enter a valid email address.',
    invalid_password: 'Password should be at least 8 characters.',
    user_already_exists: 'This email or username is already registered.',
    invalid_credentials: 'Email or password is incorrect.',
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
      await refresh();
      if (!cancelled) setLoading(false);
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
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

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
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

