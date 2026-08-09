import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { ErrorState } from '../components/ui/EmptyState';
import { tenantsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import { formatDate, useDebouncedValue } from '../utils/format';

const TenantsPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q);

  const query = useQuery({
    queryKey: ['admin', 'tenants', { q: debouncedQ, page }],
    queryFn: () =>
      tenantsApi.list({
        q: debouncedQ || undefined,
        page,
        page_size: 20,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Org boundaries (1 user = 1 tenant). Billing resolves via the tenant owner’s plan."
      />
      <FilterBar
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search by tenant name or owner email…"
      />

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No tenants"
            rowKey={(t) => t.id}
            columns={[
              {
                header: 'Tenant',
                accessor: (t) => (
                  <Link
                    to={`/tenants/${t.id}`}
                    className="font-medium text-slate-900 hover:text-teal-700"
                  >
                    {t.name}
                  </Link>
                ),
              },
              {
                header: 'Owner',
                accessor: (t) =>
                  t.owner_email ? (
                    <Link
                      to={`/users/${t.owner_user_id}`}
                      className="text-slate-700 hover:text-teal-700"
                    >
                      {t.owner_email}
                    </Link>
                  ) : (
                    t.owner_user_id
                  ),
              },
              { header: 'Workspaces', accessor: (t) => t.workspace_count },
              { header: 'Created', accessor: (t) => formatDate(t.created_at) },
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

export default TenantsPage;
