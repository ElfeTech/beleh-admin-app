import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/EmptyState';
import { chatRunsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminChatRunSummary } from '../types/admin';
import { formatDate, truncate } from '../utils/format';

const RUN_STATUSES = ['queued', 'running', 'completed', 'failed', 'cancelled'];

const ChatRunsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get('user_id') || '';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [selected, setSelected] = useState<AdminChatRunSummary | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'chat-runs', { page, status, errorCode, userIdFilter }],
    queryFn: () =>
      chatRunsApi.list({
        page,
        page_size: 20,
        status: status || undefined,
        error_code: errorCode || undefined,
        user_id: userIdFilter || undefined,
      }),
  });

  const detail = useQuery({
    queryKey: ['admin', 'chat-runs', selected?.id],
    queryFn: () => chatRunsApi.get(selected!.id),
    enabled: !!selected?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => chatRunsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'chat-runs'] });
      setCancelId(null);
      setSelected(null);
    },
  });

  return (
    <div>
      <PageHeader title="Chat runs" description="Inspect and force-cancel agent runs." />

      <FilterBar>
        {userIdFilter ? (
          <button
            type="button"
            onClick={() => {
              searchParams.delete('user_id');
              setSearchParams(searchParams, { replace: true });
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100"
          >
            User: {truncate(userIdFilter, 8)} <X className="h-3 w-3" />
          </button>
        ) : null}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {RUN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={errorCode}
          onChange={(e) => {
            setErrorCode(e.target.value);
            setPage(1);
          }}
          placeholder="Error code"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </FilterBar>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No chat runs"
            rowKey={(r) => r.id}
            onRowClick={setSelected}
            columns={[
              {
                header: 'Run',
                accessor: (r) => <span className="font-mono text-xs">{truncate(r.id, 12)}</span>,
              },
              {
                header: 'Status',
                accessor: (r) => (
                  <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>
                ),
              },
              { header: 'Phase', accessor: (r) => r.phase || '—' },
              { header: 'Error', accessor: (r) => r.error_code || '—' },
              { header: 'Started', accessor: (r) => formatDate(r.started_at || r.created_at) },
            ]}
          />
          {query.data ? (
            <Pagination
              page={query.data.page}
              totalPages={query.data.total_pages}
              totalItems={query.data.total_items}
              hasNext={query.data.has_next}
              hasPrevious={query.data.has_previous}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}

      <DetailPanel
        open={!!selected}
        title="Chat run detail"
        subtitle={selected?.id}
        onClose={() => setSelected(null)}
        footer={
          selected && !['completed', 'cancelled', 'failed'].includes(selected.status) ? (
            <button
              type="button"
              onClick={() => setCancelId(selected.id)}
              className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Force cancel
            </button>
          ) : null
        }
      >
        {detail.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : detail.data ? (
          <dl className="space-y-3 text-sm">
            {(
              [
                ['Status', detail.data.status],
                ['Phase', detail.data.phase],
                ['User', detail.data.user_id],
                ['Workspace', detail.data.workspace_id],
                ['Session', detail.data.session_id],
                ['Error code', detail.data.error_code],
                ['Error detail', detail.data.error_detail],
                ['Started', formatDate(detail.data.started_at)],
                ['Finished', formatDate(detail.data.finished_at)],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-0.5 break-all font-medium text-slate-800">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel chat run?"
        description="Force-cancel this run. In-flight work may stop abruptly."
        danger
        confirmLabel="Cancel run"
        loading={cancelMutation.isPending}
        onCancel={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
      />
    </div>
  );
};

export default ChatRunsPage;
