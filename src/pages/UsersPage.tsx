import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserX } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/EmptyState';
import { usersApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminUserSummary } from '../types/admin';
import { formatDate, useDebouncedValue } from '../utils/format';

const UsersPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState<string>('all');
  const [pending, setPending] = useState<AdminUserSummary | null>(null);
  const debouncedQ = useDebouncedValue(q);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users', { q: debouncedQ, page, isActive }],
    queryFn: () =>
      usersApi.list({
        q: debouncedQ || undefined,
        page,
        page_size: 20,
        is_active: isActive === 'all' ? undefined : isActive === 'true',
      }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersApi.patch(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setPending(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search, inspect, and suspend platform accounts."
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search email or name…"
      >
        <select
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500"
        >
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Suspended</option>
        </select>
      </FilterBar>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search or filters."
            rowKey={(u) => u.id}
            columns={[
              {
                header: 'User',
                accessor: (u) => (
                  <Link to={`/users/${u.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <img
                      src={
                        u.photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name || u.email)}&background=0d9488&color=fff`
                      }
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{u.display_name || '—'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </Link>
                ),
              },
              {
                header: 'Status',
                accessor: (u) => (
                  <StatusBadge variant={u.is_active ? 'success' : 'danger'}>
                    {u.is_active ? 'Active' : 'Suspended'}
                  </StatusBadge>
                ),
              },
              {
                header: 'Created',
                accessor: (u) => formatDate(u.created_at),
              },
              {
                header: 'Actions',
                accessor: (u) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPending(u);
                    }}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title={u.is_active ? 'Suspend' : 'Activate'}
                  >
                    {u.is_active ? (
                      <UserX className="h-4 w-4 text-rose-500" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    )}
                  </button>
                ),
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

      <ConfirmDialog
        open={!!pending}
        title={pending?.is_active ? 'Suspend user?' : 'Activate user?'}
        description={
          pending?.is_active
            ? `Suspend ${pending.email}? They will lose access to the product.`
            : `Re-activate ${pending?.email}?`
        }
        danger={!!pending?.is_active}
        confirmLabel={pending?.is_active ? 'Suspend' : 'Activate'}
        loading={patchMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          patchMutation.mutate({ id: pending.id, is_active: !pending.is_active });
        }}
      />
    </div>
  );
};

export default UsersPage;
