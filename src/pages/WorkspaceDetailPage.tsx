import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { DataTable } from '../components/dashboard/DataTable';
import { plansApi, workspacesApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminWorkspaceMember, SubscriptionStatus, WorkspaceRole } from '../types/admin';
import { formatDate } from '../utils/format';

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const WorkspaceDetailPage: React.FC = () => {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<AdminWorkspaceMember | null>(null);
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<WorkspaceRole>('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [moveTenantId, setMoveTenantId] = useState('');
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'workspaces', workspaceId],
    queryFn: () => workspacesApi.get(workspaceId),
    enabled: !!workspaceId,
  });

  const invitationsQuery = useQuery({
    queryKey: ['admin', 'workspaces', workspaceId, 'invitations'],
    queryFn: () => workspacesApi.listInvitations(workspaceId),
    enabled: !!workspaceId,
  });

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => plansApi.list(),
  });

  const subQuery = useQuery({
    queryKey: ['admin', 'workspaces', workspaceId, 'subscription'],
    queryFn: () => plansApi.getWorkspaceSubscription(workspaceId),
    enabled: !!workspaceId,
    retry: false,
  });

  const invalidateWorkspace = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'workspaces', workspaceId] });
    qc.invalidateQueries({ queryKey: ['admin', 'workspaces', workspaceId, 'invitations'] });
    qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      workspacesApi.updateMemberRole(workspaceId, memberId, role),
    onSuccess: invalidateWorkspace,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: () => {
      invalidateWorkspace();
      setRemoveMember(null);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      workspacesApi.addMember(workspaceId, {
        user_id: addUserId.trim(),
        role: addRole,
      }),
    onSuccess: () => {
      invalidateWorkspace();
      setAddUserId('');
      setAddRole('member');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      workspacesApi.createInvitation(workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: () => {
      invalidateWorkspace();
      setInviteEmail('');
      setInviteRole('member');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      workspacesApi.resendInvitation(workspaceId, invitationId),
    onSuccess: invalidateWorkspace,
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      workspacesApi.revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      invalidateWorkspace();
      setRevokeInviteId(null);
    },
  });

  const transferMutation = useMutation({
    mutationFn: (owner_id: string) => workspacesApi.patch(workspaceId, { owner_id }),
    onSuccess: invalidateWorkspace,
  });

  const moveTenantMutation = useMutation({
    mutationFn: (tenant_id: string) => workspacesApi.patch(workspaceId, { tenant_id }),
    onSuccess: () => {
      invalidateWorkspace();
      setMoveTenantId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspacesApi.remove(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      navigate('/workspaces');
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      plansApi.assignWorkspaceSubscription(workspaceId, {
        plan_id: planId,
        status: subscriptionStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'workspaces', workspaceId, 'subscription'] });
    },
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error || !query.data) {
    return (
      <ErrorState
        message={extractAdminError(query.error || new Error('Not found')).message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const w = query.data;
  const usage = w.usage;

  return (
    <div className="space-y-6">
      <Link
        to="/workspaces"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to workspaces
      </Link>

      <PageHeader
        title={w.name}
        description={w.description || 'No description'}
        actions={
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Force delete
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-static space-y-2 p-5 text-sm lg:col-span-2">
          <h3 className="font-semibold text-slate-800">Details</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Owner:</span> {w.owner_email || w.owner_id}
            </p>
            <p>
              <span className="text-slate-500">Tenant:</span>{' '}
              {w.tenant_id ? (
                <Link to={`/tenants/${w.tenant_id}`} className="font-medium hover:text-teal-700">
                  {w.tenant_name || w.tenant_id}
                </Link>
              ) : (
                '—'
              )}
            </p>
            <p>
              <span className="text-slate-500">Members:</span> {w.member_count}
            </p>
            <p>
              <span className="text-slate-500">Pending invites:</span>{' '}
              {w.pending_invitation_count ?? 0}
            </p>
            <p>
              <span className="text-slate-500">Datasets:</span> {w.dataset_count}
            </p>
            <p>
              <span className="text-slate-500">Connectors:</span> {w.connector_count}
            </p>
            <p>
              <span className="text-slate-500">Provider:</span> {w.provider_slug || '—'}
            </p>
            <p>
              <span className="text-slate-500">Created:</span> {formatDate(w.created_at)}
            </p>
          </div>
        </div>

        <div className="card-static space-y-4 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Usage</h3>
          {usage ? (
            <div className="space-y-3">
              <UsageMeter label="Seats" used={usage.seats_used} limit={usage.seats_limit} />
              <UsageMeter
                label="Datasources"
                used={usage.datasources_used}
                limit={usage.datasources_limit}
              />
              <UsageMeter
                label="Workspaces (tenant)"
                used={usage.workspaces_used}
                limit={usage.workspaces_limit}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No usage snapshot</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-static space-y-3 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Transfer owner</h3>
          <select
            value={transferOwnerId}
            onChange={(e) => setTransferOwnerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select member…</option>
            {w.members.map((m) => (
              <option key={m.id} value={m.user_id}>
                {m.email || m.display_name || m.user_id}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!transferOwnerId || transferMutation.isPending}
            onClick={() => transferMutation.mutate(transferOwnerId)}
            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Transfer
          </button>
          {transferMutation.error ? (
            <p className="text-xs text-rose-600">{extractAdminError(transferMutation.error).message}</p>
          ) : null}
        </div>

        <div className="card-static space-y-3 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Move tenant</h3>
          <p className="text-xs text-slate-500">
            Support-only: reassign this workspace to another billing org (checks workspace limits).
          </p>
          <input
            value={moveTenantId}
            onChange={(e) => setMoveTenantId(e.target.value)}
            placeholder="Destination tenant UUID"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-teal-500"
          />
          <button
            type="button"
            disabled={!moveTenantId.trim() || moveTenantMutation.isPending}
            onClick={() => moveTenantMutation.mutate(moveTenantId.trim())}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {moveTenantMutation.isPending ? 'Moving…' : 'Move to tenant'}
          </button>
          {moveTenantMutation.error ? (
            <p className="text-xs text-rose-600">
              {extractAdminError(moveTenantMutation.error).message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="card-static overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Members</h3>
        </div>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-56 flex-1 text-sm">
              <span className="mb-1 block text-slate-500">User ID</span>
              <input
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="UUID"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Role</span>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as WorkspaceRole)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="member">member</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <button
              type="button"
              disabled={!addUserId.trim() || addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {addMemberMutation.isPending ? 'Adding…' : 'Add member'}
            </button>
          </div>
          {addMemberMutation.error ? (
            <p className="mt-2 text-xs text-rose-600">
              {extractAdminError(addMemberMutation.error).message}
            </p>
          ) : null}
        </div>
        <DataTable
          data={w.members}
          emptyTitle="No members"
          rowKey={(m) => m.id}
          columns={[
            {
              header: 'Member',
              accessor: (m) => (
                <div>
                  <p className="font-medium">{m.display_name || '—'}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
              ),
            },
            {
              header: 'Role',
              accessor: (m) => (
                <select
                  value={m.role === 'owner' || m.role === 'member' ? m.role : 'member'}
                  onChange={(e) => roleMutation.mutate({ memberId: m.id, role: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value="owner">owner</option>
                  <option value="member">member</option>
                </select>
              ),
            },
            {
              header: 'Status',
              accessor: (m) => (
                <StatusBadge variant={statusVariant(m.status || 'active')}>
                  {m.status || 'active'}
                </StatusBadge>
              ),
            },
            { header: 'Joined', accessor: (m) => formatDate(m.joined_at) },
            {
              header: '',
              accessor: (m) => (
                <button
                  type="button"
                  onClick={() => setRemoveMember(m)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              ),
            },
          ]}
        />
        {roleMutation.error ? (
          <p className="px-5 py-2 text-xs text-rose-600">
            {extractAdminError(roleMutation.error).message}
          </p>
        ) : null}
      </div>

      <div className="card-static overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Invitations</h3>
        </div>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-56 flex-1 text-sm">
              <span className="mb-1 block text-slate-500">Email</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Role</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="member">member</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <button
              type="button"
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Sending…' : 'Invite'}
            </button>
          </div>
          {inviteMutation.error ? (
            <p className="mt-2 text-xs text-rose-600">
              {extractAdminError(inviteMutation.error).message}
            </p>
          ) : null}
        </div>
        {invitationsQuery.error ? (
          <div className="p-5">
            <ErrorState
              message={extractAdminError(invitationsQuery.error).message}
              onRetry={() => invitationsQuery.refetch()}
            />
          </div>
        ) : (
          <DataTable
            data={invitationsQuery.data ?? []}
            loading={invitationsQuery.isLoading}
            emptyTitle="No invitations"
            rowKey={(inv) => inv.id}
            columns={[
              { header: 'Email', accessor: (inv) => inv.email },
              { header: 'Role', accessor: (inv) => inv.role },
              {
                header: 'Status',
                accessor: (inv) => (
                  <StatusBadge variant={statusVariant(inv.status)}>{inv.status}</StatusBadge>
                ),
              },
              { header: 'Expires', accessor: (inv) => formatDate(inv.expires_at) },
              { header: 'Created', accessor: (inv) => formatDate(inv.created_at) },
              {
                header: '',
                accessor: (inv) => (
                  <div className="flex items-center gap-3">
                    {inv.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={resendMutation.isPending}
                          onClick={() => resendMutation.mutate(inv.id)}
                          className="text-xs font-semibold text-teal-700 hover:underline disabled:opacity-50"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeInviteId(inv.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Revoke
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
        {resendMutation.error ? (
          <p className="px-5 py-2 text-xs text-rose-600">
            {extractAdminError(resendMutation.error).message}
          </p>
        ) : null}
      </div>

      <div className="card-static space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Workspace subscription (legacy)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Product limits follow the <strong>tenant owner</strong> plan. Prefer assigning on the
              tenant.
            </p>
          </div>
          {w.tenant_id ? (
            <Link
              to={`/tenants/${w.tenant_id}`}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Manage tenant subscription
            </Link>
          ) : null}
        </div>
        {subQuery.data ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">{subQuery.data.plan.name}</span>
              <StatusBadge variant="info">{subQuery.data.status}</StatusBadge>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
            No workspace subscription
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="min-w-48 flex-1 text-sm">
            <span className="mb-1 block text-slate-500">Plan</span>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Select plan…</option>
              {(plansQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tier})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-40 text-sm">
            <span className="mb-1 block text-slate-500">Status</span>
            <select
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value as SubscriptionStatus)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past due</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!planId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="self-end rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Assign legacy
          </button>
        </div>
        {assignMutation.error ? (
          <p className="text-xs text-rose-600">{extractAdminError(assignMutation.error).message}</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Force delete workspace?"
        description={`Permanently delete “${w.name}” and related memberships. This cannot be undone.`}
        danger
        confirmLabel="Delete workspace"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        open={!!removeMember}
        title="Remove member?"
        description={`Remove ${removeMember?.email || removeMember?.display_name} from this workspace?`}
        danger
        confirmLabel="Remove"
        loading={removeMemberMutation.isPending}
        onCancel={() => setRemoveMember(null)}
        onConfirm={() => removeMember && removeMemberMutation.mutate(removeMember.id)}
      />

      <ConfirmDialog
        open={!!revokeInviteId}
        title="Revoke invitation?"
        description="The invite link will stop working immediately."
        danger
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
        onCancel={() => setRevokeInviteId(null)}
        onConfirm={() => revokeInviteId && revokeMutation.mutate(revokeInviteId)}
      />
    </div>
  );
};

export default WorkspaceDetailPage;
