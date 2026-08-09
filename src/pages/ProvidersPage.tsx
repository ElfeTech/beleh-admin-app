import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { ErrorState } from '../components/ui/EmptyState';
import { providersApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { ProviderAdminDetail, ProviderCatalogCreate } from '../types/admin';
import { formatDate } from '../utils/format';

type Tab = 'catalog' | 'audit';

const emptyCreate: ProviderCatalogCreate = {
  slug: '',
  display_name: '',
  authorization_url: '',
  token_url: '',
  api_base_url: '',
  redirect_uri: '',
  client_id: '',
  client_secret: '',
  auth_type: 'oauth2',
  status: 'active',
  scopes: [],
};

const ProvidersPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('catalog');
  const [auditPage, setAuditPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ProviderCatalogCreate>(emptyCreate);
  const [selected, setSelected] = useState<ProviderAdminDetail | null>(null);
  const [disableSlug, setDisableSlug] = useState<string | null>(null);
  const [credSlug, setCredSlug] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: () => providersApi.list(),
  });

  const audit = useQuery({
    queryKey: ['admin', 'providers', 'audit', auditPage],
    queryFn: () => providersApi.audit({ page: auditPage, page_size: 20 }),
    enabled: tab === 'audit',
  });

  const createMutation = useMutation({
    mutationFn: () => providersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      setCreateOpen(false);
      setForm(emptyCreate);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (slug: string) => providersApi.disable(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      setDisableSlug(null);
      setSelected(null);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () =>
      providersApi.rotateCredentials(credSlug!, {
        client_id: clientId || undefined,
        client_secret: clientSecret || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      setCredSlug(null);
      setClientId('');
      setClientSecret('');
    },
  });

  const patchStatus = useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: string }) =>
      providersApi.update(slug, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'providers'] }),
  });

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Catalog admin — create, disable, rotate credentials, and audit."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Add provider
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        {(['catalog', 'audit'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'catalog' ? (
        list.error ? (
          <ErrorState message={extractAdminError(list.error).message} onRetry={() => list.refetch()} />
        ) : (
          <div className="card-static overflow-hidden">
            <DataTable
              data={list.data ?? []}
              loading={list.isLoading}
              emptyTitle="No providers"
              rowKey={(p) => p.slug}
              onRowClick={setSelected}
              columns={[
                {
                  header: 'Provider',
                  accessor: (p) => (
                    <div>
                      <p className="font-medium">{p.display_name}</p>
                      <p className="font-mono text-xs text-slate-500">{p.slug}</p>
                    </div>
                  ),
                },
                { header: 'Auth', accessor: (p) => p.auth_type },
                {
                  header: 'Status',
                  accessor: (p) => (
                    <StatusBadge variant={statusVariant(p.status)}>{p.status}</StatusBadge>
                  ),
                },
                {
                  header: 'Secret',
                  accessor: (p) => (p.has_secret ? `v${p.secret_version ?? 1}` : '—'),
                },
                {
                  header: 'Actions',
                  accessor: (p) => (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Rotate credentials"
                        onClick={() => setCredSlug(p.slug)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisableSlug(p.slug)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Disable
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )
      ) : audit.error ? (
        <ErrorState message={extractAdminError(audit.error).message} onRetry={() => audit.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={audit.data?.items ?? []}
            loading={audit.isLoading}
            emptyTitle="No audit events"
            rowKey={(e) => e.id}
            columns={[
              { header: 'Action', accessor: (e) => e.action },
              { header: 'Provider', accessor: (e) => e.provider_slug || '—' },
              { header: 'IP', accessor: (e) => e.ip || '—' },
              { header: 'When', accessor: (e) => formatDate(e.created_at) },
            ]}
          />
          {audit.data ? (
            <Pagination
              page={audit.data.page}
              totalPages={audit.data.total_pages}
              totalItems={audit.data.total_items}
              hasNext={audit.data.has_next}
              hasPrevious={audit.data.has_previous}
              onPageChange={setAuditPage}
            />
          ) : null}
        </div>
      )}

      <DetailPanel open={!!selected} title={selected?.display_name || ''} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-slate-500">API base:</span> {selected.api_base_url}
            </p>
            <p>
              <span className="text-slate-500">Client ID:</span> {selected.client_id || '—'}
            </p>
            <p>
              <span className="text-slate-500">Redirect:</span> {selected.redirect_uri}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  patchStatus.mutate({
                    slug: selected.slug,
                    status: selected.status === 'active' ? 'disabled' : 'active',
                  })
                }
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Toggle status
              </button>
            </div>
          </div>
        ) : null}
      </DetailPanel>

      <DetailPanel
        open={createOpen}
        title="Create provider"
        onClose={() => setCreateOpen(false)}
        footer={
          <button
            type="button"
            disabled={createMutation.isPending || !form.slug || !form.client_secret}
            onClick={() => createMutation.mutate()}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        }
      >
        <div className="space-y-3">
          {(
            [
              'slug',
              'display_name',
              'authorization_url',
              'token_url',
              'api_base_url',
              'redirect_uri',
              'client_id',
              'client_secret',
            ] as const
          ).map((key) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block capitalize text-slate-500">{key.replace(/_/g, ' ')}</span>
              <input
                type={key.includes('secret') ? 'password' : 'text'}
                value={String(form[key] ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          ))}
          {createMutation.error ? (
            <p className="text-xs text-rose-600">{extractAdminError(createMutation.error).message}</p>
          ) : null}
        </div>
      </DetailPanel>

      <DetailPanel
        open={!!credSlug}
        title="Rotate credentials"
        subtitle={credSlug || undefined}
        onClose={() => setCredSlug(null)}
        footer={
          <button
            type="button"
            disabled={rotateMutation.isPending || (!clientId && !clientSecret)}
            onClick={() => rotateMutation.mutate()}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Rotate
          </button>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Client ID</span>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Client secret</span>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!disableSlug}
        title="Disable provider?"
        description={`Disable “${disableSlug}”? New connections will be blocked.`}
        danger
        confirmLabel="Disable"
        loading={disableMutation.isPending}
        onCancel={() => setDisableSlug(null)}
        onConfirm={() => disableSlug && disableMutation.mutate(disableSlug)}
      />
    </div>
  );
};

export default ProvidersPage;
