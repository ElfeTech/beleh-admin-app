import axios from 'axios';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, getGoogleProvider } from '../lib/firebase';
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
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  try {
    return await exchangeFirebaseToken(idToken);
  } catch (error) {
    // Keep Firebase session on 403 so UI can show "not a platform admin"
    // and offer switch-account; clear JWT always.
    clearAdminToken();
    const isForbidden =
      error instanceof AdminAuthError &&
      (error.status === 403 ||
        error.code === 'ADMIN_FORBIDDEN' ||
        error.code === 'ADMIN_NOT_INVITED');
    if (!isForbidden) {
      await firebaseSignOut(auth).catch(() => undefined);
    }
    throw error;
  }
}

export async function fetchAdminMe(): Promise<AdminUserSummary> {
  const { data } = await adminApiClient.get<AdminUserSummary>('/auth/me');
  return data;
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
