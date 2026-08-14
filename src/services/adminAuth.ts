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
    throw new AdminAuthError(parsed.message, { code: parsed.code, status: parsed.status });
  }
}

export async function loginWithGoogle(): Promise<AdminLoginResponse> {
  const provider = getGoogleProvider();
  // Center the OAuth window; Firebase signInWithPopup does not accept features.
  const restoreOpen = patchWindowOpenCentered(500, 600);
  try {
    const result = await signInWithPopup(auth, provider);
    return await completeLoginWithUser(result.user);
  } catch (error) {
    const code = firebaseErrorCode(error);
    // Browsers often block the cross-origin Firebase/Google popup (especially Safari /
    // strict popup settings). Authorized domains do not fix this — fall back to redirect.
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      // Page navigates away; keep the promise pending until unload.
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
