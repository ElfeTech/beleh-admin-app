import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { plansApi, tenantsApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { SubscriptionStatus } from '../types/admin';
import { formatDate } from '../utils/format';

const TenantDetailPage: React.FC = () => {
  const { tenantId = '' } = useParams();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [wsPage, setWsPage] = useState(1);

  const tenantQuery = useQuery({
    queryKey: ['admin', 'tenants', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
    enabled: !!tenantId,
  });

  const subQuery = useQuery({
    queryKey: ['admin', 'tenants', tenantId, 'subscription'],
    queryFn: () => tenantsApi.getSubscription(tenantId),
    enabled: !!tenantId,
    retry: false,
  });

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => plansApi.list(),
  });

  const workspacesQuery = useQuery({
    queryKey: ['admin', 'tenants', tenantId, 'workspaces', wsPage],
    queryFn: () =>
      tenantsApi.listWorkspaces(tenantId, {
        page: wsPage,
        page_size: 20,
      }),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (tenantQuery.data?.name) setName(tenantQuery.data.name);
  }, [tenantQuery.data?.name]);

  const renameMutation = useMutation({
    mutationFn: () => tenantsApi.patch(tenantId, { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId] });
      qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      tenantsApi.assignSubscription(tenantId, {
        plan_id: planId,
        status: subscriptionStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'subscription'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId] });
    },
  });

  if (tenantQuery.isLoading) return <LoadingBlock />;
  if (tenantQuery.error || !tenantQuery.data) {
    return (
      <ErrorState
        message={extractAdminError(tenantQuery.error || new Error('Tenant not found')).message}
        onRetry={() => tenantQuery.refetch()}
      />
    );
  }

  const t = tenantQuery.data;

  return (
    <div className="space-y-6">
      <Link
        to="/tenants"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </Link>

      <PageHeader title={t.name} description={`Owner: ${t.owner_email || t.owner_user_id}`} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-static space-y-4 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Tenant</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Owner</dt>
              <dd>
                <Link to={`/users/${t.owner_user_id}`} className="font-medium hover:text-teal-700">
                  {t.owner_email || t.owner_user_id}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Plan</dt>
              <dd>{t.plan_name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subscription</dt>
              <dd>
                {t.subscription_status ? (
                  <StatusBadge variant="info">{t.subscription_status}</StatusBadge>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Workspaces</dt>
              <dd className="font-medium">
                {t.workspaces_used} / {t.workspaces_limit}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Seats limit</dt>
              <dd>{t.seats_limit}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Datasources limit</dt>
              <dd>{t.datasources_limit}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd>{formatDate(t.created_at)}</dd>
            </div>
          </dl>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Rename</span>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  disabled={!name.trim() || name.trim() === t.name || renameMutation.isPending}
                  onClick={() => renameMutation.mutate()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {renameMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </label>
            {renameMutation.error ? (
              <p className="mt-2 text-xs text-rose-600">
                {extractAdminError(renameMutation.error).message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card-static space-y-4 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Assign subscription</h3>
          <p className="text-xs text-slate-500">
            Canonical limits for this org — assigns the plan to the tenant owner.
          </p>
          {subQuery.data ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{subQuery.data.plan.name}</span>
                <StatusBadge variant="info">{subQuery.data.status}</StatusBadge>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
              No subscription
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Plan</span>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
              >
                <option value="">Select plan…</option>
                {(plansQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tier})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Status</span>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value as SubscriptionStatus)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={!planId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Saving…' : 'Assign plan'}
          </button>
          {assignMutation.error ? (
            <p className="text-xs text-rose-600">{extractAdminError(assignMutation.error).message}</p>
          ) : null}
        </div>
      </div>

      <div className="card-static overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Workspaces</h3>
          <Link
            to={`/workspaces?tenant_id=${t.id}`}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        {workspacesQuery.error ? (
          <div className="p-5">
            <ErrorState
              message={extractAdminError(workspacesQuery.error).message}
              onRetry={() => workspacesQuery.refetch()}
            />
          </div>
        ) : (
          <>
            <DataTable
              data={workspacesQuery.data?.items ?? []}
              loading={workspacesQuery.isLoading}
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
                { header: 'Owner', accessor: (w) => w.owner_email || w.owner_id },
                { header: 'Members', accessor: (w) => w.member_count },
                {
                  header: 'Pending invites',
                  accessor: (w) => w.pending_invitation_count ?? 0,
                },
                { header: 'Created', accessor: (w) => formatDate(w.created_at) },
              ]}
            />
            {workspacesQuery.data ? (
              <Pagination
                page={workspacesQuery.data.page}
                totalPages={workspacesQuery.data.total_pages}
                totalItems={workspacesQuery.data.total_items}
                hasNext={workspacesQuery.data.has_next}
                hasPrevious={workspacesQuery.data.has_previous}
                onPageChange={setWsPage}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default TenantDetailPage;
