import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, DollarSign, RefreshCw, Users, Zap } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/dashboard/DataTable';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { pricingApi, usageApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import { tokensToCreditsUsed } from '../utils/credits';
import { formatCurrency, formatNumber } from '../utils/format';

const UsagePage: React.FC = () => {
  const [entityType, setEntityType] = useState<'user' | 'workspace'>('user');
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ['admin', 'usage', 'overview'],
    queryFn: () => usageApi.overview(),
  });
  const system = useQuery({
    queryKey: ['admin', 'usage', 'system'],
    queryFn: () => usageApi.system(),
  });
  const consumers = useQuery({
    queryKey: ['admin', 'usage', 'top-consumers', entityType],
    queryFn: () => usageApi.topConsumers(entityType),
  });
  const credits = useQuery({
    queryKey: ['admin', 'pricing', 'credits'],
    queryFn: () => pricingApi.getCredits(),
  });

  const aggregate = useMutation({
    mutationFn: () => usageApi.aggregate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'usage'] });
    },
  });

  if (overview.isLoading) return <LoadingBlock />;
  if (overview.error) {
    return (
      <ErrorState
        message={extractAdminError(overview.error).message}
        onRetry={() => overview.refetch()}
      />
    );
  }

  const o = overview.data!;
  const tpc = credits.data?.tokens_per_credit;
  const totalCredits = tokensToCreditsUsed(o.total_llm_tokens, tpc);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage"
        description="Consumption overview, top consumers, and aggregation controls."
        actions={
          <button
            type="button"
            onClick={() => aggregate.mutate()}
            disabled={aggregate.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${aggregate.isPending ? 'animate-spin' : ''}`} />
            Run aggregate
          </button>
        }
      />

      {aggregate.isSuccess ? (
        <p className="text-sm text-emerald-600">Aggregation worker completed.</p>
      ) : null}
      {aggregate.error ? (
        <p className="text-sm text-rose-600">{extractAdminError(aggregate.error).message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Queries" value={formatNumber(o.total_queries)} icon={Zap} tone="teal" />
        <StatCard title="Active users" value={formatNumber(o.active_users)} icon={Users} tone="sky" />
        <StatCard
          title="Credits"
          value={formatNumber(totalCredits)}
          subtitle={`${formatNumber(o.total_llm_tokens)} tokens`}
          icon={Activity}
          tone="amber"
        />
        <StatCard
          title="Est. cost"
          value={formatCurrency(o.estimated_cost_usd)}
          icon={DollarSign}
          tone="slate"
        />
      </div>

      <div className="card-static grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Pipeline status</p>
          <div className="mt-1">
            <StatusBadge variant={statusVariant(system.data?.status)}>
              {system.data?.status ?? '—'}
            </StatusBadge>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Redis</p>
          <p className="mt-1 text-sm font-medium">
            {system.data?.redis_available ? 'Available' : 'Unavailable'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Event queue</p>
          <p className="mt-1 text-sm font-medium">{formatNumber(system.data?.event_queue_length)}</p>
        </div>
      </div>

      <div className="card-static overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Top consumers</h3>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as 'user' | 'workspace')}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="user">Users</option>
            <option value="workspace">Workspaces</option>
          </select>
        </div>
        <DataTable
          data={consumers.data ?? []}
          loading={consumers.isLoading}
          emptyTitle="No consumers yet"
          rowKey={(c) => c.entity_id}
          columns={[
            { header: 'Label', accessor: (c) => c.label || c.entity_id },
            { header: 'Queries', accessor: (c) => formatNumber(c.total_queries) },
            {
              header: 'Credits',
              accessor: (c) => formatNumber(tokensToCreditsUsed(c.total_llm_tokens, tpc)),
            },
            { header: 'Rows', accessor: (c) => formatNumber(c.total_rows_scanned) },
            { header: 'Cost', accessor: (c) => formatCurrency(c.estimated_cost_usd) },
          ]}
        />
      </div>
    </div>
  );
};

export default UsagePage;
