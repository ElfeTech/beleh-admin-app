import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAdminToken, setAdminToken, clearAdminToken } from '../lib/adminToken';
import { auth } from '../lib/firebase';
import type { AdminLoginResponse } from '../types/admin';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

export const adminApiBaseUrl = `${API_BASE}/api/v1/admin`;

export const adminApiClient = axios.create({
  baseURL: adminApiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

adminApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function reExchangeAdminToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    clearAdminToken();
    return null;
  }
  const idToken = await user.getIdToken(true);
  const { data } = await axios.post<AdminLoginResponse>(
    `${adminApiBaseUrl}/auth/login`,
    { token: idToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  setAdminToken(data.access_token);
  return data.access_token;
}

adminApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isLoginCall = Boolean(original.url?.includes('/auth/login'));
    // Only refresh on 401. A 403 usually means invite/forbidden and re-login will not help;
    // retrying can clear a valid session and bounce the UI back to /login with no message.
    if (status === 401 && original && !original._retry && !isLoginCall) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = reExchangeAdminToken().finally(() => {
            refreshPromise = null;
          });
        }
        const token = await refreshPromise;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return adminApiClient(original);
        }
      } catch {
        clearAdminToken();
      }
    }
    return Promise.reject(error);
  },
);

export function extractAdminError(error: unknown): { message: string; code?: string; status?: number } {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string | { message?: string; code?: string }; message?: string; code?: string }
      | undefined;
    const detail = data?.detail;
    if (typeof detail === 'string') {
      return { message: detail, code: data?.code, status: error.response?.status };
    }
    if (detail && typeof detail === 'object') {
      return {
        message: detail.message || data?.message || error.message,
        code: detail.code || data?.code,
        status: error.response?.status,
      };
    }
    return {
      message: data?.message || error.message || 'Request failed',
      code: data?.code,
      status: error.response?.status,
    };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: 'Unknown error' };
}
