import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState } from '../components/ui/EmptyState';
import { auditLogApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminAuditLogEntry } from '../types/admin';
import { formatDate, truncate, useDebouncedValue } from '../utils/format';

const METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

function statusCodeVariant(code: number) {
  if (code >= 500) return 'danger' as const;
  if (code >= 400) return 'warning' as const;
  return 'success' as const;
}

function methodVariant(method: string) {
  if (method === 'DELETE') return 'danger' as const;
  if (method === 'POST') return 'accent' as const;
  return 'info' as const;
}

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [selected, setSelected] = useState<AdminAuditLogEntry | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const query = useQuery({
    queryKey: ['admin', 'audit-log', { page, method, q: debouncedSearch, failuresOnly }],
    queryFn: () =>
      auditLogApi.list({
        page,
        page_size: 25,
        method: method || undefined,
        q: debouncedSearch || undefined,
        status_min: failuresOnly ? 400 : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin audit"
        description="Every change made through the admin API — who, what, and when."
      />

      <div>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Admin email or path…"
        >
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={failuresOnly}
              onChange={(e) => {
                setFailuresOnly(e.target.checked);
                setPage(1);
              }}
              className="accent-teal-600"
            />
            Failures only
          </label>
        </FilterBar>

        {query.error ? (
          <ErrorState
            message={extractAdminError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : (
          <div className="card-static overflow-hidden">
            <DataTable
              data={query.data?.items ?? []}
              loading={query.isLoading}
              emptyTitle="No audit entries"
              emptyDescription="Mutating admin API requests are recorded here automatically."
              rowKey={(r) => r.id}
              onRowClick={setSelected}
              columns={[
                { header: 'Time', accessor: (r) => formatDate(r.created_at) },
                {
                  header: 'Admin',
                  accessor: (r) => (
                    <span className="font-medium text-slate-900">
                      {r.admin_email || 'unknown'}
                    </span>
                  ),
                },
                {
                  header: 'Action',
                  accessor: (r) => (
                    <span className="inline-flex items-center gap-2">
                      <StatusBadge variant={methodVariant(r.method)}>{r.method}</StatusBadge>
                      <span className="font-mono text-xs text-slate-600">
                        {truncate(r.path.replace('/api/v1/admin', ''), 48)}
                      </span>
                    </span>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (r) => (
                    <StatusBadge variant={statusCodeVariant(r.status_code)}>
                      {r.status_code}
                    </StatusBadge>
                  ),
                },
                {
                  header: 'Duration',
                  accessor: (r) => (r.duration_ms != null ? `${r.duration_ms} ms` : '—'),
                },
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
      </div>

      <DetailPanel
        open={!!selected}
        title="Audit entry"
        subtitle={selected ? `${selected.method} · ${formatDate(selected.created_at)}` : undefined}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <dl className="space-y-3 text-sm">
            {(
              [
                ['Admin', selected.admin_email || 'unknown'],
                ['Admin user id', selected.admin_user_id],
                ['Path', selected.path],
                ['Query string', selected.query],
                ['Status code', String(selected.status_code)],
                ['Duration', selected.duration_ms != null ? `${selected.duration_ms} ms` : null],
                ['Request ID', selected.request_id],
                ['Client IP', selected.client_ip],
                ['User agent', selected.user_agent],
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
    </div>
  );
};

export default AuditLogPage;
