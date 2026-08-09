import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Server } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { opsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';

const OpsPage: React.FC = () => {
  const qc = useQueryClient();
  const [worker, setWorker] = useState<'provider' | 'usage' | null>(null);

  const health = useQuery({
    queryKey: ['admin', 'ops', 'health'],
    queryFn: () => opsApi.health(),
    refetchInterval: 30_000,
  });

  const config = useQuery({
    queryKey: ['admin', 'ops', 'config'],
    queryFn: () => opsApi.config(),
  });

  const providerWorker = useMutation({
    mutationFn: () => opsApi.runProviderMaintenance(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ops'] });
      setWorker(null);
    },
  });

  const usageWorker = useMutation({
    mutationFn: () => opsApi.runUsageAggregate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'usage'] });
      setWorker(null);
    },
  });

  if (health.isLoading) return <LoadingBlock />;
  if (health.error) {
    return (
      <ErrorState message={extractAdminError(health.error).message} onRetry={() => health.refetch()} />
    );
  }

  const h = health.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        description="Health checks, safe config, and maintenance workers."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['Overall', h.status],
            ['Database', h.database],
            ['Redis', h.redis],
            ['Firebase', h.firebase],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card-static p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Server className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <StatusBadge variant={statusVariant(value)}>{value}</StatusBadge>
          </div>
        ))}
      </div>

      {Object.keys(h.details || {}).length > 0 ? (
        <div className="card-static p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Health details</h3>
          <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-teal-200">
            {JSON.stringify(h.details, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-static p-5">
          <h3 className="text-sm font-semibold text-slate-800">Workers</h3>
          <p className="mt-1 text-sm text-slate-500">Manually trigger maintenance jobs.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWorker('provider')}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Play className="h-4 w-4" /> Provider maintenance
            </button>
            <button
              type="button"
              onClick={() => setWorker('usage')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Play className="h-4 w-4" /> Usage aggregate
            </button>
          </div>
          {(providerWorker.isSuccess || usageWorker.isSuccess) && (
            <p className="mt-3 text-sm text-emerald-600">Worker finished successfully.</p>
          )}
          {(providerWorker.error || usageWorker.error) && (
            <p className="mt-3 text-sm text-rose-600">
              {extractAdminError(providerWorker.error || usageWorker.error).message}
            </p>
          )}
        </div>

        <div className="card-static p-5">
          <h3 className="text-sm font-semibold text-slate-800">Safe config</h3>
          <p className="mt-1 text-sm text-slate-500">Read-only safelist (no secrets).</p>
          {config.isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : config.error ? (
            <p className="mt-4 text-sm text-rose-600">{extractAdminError(config.error).message}</p>
          ) : (
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-sky-200">
              {JSON.stringify(config.data, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={worker === 'provider'}
        title="Run provider maintenance?"
        description="Triggers the provider-maintenance worker once."
        confirmLabel="Run worker"
        loading={providerWorker.isPending}
        onCancel={() => setWorker(null)}
        onConfirm={() => providerWorker.mutate()}
      />
      <ConfirmDialog
        open={worker === 'usage'}
        title="Run usage aggregate?"
        description="Triggers the usage-aggregate worker once."
        confirmLabel="Run worker"
        loading={usageWorker.isPending}
        onCancel={() => setWorker(null)}
        onConfirm={() => usageWorker.mutate()}
      />
    </div>
  );
};

export default OpsPage;
