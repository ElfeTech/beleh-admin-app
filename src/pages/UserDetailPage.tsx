import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { DataTable } from '../components/dashboard/DataTable';
import { billingAdminApi, chatRunsApi, plansApi, usersApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { SubscriptionStatus } from '../types/admin';
import { formatCurrency, formatDate, formatNumber, truncate } from '../utils/format';

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

  const usageQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'usage'],
    queryFn: () => usersApi.usage(userId),
    enabled: !!userId,
  });

  const runsQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'recent-runs'],
    queryFn: () => chatRunsApi.list({ user_id: userId, page_size: 5 }),
    enabled: !!userId,
  });

  const billingEventsQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'billing-events'],
    queryFn: () => billingAdminApi.listEvents({ user_id: userId, page_size: 5 }),
    enabled: !!userId,
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

      <div className="card-static p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">Usage this month</h3>
          {usageQuery.data ? (
            <span className="text-xs text-slate-400">
              {formatDate(usageQuery.data.period_start)} → {formatDate(usageQuery.data.period_end)}
            </span>
          ) : null}
        </div>
        {usageQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading usage…</p>
        ) : usageQuery.error ? (
          <p className="text-sm text-rose-600">{extractAdminError(usageQuery.error).message}</p>
        ) : usageQuery.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['Queries', usageQuery.data.total_queries],
                    ['LLM tokens', usageQuery.data.total_llm_tokens],
                    ['Rows scanned', usageQuery.data.total_rows_scanned],
                    ['Charts', usageQuery.data.total_chart_renders],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formatNumber(value)}
                    </p>
                  </div>
                ))}
              </div>
              {usageQuery.data.monthly_llm_token_limit != null &&
              usageQuery.data.monthly_llm_token_limit > 0 ? (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Token pool</span>
                    <span>
                      {formatNumber(usageQuery.data.total_llm_tokens)} /{' '}
                      {formatNumber(usageQuery.data.monthly_llm_token_limit)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        usageQuery.data.total_llm_tokens >=
                        usageQuery.data.monthly_llm_token_limit
                          ? 'bg-rose-500'
                          : 'bg-teal-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (usageQuery.data.total_llm_tokens /
                            usageQuery.data.monthly_llm_token_limit) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {usageQuery.data.estimated_cost_usd != null ? (
                <p className="text-xs text-slate-500">
                  Estimated LLM cost:{' '}
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(usageQuery.data.estimated_cost_usd)}
                  </span>
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Daily LLM tokens (30d)</p>
              {usageQuery.data.daily.length ? (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageQuery.data.daily}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => new Date(d).getDate().toString()}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [formatNumber(Number(value)), 'Tokens']}
                        labelFormatter={(d) => formatDate(String(d))}
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 10px 30px rgb(15 23 42 / 0.1)',
                        }}
                      />
                      <Bar dataKey="llm_tokens" fill="#0d9488" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                  No daily snapshots yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-static overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Recent chat runs</h3>
            <Link
              to={`/chat-runs?user_id=${userId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DataTable
            data={runsQuery.data?.items ?? []}
            loading={runsQuery.isLoading}
            emptyTitle="No chat runs"
            rowKey={(r) => r.id}
            columns={[
              {
                header: 'Status',
                accessor: (r) => (
                  <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>
                ),
              },
              { header: 'Error', accessor: (r) => r.error_code || '—' },
              { header: 'Started', accessor: (r) => formatDate(r.started_at || r.created_at) },
            ]}
          />
        </div>

        <div className="card-static overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Billing events</h3>
            <Link
              to={`/billing?user_id=${userId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DataTable
            data={billingEventsQuery.data?.items ?? []}
            loading={billingEventsQuery.isLoading}
            emptyTitle="No billing events"
            rowKey={(e) => e.id}
            columns={[
              {
                header: 'Type',
                accessor: (e) => (
                  <span className="font-mono text-xs">{truncate(e.event_type, 30)}</span>
                ),
              },
              {
                header: 'Status',
                accessor: (e) => (
                  <StatusBadge
                    variant={
                      e.status === 'processed'
                        ? 'success'
                        : e.status === 'failed'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {e.status}
                  </StatusBadge>
                ),
              },
              {
                header: 'Amount',
                accessor: (e) =>
                  e.amount_cents != null ? formatCurrency(e.amount_cents / 100) : '—',
              },
              { header: 'When', accessor: (e) => formatDate(e.created_at) },
            ]}
          />
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
