import React from 'react';

const variants: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  accent: 'bg-teal-50 text-teal-700 ring-teal-200',
};

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}

export function StatusBadge({ children, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function statusVariant(status?: string | null): keyof typeof variants {
  const s = (status || '').toLowerCase();
  if (['active', 'healthy', 'ok', 'success', 'completed', 'synced', 'accepted'].includes(s))
    return 'success';
  if (
    ['error', 'failed', 'unhealthy', 'suspended', 'disabled', 'cancelled', 'revoked'].includes(s)
  )
    return 'danger';
  if (['degraded', 'warning', 'pending', 'running', 'syncing', 'trial'].includes(s)) return 'warning';
  if (['inactive', 'expired'].includes(s)) return 'neutral';
  return 'info';
}
