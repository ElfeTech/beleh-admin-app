import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: 'teal' | 'sky' | 'amber' | 'rose' | 'slate';
  delay?: number;
}

const tones = {
  teal: 'bg-teal-600',
  sky: 'bg-sky-600',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-700',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'teal',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        <div className={`rounded-xl p-2.5 text-white ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
