import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, AlertTriangle, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/EmptyState';
import { logsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminSystemLog } from '../types/admin';
import { formatDate, formatNumber, truncate, useDebouncedValue } from '../utils/format';

const LEVELS = ['ERROR', 'CRITICAL', 'WARNING', 'INFO'];

function levelVariant(level: string) {
  const l = level.toUpperCase();
  if (l === 'ERROR' || l === 'CRITICAL') return 'danger' as const;
  if (l === 'WARNING') return 'warning' as const;
  return 'info' as const;
}

const LogsPage: React.FC = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selected, setSelected] = useState<AdminSystemLog | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState(30);

  const debouncedSearch = useDebouncedValue(search);

  const stats = useQuery({
    queryKey: ['admin', 'logs', 'stats'],
    queryFn: () => logsApi.stats(),
    refetchInterval: autoRefresh ? 15_000 : false,
  });

  const logs = useQuery({
    queryKey: ['admin', 'logs', { page, level, q: debouncedSearch }],
    queryFn: () =>
      logsApi.list({
        page,
        page_size: 25,
        level: level || undefined,
        q: debouncedSearch || undefined,
      }),
    refetchInterval: autoRefresh ? 10_000 : false,
  });

  const purgeMutation = useMutation({
    mutationFn: () => logsApi.purge(purgeDays),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'logs'] });
      setPurgeOpen(false);
    },
  });

  const errors24h = (stats.data?.counts_24h?.ERROR ?? 0) + (stats.data?.counts_24h?.CRITICAL ?? 0);
  const warnings24h = stats.data?.counts_24h?.WARNING ?? 0;
  const errors7d = (stats.data?.counts_7d?.ERROR ?? 0) + (stats.data?.counts_7d?.CRITICAL ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System logs"
        description="Captured application warnings and errors — no shell access needed."
        actions={
          <>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition-colors ${
                autoRefresh
                  ? 'bg-teal-600 text-white ring-teal-600 hover:bg-teal-700'
                  : 'bg-white text-slate-600 ring-slate-200 hover:text-teal-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Auto-refresh'}
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2 py-1 ring-1 ring-slate-200">
              <input
                type="number"
                min={1}
                value={purgeDays}
                onChange={(e) => setPurgeDays(Math.max(1, Number(e.target.value) || 30))}
                className="w-14 rounded-lg px-1.5 py-1 text-sm text-slate-700 outline-none"
                title="Purge entries older than this many days"
              />
              <span className="text-xs text-slate-400">days</span>
              <button
                type="button"
                onClick={() => setPurgeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Purge
              </button>
            </div>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Errors (24h)"
          value={formatNumber(errors24h)}
          icon={AlertOctagon}
          tone={errors24h > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="Warnings (24h)"
          value={formatNumber(warnings24h)}
          icon={AlertTriangle}
          tone={warnings24h > 0 ? 'amber' : 'slate'}
          delay={0.05}
        />
        <StatCard
          title="Errors (7d)"
          value={formatNumber(errors7d)}
          icon={AlertOctagon}
          tone="slate"
          delay={0.1}
        />
        <StatCard
          title="Stored entries"
          value={formatNumber(stats.data?.total)}
          icon={ScrollText}
          tone="sky"
          delay={0.15}
        />
      </div>

      <div>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search message or traceback…"
        >
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </FilterBar>

        {logs.error ? (
          <ErrorState message={extractAdminError(logs.error).message} onRetry={() => logs.refetch()} />
        ) : (
          <div className="card-static overflow-hidden">
            <DataTable
              data={logs.data?.items ?? []}
              loading={logs.isLoading}
              emptyTitle="No log entries"
              emptyDescription="Warnings and errors raised by the backend will appear here."
              rowKey={(r) => r.id}
              onRowClick={setSelected}
              columns={[
                { header: 'Time', accessor: (r) => formatDate(r.created_at) },
                {
                  header: 'Level',
                  accessor: (r) => (
                    <StatusBadge variant={levelVariant(r.level)}>{r.level}</StatusBadge>
                  ),
                },
                {
                  header: 'Logger',
                  accessor: (r) => (
                    <span className="font-mono text-xs text-slate-500">
                      {truncate(r.logger || '(root)', 32)}
                    </span>
                  ),
                },
                { header: 'Message', accessor: (r) => truncate(r.message, 90) },
                {
                  header: 'Request',
                  accessor: (r) =>
                    r.request_id ? (
                      <span className="font-mono text-xs text-slate-400">
                        {truncate(r.request_id, 10)}
                      </span>
                    ) : (
                      '—'
                    ),
                },
              ]}
            />
            {logs.data ? (
              <Pagination
                page={logs.data.page}
                totalPages={logs.data.total_pages}
                totalItems={logs.data.total_items}
                hasNext={logs.data.has_next}
                hasPrevious={logs.data.has_previous}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        )}
      </div>

      <DetailPanel
        open={!!selected}
        title="Log entry"
        subtitle={selected ? `${selected.level} · ${formatDate(selected.created_at)}` : undefined}
        onClose={() => setSelected(null)}
        widthClass="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <dl className="space-y-3">
              {(
                [
                  ['Logger', selected.logger || '(root)'],
                  ['Request ID', selected.request_id],
                  ['Route', selected.method && selected.path ? `${selected.method} ${selected.path}` : selected.path],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs font-medium text-slate-800">
                    {v || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-600">Message</p>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-800">
                {selected.message}
              </pre>
            </div>
            {selected.exception ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-rose-600">Traceback</p>
                <pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-rose-200">
                  {selected.exception}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={purgeOpen}
        title="Purge old log entries?"
        description={`Permanently delete captured log entries older than ${purgeDays} days. This cannot be undone.`}
        danger
        confirmLabel="Purge"
        loading={purgeMutation.isPending}
        onCancel={() => setPurgeOpen(false)}
        onConfirm={() => purgeMutation.mutate()}
      />
    </div>
  );
};

export default LogsPage;
