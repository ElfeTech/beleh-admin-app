import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { clearAdminToken, getAdminToken } from '../lib/adminToken';
import {
  AdminAuthError,
  ensureAdminSession,
  exchangeFirebaseToken,
  fetchAdminMe,
  loginWithGoogle,
  logoutAdmin,
} from '../services/adminAuth';
import type { AdminUserSummary } from '../types/admin';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden';

interface AdminAuthContextValue {
  admin: AdminUserSummary | null;
  status: AuthStatus;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUserSummary | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      if (!firebaseUser) {
        clearAdminToken();
        setAdmin(null);
        setStatus('unauthenticated');
        return;
      }

      setStatus('loading');
      try {
        if (getAdminToken()) {
          const me = await fetchAdminMe();
          if (cancelled) return;
          setAdmin(me);
          setStatus('authenticated');
          return;
        }

        const idToken = await firebaseUser.getIdToken();
        const login = await exchangeFirebaseToken(idToken);
        if (cancelled) return;
        setAdmin(login.user);
        setStatus('authenticated');
      } catch (err) {
        if (cancelled) return;
        clearAdminToken();
        setAdmin(null);
        if (err instanceof AdminAuthError && err.status === 403) {
          setStatus('forbidden');
          setError(
            err.code === 'ADMIN_NOT_INVITED'
              ? 'You have not been invited to the admin dashboard. Ask an existing admin to invite your email.'
              : 'You are not a platform admin. Contact an administrator if you need access.',
          );
        } else {
          setStatus('unauthenticated');
          setError(err instanceof Error ? err.message : 'Failed to establish admin session');
          await logoutAdmin().catch(() => undefined);
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const login = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      const result = await loginWithGoogle();
      setAdmin(result.user);
      setStatus('authenticated');
    } catch (err) {
      setAdmin(null);
      if (err instanceof AdminAuthError && err.status === 403) {
        setStatus('forbidden');
        setError(
          err.code === 'ADMIN_NOT_INVITED'
            ? 'You have not been invited to the admin dashboard. Ask an existing admin to invite your email.'
            : 'You are not a platform admin. Contact an administrator if you need access.',
        );
      } else {
        setStatus('unauthenticated');
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    setAdmin(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ admin, status, error, login, logout, clearError }),
    [admin, status, error, login, logout, clearError],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

/** Soft boot helper for tests / imperative refresh */
export async function softRefreshAdmin(): Promise<AdminUserSummary | null> {
  return ensureAdminSession();
}
