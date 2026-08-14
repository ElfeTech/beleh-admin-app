import axios from 'axios';
import {
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, getGoogleProvider } from '../lib/firebase';
import { patchWindowOpenCentered } from '../lib/centeredPopup';
import { clearAdminToken, setAdminToken } from '../lib/adminToken';
import { adminApiBaseUrl, adminApiClient, extractAdminError } from './adminApiClient';
import type { AdminLoginResponse, AdminUserSummary } from '../types/admin';

export const PENDING_GOOGLE_REDIRECT_KEY = 'beleh_admin_pending_google_redirect';

export class AdminAuthError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

function firebaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

export function clearPendingGoogleRedirect(): void {
  try {
    sessionStorage.removeItem(PENDING_GOOGLE_REDIRECT_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingGoogleRedirect(): boolean {
  try {
    return sessionStorage.getItem(PENDING_GOOGLE_REDIRECT_KEY) === '1';
  } catch {
    return false;
  }
}

async function completeLoginWithUser(user: {
  getIdToken: () => Promise<string>;
}): Promise<AdminLoginResponse> {
  const idToken = await user.getIdToken();
  try {
    return await exchangeFirebaseToken(idToken);
  } catch (error) {
    clearAdminToken();
    // Keep the Google session so the login page can show the API error
    // (signing out here races onAuthStateChanged and bounces back to /login).
    throw error;
  }
}

export async function exchangeFirebaseToken(idToken: string): Promise<AdminLoginResponse> {
  try {
    const { data } = await axios.post<AdminLoginResponse>(
      `${adminApiBaseUrl}/auth/login`,
      { token: idToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    setAdminToken(data.access_token);
    return data;
  } catch (error) {
    const parsed = extractAdminError(error);
    // Axios "Network Error" with no response is usually CORS or mixed-content.
    if (axios.isAxiosError(error) && !error.response) {
      throw new AdminAuthError(
        `Cannot reach admin API at ${adminApiBaseUrl} from ${typeof window !== 'undefined' ? window.location.origin : 'this origin'}. ` +
          'If the browser console shows a CORS error, add this origin to the backend allowlist.',
        { code: 'ADMIN_NETWORK', status: 0 },
      );
    }
    throw new AdminAuthError(parsed.message, { code: parsed.code, status: parsed.status });
  }
}

export async function loginWithGoogle(): Promise<AdminLoginResponse> {
  const provider = getGoogleProvider();

  // Deployed hosts: prefer full-page redirect. Chrome/Safari often break Firebase
  // popups across vercel.app → firebaseapp.com (third-party cookies), which looks
  // like "Firebase succeeded then bounced to /login". Localhost is usually fine.
  if (!isLocalHost()) {
    try {
      sessionStorage.setItem(PENDING_GOOGLE_REDIRECT_KEY, '1');
    } catch {
      // ignore
    }
    await signInWithRedirect(auth, provider);
    return new Promise(() => undefined);
  }

  const restoreOpen = patchWindowOpenCentered(500, 600);
  try {
    const result = await signInWithPopup(auth, provider);
    return await completeLoginWithUser(result.user);
  } catch (error) {
    const code = firebaseErrorCode(error);
    if (code === 'auth/popup-blocked') {
      try {
        sessionStorage.setItem(PENDING_GOOGLE_REDIRECT_KEY, '1');
      } catch {
        // ignore
      }
      await signInWithRedirect(auth, provider);
      return new Promise(() => undefined);
    }
    throw error;
  } finally {
    restoreOpen();
  }
}

export async function fetchAdminMe(): Promise<AdminUserSummary> {
  try {
    const { data } = await adminApiClient.get<AdminUserSummary>('/auth/me');
    return data;
  } catch (error) {
    const parsed = extractAdminError(error);
    throw new AdminAuthError(parsed.message, { code: parsed.code, status: parsed.status });
  }
}

export async function logoutAdmin(): Promise<void> {
  clearAdminToken();
  clearPendingGoogleRedirect();
  await firebaseSignOut(auth);
}

export async function ensureAdminSession(): Promise<AdminUserSummary | null> {
  const user = auth.currentUser;
  if (!user) {
    clearAdminToken();
    return null;
  }
  try {
    return await fetchAdminMe();
  } catch {
    const idToken = await user.getIdToken(true);
    const login = await exchangeFirebaseToken(idToken);
    return login.user;
  }
}
