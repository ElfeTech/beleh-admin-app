import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { DataTable } from '../components/dashboard/DataTable';
import { plansApi, usersApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { SubscriptionStatus } from '../types/admin';
import { formatDate } from '../utils/format';

const UserDetailPage: React.FC = () => {
  const { userId = '' } = useParams();
  const qc = useQueryClient();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [planId, setPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');

  const userQuery = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => usersApi.get(userId),
    enabled: !!userId,
  });

  const subQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'subscription'],
    queryFn: () => plansApi.getUserSubscription(userId),
    enabled: !!userId,
    retry: false,
  });

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => plansApi.list(),
  });

  const patchMutation = useMutation({
    mutationFn: (is_active: boolean) => usersApi.patch(userId, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setConfirmSuspend(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      plansApi.assignUserSubscription(userId, {
        plan_id: planId,
        status: subscriptionStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId, 'subscription'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId] });
    },
  });

  if (userQuery.isLoading) return <LoadingBlock />;
  if (userQuery.error || !userQuery.data) {
    return (
      <ErrorState
        message={extractAdminError(userQuery.error || new Error('User not found')).message}
        onRetry={() => userQuery.refetch()}
      />
    );
  }

  const u = userQuery.data;

  return (
    <div className="space-y-6">
      <Link
        to="/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <PageHeader
        title={u.display_name || u.email}
        description={u.email}
        actions={
          <button
            type="button"
            onClick={() => setConfirmSuspend(true)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              u.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {u.is_active ? 'Suspend' : 'Activate'}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-static space-y-3 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge variant={u.is_active ? 'success' : 'danger'}>
                  {u.is_active ? 'Active' : 'Suspended'}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">UID</dt>
              <dd className="font-mono text-xs text-slate-700">{u.uid}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Tenant</dt>
              <dd>
                {u.tenant_id ? (
                  <Link to={`/tenants/${u.tenant_id}`} className="font-medium hover:text-teal-700">
                    {u.tenant_name || u.tenant_id}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Workspaces</dt>
              <dd className="font-medium">{u.workspace_count}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd>{formatDate(u.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Plan</dt>
              <dd>{u.plan_name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subscription</dt>
              <dd>{u.subscription_status || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="card-static space-y-4 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Assign subscription</h3>
          {subQuery.data ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{subQuery.data.plan.name}</span>
                <StatusBadge variant="info">{subQuery.data.status}</StatusBadge>
              </div>
              {subQuery.data.plan.stripe_price_monthly_id ||
              subQuery.data.plan.stripe_price_yearly_id ? (
                <p className="mt-2 break-all font-mono text-[11px] text-slate-500">
                  {subQuery.data.plan.stripe_price_monthly_id ||
                    subQuery.data.plan.stripe_price_yearly_id}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No Stripe price linked</p>
              )}
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
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Workspace memberships</h3>
        </div>
        <DataTable
          data={u.memberships ?? []}
          emptyTitle="No memberships"
          rowKey={(m) => `${m.workspace_id}-${m.role}`}
          columns={[
            {
              header: 'Workspace',
              accessor: (m) => (
                <Link
                  to={`/workspaces/${m.workspace_id}`}
                  className="font-medium text-slate-900 hover:text-teal-700"
                >
                  {m.workspace_name || m.workspace_id}
                </Link>
              ),
            },
            { header: 'Role', accessor: (m) => m.role },
            {
              header: 'Status',
              accessor: (m) => (
                <StatusBadge variant={statusVariant(m.status)}>{m.status}</StatusBadge>
              ),
            },
          ]}
        />
      </div>

      <ConfirmDialog
        open={confirmSuspend}
        title={u.is_active ? 'Suspend user?' : 'Activate user?'}
        description={`Confirm changing access for ${u.email}.`}
        danger={u.is_active}
        loading={patchMutation.isPending}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => patchMutation.mutate(!u.is_active)}
      />
    </div>
  );
};

export default UserDetailPage;
