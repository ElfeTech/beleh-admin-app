import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState } from '../components/ui/EmptyState';
import { workspacesApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import { formatDate, useDebouncedValue } from '../utils/format';

const WorkspacesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantFromUrl = searchParams.get('tenant_id') || '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState(tenantFromUrl);
  const debouncedQ = useDebouncedValue(q);

  useEffect(() => {
    setTenantId(tenantFromUrl);
    setPage(1);
  }, [tenantFromUrl]);

  const query = useQuery({
    queryKey: ['admin', 'workspaces', { q: debouncedQ, page, tenant_id: tenantId || undefined }],
    queryFn: () =>
      workspacesApi.list({
        q: debouncedQ || undefined,
        tenant_id: tenantId || undefined,
        page,
        page_size: 20,
      }),
  });

  return (
    <div>
      <PageHeader title="Workspaces" description="Browse workspaces, members, and ownership." />
      <FilterBar
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search workspaces…"
      />
      {tenantId ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <StatusBadge variant="accent">Filtered by tenant</StatusBadge>
          <Link to={`/tenants/${tenantId}`} className="font-medium text-teal-700 hover:underline">
            Open tenant
          </Link>
          <Link to="/workspaces" className="text-xs text-slate-500 hover:underline">
            Clear filter
          </Link>
        </div>
      ) : null}

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No workspaces"
            rowKey={(w) => w.id}
            columns={[
              {
                header: 'Workspace',
                accessor: (w) => (
                  <Link
                    to={`/workspaces/${w.id}`}
                    className="inline-flex items-center gap-2 font-medium text-slate-900 hover:text-teal-700"
                  >
                    {w.name}
                    {w.is_default ? <StatusBadge variant="accent">Default</StatusBadge> : null}
                  </Link>
                ),
              },
              {
                header: 'Tenant',
                accessor: (w) =>
                  w.tenant_id ? (
                    <Link to={`/tenants/${w.tenant_id}`} className="hover:text-teal-700">
                      {w.tenant_name || w.tenant_id}
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              { header: 'Owner', accessor: (w) => w.owner_email || w.owner_id },
              { header: 'Members', accessor: (w) => w.member_count },
              {
                header: 'Pending invites',
                accessor: (w) => w.pending_invitation_count ?? 0,
              },
              { header: 'Provider', accessor: (w) => w.provider_slug || '—' },
              { header: 'Created', accessor: (w) => formatDate(w.created_at) },
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
  );
};

export default WorkspacesPage;
