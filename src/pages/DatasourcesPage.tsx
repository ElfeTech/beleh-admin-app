import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState } from '../components/ui/EmptyState';
import { datasourcesApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminDatasourceSummary } from '../types/admin';
import { formatDate, formatNumber } from '../utils/format';

const DatasourcesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [hasIngestionError, setHasIngestionError] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'datasources', { page, hasIngestionError }],
    queryFn: () =>
      datasourcesApi.list({
        page,
        page_size: 20,
        has_ingestion_error:
          hasIngestionError === 'all' ? undefined : hasIngestionError === 'true',
      }),
  });

  const detail = useQuery({
    queryKey: ['admin', 'datasources', selectedId],
    queryFn: () => datasourcesApi.get(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div>
      <PageHeader title="Datasources" description="Track ingestion status across datasets." />
      <FilterBar>
        <select
          value={hasIngestionError}
          onChange={(e) => {
            setHasIngestionError(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All datasources</option>
          <option value="true">Ingestion errors</option>
          <option value="false">No ingestion errors</option>
        </select>
      </FilterBar>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No datasources"
            rowKey={(d) => d.id}
            onRowClick={(d: AdminDatasourceSummary) => setSelectedId(d.id)}
            columns={[
              { header: 'Name', accessor: (d) => <span className="font-medium">{d.name}</span> },
              { header: 'Type', accessor: (d) => d.type },
              {
                header: 'Status',
                accessor: (d) => (
                  <StatusBadge variant={statusVariant(d.status)}>{d.status}</StatusBadge>
                ),
              },
              {
                header: 'Ingestion',
                accessor: (d) =>
                  d.ingestion_error ? (
                    <StatusBadge variant="danger">Error</StatusBadge>
                  ) : (
                    <StatusBadge variant="success">OK</StatusBadge>
                  ),
              },
              {
                header: 'Size',
                accessor: (d) => (d.file_size != null ? formatNumber(d.file_size) : '—'),
              },
              { header: 'Created', accessor: (d) => formatDate(d.created_at) },
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
        title={detail.data?.name || 'Datasource'}
        onClose={() => setSelectedId(null)}
      >
        {detail.data ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">ID</dt>
              <dd className="font-mono text-xs">{detail.data.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Workspace</dt>
              <dd>{detail.data.workspace_id}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">User</dt>
              <dd>{detail.data.user_id}</dd>
            </div>
            {detail.data.ingestion_error ? (
              <div className="rounded-lg bg-rose-50 p-3 text-rose-700">{detail.data.ingestion_error}</div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </DetailPanel>
    </div>
  );
};

export default DatasourcesPage;
