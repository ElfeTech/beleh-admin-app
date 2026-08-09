import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, MailPlus, UserPlus } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState } from '../components/ui/EmptyState';
import { FilterBar } from '../components/ui/FilterBar';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { invitesApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminInvite, AdminInviteStatus } from '../types/admin';
import { formatDate } from '../utils/format';

const InvitesPage: React.FC = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<AdminInvite | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'invites', { page, status }],
    queryFn: () =>
      invitesApi.list({
        page,
        page_size: 20,
        status: status === 'all' ? undefined : (status as AdminInviteStatus),
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      invitesApi.create({
        email: email.trim().toLowerCase(),
        notes: notes.trim() || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      setPanelOpen(false);
      setEmail('');
      setNotes('');
      setFormError(null);
    },
    onError: (err) => {
      const parsed = extractAdminError(err);
      if (parsed.code === 'ADMIN_INVITE_EXISTS') {
        setFormError('An active invite already exists for this email.');
      } else {
        setFormError(parsed.message);
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitesApi.revoke(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      setRevokeTarget(null);
    },
  });

  const revokeError = revokeMutation.error
    ? extractAdminError(revokeMutation.error)
    : null;

  return (
    <div>
      <PageHeader
        title="Admin invites"
        description="Invite colleagues to the platform admin dashboard. Login requires a pending or accepted invite."
        actions={
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setPanelOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite admin
          </button>
        }
      />

      <FilterBar>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="revoked">Revoked</option>
        </select>
      </FilterBar>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No invites yet"
            emptyDescription="Invite an admin by email to grant dashboard access."
            rowKey={(inv) => inv.id}
            columns={[
              {
                header: 'Email',
                accessor: (inv) => (
                  <div className="flex items-center gap-2">
                    <MailPlus className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-900">{inv.email}</span>
                  </div>
                ),
              },
              {
                header: 'Status',
                accessor: (inv) => (
                  <StatusBadge variant={statusVariant(inv.status)}>{inv.status}</StatusBadge>
                ),
              },
              {
                header: 'Notes',
                accessor: (inv) => (
                  <span className="text-slate-600">{inv.notes?.trim() || '—'}</span>
                ),
              },
              {
                header: 'Invited',
                accessor: (inv) => formatDate(inv.created_at),
              },
              {
                header: 'Accepted',
                accessor: (inv) => formatDate(inv.accepted_at),
              },
              {
                header: 'Revoked',
                accessor: (inv) => formatDate(inv.revoked_at),
              },
              {
                header: 'Actions',
                accessor: (inv) =>
                  inv.status === 'pending' || inv.status === 'accepted' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        revokeMutation.reset();
                        setRevokeTarget(inv);
                      }}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Revoke invite"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
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

      <DetailPanel
        open={panelOpen}
        title="Invite admin"
        onClose={() => {
          if (createMutation.isPending) return;
          setPanelOpen(false);
          setFormError(null);
        }}
        footer={
          <button
            type="button"
            disabled={!email.trim() || createMutation.isPending}
            onClick={() => {
              setFormError(null);
              createMutation.mutate();
            }}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Sending…' : 'Send invite'}
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            The invitee must sign in with Google using this email. Revoked invites can be
            re-activated by inviting the same address again.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Notes (optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this person needs access…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          {formError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </p>
          ) : null}
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!revokeTarget}
        title={
          revokeError?.code === 'ADMIN_INVITE_LAST_ACTIVE'
            ? 'Cannot revoke invite'
            : 'Revoke invite?'
        }
        description={
          revokeError?.code === 'ADMIN_INVITE_LAST_ACTIVE'
            ? 'This is the last active admin invite. Invite another admin before revoking this one.'
            : revokeError
              ? revokeError.message
              : `Revoke access for ${revokeTarget?.email}? They will no longer be able to sign in to the admin dashboard.`
        }
        danger={revokeError?.code !== 'ADMIN_INVITE_LAST_ACTIVE'}
        confirmLabel={revokeError?.code === 'ADMIN_INVITE_LAST_ACTIVE' ? 'Close' : 'Revoke'}
        cancelLabel={revokeError?.code === 'ADMIN_INVITE_LAST_ACTIVE' ? undefined : 'Cancel'}
        loading={revokeMutation.isPending}
        onCancel={() => {
          setRevokeTarget(null);
          revokeMutation.reset();
        }}
        onConfirm={() => {
          if (!revokeTarget) return;
          if (revokeError?.code === 'ADMIN_INVITE_LAST_ACTIVE') {
            setRevokeTarget(null);
            revokeMutation.reset();
            return;
          }
          revokeMutation.mutate(revokeTarget.id);
        }}
      />
    </div>
  );
};

export default InvitesPage;
