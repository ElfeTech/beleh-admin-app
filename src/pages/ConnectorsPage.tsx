import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState } from '../components/ui/EmptyState';
import { connectorsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminConnectorSummary } from '../types/admin';
import { formatDate } from '../utils/format';

const ConnectorsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [hasSyncError, setHasSyncError] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'connectors', { page, hasSyncError }],
    queryFn: () =>
      connectorsApi.list({
        page,
        page_size: 20,
        has_sync_error: hasSyncError === 'all' ? undefined : hasSyncError === 'true',
      }),
  });

  const detail = useQuery({
    queryKey: ['admin', 'connectors', selectedId],
    queryFn: () => connectorsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const resync = useMutation({
    mutationFn: (id: string) => connectorsApi.resync(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'connectors'] });
    },
  });

  return (
    <div>
      <PageHeader title="Connectors" description="Monitor connector sync health and trigger resync." />
      <FilterBar>
        <select
          value={hasSyncError}
          onChange={(e) => {
            setHasSyncError(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All connectors</option>
          <option value="true">Sync errors only</option>
          <option value="false">Healthy sync</option>
        </select>
      </FilterBar>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No connectors"
            rowKey={(c) => c.id}
            onRowClick={(c: AdminConnectorSummary) => setSelectedId(c.id)}
            columns={[
              { header: 'Name', accessor: (c) => <span className="font-medium">{c.display_name}</span> },
              { header: 'Type', accessor: (c) => c.connection_type },
              {
                header: 'Status',
                accessor: (c) => (
                  <StatusBadge variant={statusVariant(c.status)}>{c.status}</StatusBadge>
                ),
              },
              {
                header: 'Sync',
                accessor: (c) => (
                  <StatusBadge variant={c.schema_sync_error ? 'danger' : statusVariant(c.metadata_sync_status)}>
                    {c.schema_sync_error ? 'Error' : c.metadata_sync_status}
                  </StatusBadge>
                ),
              },
              { header: 'Tables', accessor: (c) => c.schema_table_count ?? '—' },
              { header: 'Last sync', accessor: (c) => formatDate(c.last_schema_sync_at) },
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
        open={!!selectedId}
        title={detail.data?.display_name || 'Connector'}
        subtitle={selectedId || undefined}
        onClose={() => setSelectedId(null)}
        footer={
          selectedId ? (
            <button
              type="button"
              disabled={resync.isPending}
              onClick={() => resync.mutate(selectedId)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${resync.isPending ? 'animate-spin' : ''}`} />
              Resync
            </button>
          ) : null
        }
      >
        {detail.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : detail.data ? (
          <div className="space-y-4 text-sm">
            <p>
              <span className="text-slate-500">Workspace:</span> {detail.data.workspace_id}
            </p>
            {detail.data.schema_sync_error ? (
              <p className="rounded-lg bg-rose-50 p-3 text-rose-700">{detail.data.schema_sync_error}</p>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Config (redacted)
              </p>
              <pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-teal-200">
                {JSON.stringify(detail.data.config_redacted, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
};

export default ConnectorsPage;
