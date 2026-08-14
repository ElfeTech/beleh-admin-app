import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import VectorWires from '../components/auth/VectorWires';
import { useAdminAuth } from '../context/AdminAuthContext';

const LoginPage: React.FC = () => {
  const { status, error, login, clearError, logout } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    clearError();
    try {
      await login();
      navigate('/', { replace: true });
    } catch (err) {
      // Prefer the context error (richer / persisted); fall back to raw message.
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setLocalError(message);
      console.error('[admin-auth] Sign-in UI error', err);
    } finally {
      setLoading(false);
    }
  };

  const isForbidden = status === 'forbidden';
  const displayError = error || localError;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05080f] text-white">
      <VectorWires />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-teal-950/40 backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center justify-center">
              <img
                src="/logo.webp"
                alt="Beleh"
                className="h-24 w-24 rounded-2xl object-contain drop-shadow-[0_0_24px_rgba(45,212,191,0.35)]"
              />
            </div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              {isForbidden
                ? 'This Google account has not been invited as a platform admin.'
                : 'Sign in with Google to manage the Beleh platform.'}
            </p>
          </div>

          {displayError ? (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                isForbidden
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}
            >
              {displayError}
            </div>
          ) : null}

          {isForbidden ? (
            <button
              type="button"
              onClick={async () => {
                await logout();
                clearError();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-700"
            >
              Try a different account
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || status === 'loading'}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-teal-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || status === 'loading' ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {loading || status === 'loading' ? 'Signing in…' : 'Sign in with Google'}
            </button>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Restricted access · Authorized platform admins only
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
