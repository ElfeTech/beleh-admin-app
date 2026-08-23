import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { clearAdminToken, getAdminToken } from '../lib/adminToken';
import {
  AdminAuthError,
  clearPendingGoogleRedirect,
  ensureAdminSession,
  exchangeFirebaseToken,
  fetchAdminMe,
  GOOGLE_REDIRECT_INCOMPLETE_MESSAGE,
  hasPendingGoogleRedirect,
  loginWithGoogle,
  logoutAdmin,
} from '../services/adminAuth';
import type { AdminUserSummary } from '../types/admin';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden';

const AUTH_ERROR_KEY = 'beleh_admin_auth_error';

interface AdminAuthContextValue {
  admin: AdminUserSummary | null;
  status: AuthStatus;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function readPersistedError(): string | null {
  try {
    return sessionStorage.getItem(AUTH_ERROR_KEY);
  } catch {
    return null;
  }
}

function persistError(message: string | null) {
  try {
    if (message) sessionStorage.setItem(AUTH_ERROR_KEY, message);
    else sessionStorage.removeItem(AUTH_ERROR_KEY);
  } catch {
    // ignore
  }
}

function isForbiddenError(err: unknown): err is AdminAuthError {
  return (
    err instanceof AdminAuthError &&
    (err.status === 403 ||
      err.code === 'ADMIN_NOT_INVITED' ||
      err.code === 'ADMIN_FORBIDDEN')
  );
}

function toUserFacingAuthError(err: unknown): string {
  if (err instanceof AdminAuthError) {
    if (err.code === 'ADMIN_JWT_NOT_CONFIGURED') {
      return 'Admin sign-in is not configured on the server (ADMIN_JWT_SECRET).';
    }
    if (err.code === 'ADMIN_EMAIL_REQUIRED') {
      return 'Google did not provide an email for this account. Try another Google account.';
    }
    if (err.status === 404) {
      return 'Admin API was not found. The dashboard may be pointing at the wrong backend URL.';
    }
    if (err.status === 503) {
      return err.message || 'Admin API is temporarily unavailable.';
    }
    if (err.status === 401 || err.code === 'ADMIN_UNAUTHORIZED' || err.code === 'ADMIN_NETWORK') {
      return err.message || 'Could not verify your Google session with the admin API.';
    }
    return err.message || 'Admin sign-in failed.';
  }
  if (err instanceof Error && /network error|failed to fetch/i.test(err.message)) {
    return 'Cannot reach the admin API. Check that VITE_API_BASE_URL points at the correct backend.';
  }
  return err instanceof Error ? err.message : 'Failed to establish admin session';
}

function forbiddenMessage(err: AdminAuthError): string {
  return err.code === 'ADMIN_NOT_INVITED'
    ? 'You have not been invited to the admin dashboard. Ask an existing admin to invite your email.'
    : 'You are not a platform admin. Contact an administrator if you need access.';
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUserSummary | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(() => readPersistedError());
  const loginInFlightRef = useRef(false);
  const resolveGenRef = useRef(0);

  const setAuthError = useCallback((message: string | null) => {
    persistError(message);
    setError(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Surface redirect-flow failures; success is handled by onAuthStateChanged.
    void getRedirectResult(auth).catch((err) => {
      if (cancelled || loginInFlightRef.current) return;
      console.error('[admin-auth] getRedirectResult failed', err);
      clearPendingGoogleRedirect();
      // "missing initial state" is Firebase-speak for the same blocked handshake.
      const raw = err instanceof Error ? err.message : '';
      const message = /missing initial state/i.test(raw)
        ? GOOGLE_REDIRECT_INCOMPLETE_MESSAGE
        : raw || 'Sign-in redirect failed';
      setStatus('unauthenticated');
      setAuthError(message);
    });

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      // Interactive login() owns the exchange; avoid a parallel bootstrap that can
      // clear a freshly issued admin JWT and bounce the user back to /login.
      if (loginInFlightRef.current) return;

      if (!firebaseUser) {
        clearAdminToken();
        setAdmin(null);
        // A redirect login we started must come back signed in. Arriving here
        // signed out means the browser dropped the cross-site handshake — say so
        // instead of silently bouncing to /login (keep any more specific error
        // that getRedirectResult already persisted).
        if (hasPendingGoogleRedirect()) {
          clearPendingGoogleRedirect();
          if (!readPersistedError()) {
            setAuthError(GOOGLE_REDIRECT_INCOMPLETE_MESSAGE);
          }
        }
        setStatus('unauthenticated');
        return;
      }

      const gen = ++resolveGenRef.current;
      setStatus('loading');
      try {
        if (getAdminToken()) {
          const me = await fetchAdminMe();
        if (cancelled || gen !== resolveGenRef.current || loginInFlightRef.current) return;
        clearPendingGoogleRedirect();
        setAdmin(me);
        setStatus('authenticated');
        setAuthError(null);
        return;
      }

      const idToken = await firebaseUser.getIdToken();
      const loginResult = await exchangeFirebaseToken(idToken);
      if (cancelled || gen !== resolveGenRef.current || loginInFlightRef.current) return;
      clearPendingGoogleRedirect();
      setAdmin(loginResult.user);
      setStatus('authenticated');
      setAuthError(null);
    } catch (err) {
      if (cancelled || gen !== resolveGenRef.current || loginInFlightRef.current) return;
      console.error('[admin-auth] bootstrap failed', err);
      clearPendingGoogleRedirect();
      clearAdminToken();
      setAdmin(null);
      if (isForbiddenError(err)) {
        setStatus('forbidden');
        setAuthError(forbiddenMessage(err));
      } else {
        setStatus('unauthenticated');
        setAuthError(toUserFacingAuthError(err));
      }
    }
  });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [setAuthError]);

  const login = useCallback(async () => {
    loginInFlightRef.current = true;
    resolveGenRef.current += 1;
    setAuthError(null);
    setStatus('loading');
    try {
      const result = await loginWithGoogle();
      setAdmin(result.user);
      setStatus('authenticated');
      setAuthError(null);
    } catch (err) {
      console.error('[admin-auth] login failed', err);
      setAdmin(null);
      if (isForbiddenError(err)) {
        setStatus('forbidden');
        setAuthError(forbiddenMessage(err));
      } else {
        setStatus('unauthenticated');
        setAuthError(toUserFacingAuthError(err));
      }
      throw err;
    } finally {
      loginInFlightRef.current = false;
    }
  }, [setAuthError]);

  const logout = useCallback(async () => {
    loginInFlightRef.current = false;
    resolveGenRef.current += 1;
    await logoutAdmin();
    setAdmin(null);
    setStatus('unauthenticated');
    setAuthError(null);
  }, [setAuthError]);

  const clearError = useCallback(() => setAuthError(null), [setAuthError]);

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
