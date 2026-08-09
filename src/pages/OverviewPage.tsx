import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, DollarSign, Server, Users, Zap } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { opsApi, pricingApi, usageApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import { tokensToCreditsUsed } from '../utils/credits';
import { formatCurrency, formatNumber } from '../utils/format';

const OverviewPage: React.FC = () => {
  const overview = useQuery({
    queryKey: ['admin', 'usage', 'overview'],
    queryFn: () => usageApi.overview(),
  });
  const system = useQuery({
    queryKey: ['admin', 'usage', 'system'],
    queryFn: () => usageApi.system(),
  });
  const health = useQuery({
    queryKey: ['admin', 'ops', 'health'],
    queryFn: () => opsApi.health(),
  });
  const credits = useQuery({
    queryKey: ['admin', 'pricing', 'credits'],
    queryFn: () => pricingApi.getCredits(),
  });

  const loading = overview.isLoading || system.isLoading || health.isLoading;
  const error = overview.error || system.error || health.error;

  if (loading) return <LoadingBlock label="Loading overview…" />;
  if (error) {
    return (
      <ErrorState
        message={extractAdminError(error).message}
        onRetry={() => {
          overview.refetch();
          system.refetch();
          health.refetch();
        }}
      />
    );
  }

  const o = overview.data!;
  const totalCredits = tokensToCreditsUsed(o.total_llm_tokens, credits.data?.tokens_per_credit);
  const chartData = [
    { name: 'Queries', value: o.total_queries },
    { name: 'Credits', value: totalCredits ?? 0 },
    { name: 'Rows scanned', value: o.total_rows_scanned },
    { name: 'Charts', value: o.total_chart_renders },
    { name: 'Exports', value: o.total_exports },
    { name: 'API calls', value: o.total_api_calls },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Overview"
        description="Live health and usage across the Beleh platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active users"
          value={formatNumber(o.active_users)}
          icon={Users}
          tone="teal"
          delay={0}
        />
        <StatCard
          title="Total queries"
          value={formatNumber(o.total_queries)}
          icon={Zap}
          tone="sky"
          delay={0.05}
        />
        <StatCard
          title="Credits"
          value={formatNumber(totalCredits)}
          subtitle={`${formatNumber(o.total_llm_tokens)} tokens`}
          icon={Activity}
          tone="amber"
          delay={0.1}
        />
        <StatCard
          title="Est. cost"
          value={formatCurrency(o.estimated_cost_usd)}
          icon={DollarSign}
          tone="slate"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-static p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Usage breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 10px 30px rgb(15 23 42 / 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-static p-5">
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800">System health</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Overall</span>
                <StatusBadge variant={statusVariant(health.data?.status)}>
                  {health.data?.status ?? '—'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Database</span>
                <StatusBadge variant={statusVariant(health.data?.database)}>
                  {health.data?.database ?? '—'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Redis</span>
                <StatusBadge variant={statusVariant(health.data?.redis)}>
                  {health.data?.redis ?? '—'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Firebase</span>
                <StatusBadge variant={statusVariant(health.data?.firebase)}>
                  {health.data?.firebase ?? '—'}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="card-static p-5">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-semibold text-slate-800">Usage pipeline</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge variant={statusVariant(system.data?.status)}>
                  {system.data?.status ?? '—'}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Redis</span>
                <span className="font-medium text-slate-800">
                  {system.data?.redis_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Queue length</span>
                <span className="font-medium text-slate-800">
                  {formatNumber(system.data?.event_queue_length)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
