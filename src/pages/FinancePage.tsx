import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Coins,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { costCatalogApi, financeApi, pricingApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type {
  CostCadence,
  CostCatalogItem,
  CostCatalogItemCreate,
  LlmModelRate,
  LlmModelRateCreate,
} from '../types/admin';
import { tokensToCreditsUsed } from '../utils/credits';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';

type FinanceTab = 'overview' | 'credits' | 'llm-rates' | 'cost-catalog';

const USAGE_EVENT_TYPES = [
  'query_executed',
  'llm_call',
  'rows_scanned',
  'chart_rendered',
  'dataset_created',
  'dataset_uploaded',
  'export',
  'api_call',
  'insight_generated',
] as const;

function emptyRate(): LlmModelRateCreate {
  return {
    model_id: '',
    display_name: '',
    input_price_per_1m_usd: 0,
    output_price_per_1m_usd: 0,
    is_active: true,
    effective_from: null,
    notes: null,
  };
}

function emptyCostItem(): CostCatalogItemCreate {
  return {
    name: '',
    description: '',
    amount_usd: 0,
    cadence: 'monthly',
    event_type: null,
    is_active: true,
    effective_from: null,
    effective_to: null,
  };
}

function monthInputValue(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toIsoOrNull(dateValue: string): string | null {
  if (!dateValue.trim()) return null;
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function FinanceOverviewTab() {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const params = useMemo(() => {
    const next: { period_start?: string; period_end?: string } = {};
    if (periodStart) next.period_start = toIsoOrNull(periodStart) || undefined;
    if (periodEnd) next.period_end = toIsoOrNull(periodEnd) || undefined;
    return next;
  }, [periodStart, periodEnd]);

  const query = useQuery({
    queryKey: ['admin', 'finance', 'overview', params],
    queryFn: () => financeApi.overview(params),
  });
  const creditsQuery = useQuery({
    queryKey: ['admin', 'pricing', 'credits'],
    queryFn: () => pricingApi.getCredits(),
  });

  if (query.isLoading) return <LoadingBlock label="Loading finance overview…" />;
  if (query.error || !query.data) {
    return (
      <ErrorState
        message={extractAdminError(query.error || new Error('Failed to load finance')).message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const data = query.data;
  const totalCredits = tokensToCreditsUsed(
    data.usage_totals.total_llm_tokens,
    creditsQuery.data?.tokens_per_credit,
  );
  const chartData = [
    { name: 'Revenue', value: data.revenue_usd },
    { name: 'LLM COGS', value: data.cost_breakdown.llm_cost_usd },
    { name: 'Infra', value: data.cost_breakdown.infra_cost_usd },
    { name: 'Net profit', value: data.net_profit_usd },
  ];

  return (
    <div className="space-y-6">
      <div className="card-static flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Period start</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Period end (exclusive)</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setPeriodStart('');
            setPeriodEnd('');
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Current month
        </button>
        <p className="ml-auto text-xs text-slate-500">
          {formatDate(data.period_start)} → {formatDate(data.period_end)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(data.revenue_usd)}
          subtitle={`${formatNumber(data.revenue_breakdown.active_paid_subscriptions)} paid subs`}
          icon={TrendingUp}
          tone="teal"
        />
        <StatCard
          title="Total cost"
          value={formatCurrency(data.cost_usd)}
          subtitle={`LLM ${formatCurrency(data.cost_breakdown.llm_cost_usd)}`}
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          title="Net profit"
          value={formatCurrency(data.net_profit_usd)}
          subtitle={
            data.margin_pct != null ? `${data.margin_pct.toFixed(1)}% margin` : 'Margin n/a'
          }
          icon={Wallet}
          tone={data.net_profit_usd >= 0 ? 'sky' : 'rose'}
        />
        <StatCard
          title="Active users"
          value={formatNumber(data.usage_totals.active_users)}
          subtitle={`${formatNumber(data.usage_totals.total_queries)} queries`}
          icon={CircleDollarSign}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-static p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Revenue vs cost</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 10px 30px rgb(15 23 42 / 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-static space-y-3 p-5 text-sm">
            <h3 className="font-semibold text-slate-800">Revenue breakdown</h3>
            <div className="flex justify-between">
              <span className="text-slate-500">Subscription MRR</span>
              <span className="font-medium">
                {formatCurrency(data.revenue_breakdown.subscription_mrr_usd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid subscriptions</span>
              <span className="font-medium">
                {formatNumber(data.revenue_breakdown.active_paid_subscriptions)}
              </span>
            </div>
            <p className="text-xs text-slate-400">{data.revenue_breakdown.estimation_mode}</p>
          </div>

          <div className="card-static space-y-3 p-5 text-sm">
            <h3 className="font-semibold text-slate-800">Cost breakdown</h3>
            <div className="flex justify-between">
              <span className="text-slate-500">LLM</span>
              <span className="font-medium">{formatCurrency(data.cost_breakdown.llm_cost_usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Infra monthly</span>
              <span className="font-medium">
                {formatCurrency(data.cost_breakdown.infra_monthly_usd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Infra per-event</span>
              <span className="font-medium">
                {formatCurrency(data.cost_breakdown.infra_per_event_usd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Infra per 1k tokens</span>
              <span className="font-medium">
                {formatCurrency(data.cost_breakdown.infra_per_1k_tokens_usd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unpriced LLM tokens</span>
              <span className="font-medium">
                {formatNumber(data.cost_breakdown.unpriced_llm_tokens)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-static grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <p className="text-xs text-slate-500">Queries</p>
          <p className="mt-1 font-semibold">{formatNumber(data.usage_totals.total_queries)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Credits</p>
          <p className="mt-1 font-semibold">{formatNumber(totalCredits)}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {formatNumber(data.usage_totals.total_llm_tokens)} tokens
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">LLM tokens</p>
          <p className="mt-1 font-semibold">{formatNumber(data.usage_totals.total_llm_tokens)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Prompt tokens</p>
          <p className="mt-1 font-semibold">{formatNumber(data.usage_totals.total_prompt_tokens)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Completion tokens</p>
          <p className="mt-1 font-semibold">
            {formatNumber(data.usage_totals.total_completion_tokens)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Active users</p>
          <p className="mt-1 font-semibold">{formatNumber(data.usage_totals.active_users)}</p>
        </div>
      </div>
    </div>
  );
}

function CreditsTab() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'pricing', 'credits'],
    queryFn: () => pricingApi.getCredits(),
  });
  const [tokensPerCredit, setTokensPerCredit] = useState('');

  useEffect(() => {
    if (query.data?.tokens_per_credit != null) {
      setTokensPerCredit(String(query.data.tokens_per_credit));
    }
  }, [query.data?.tokens_per_credit]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const value = Number(tokensPerCredit);
      if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
        throw new Error('tokens_per_credit must be an integer greater than 0');
      }
      return pricingApi.updateCredits({ tokens_per_credit: value });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'pricing', 'credits'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'usage'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
  });

  if (query.isLoading) return <LoadingBlock label="Loading credit settings…" />;
  if (query.error || !query.data) {
    return (
      <ErrorState
        message={extractAdminError(query.error || new Error('Failed to load credits')).message}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="card-static space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Tokens per credit</h3>
            <p className="mt-1 text-xs text-slate-500">
              User-facing credits = ceil(tokens ÷ tokens_per_credit). Plan limits in admin remain
              token-based; the client converts them to credit limits.
            </p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">tokens_per_credit</span>
          <input
            type="number"
            min={1}
            step={1}
            value={tokensPerCredit}
            onChange={(e) => setTokensPerCredit(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
          />
        </label>

        <p className="text-xs text-slate-500">
          Example: 1,000 tokens = 1 credit. Last updated{' '}
          {formatDate(query.data.updated_at)}.
        </p>

        {saveMutation.error ? (
          <p className="text-sm text-rose-600">{extractAdminError(saveMutation.error).message}</p>
        ) : null}
        {saveMutation.isSuccess ? (
          <p className="text-sm text-emerald-600">Credit settings saved.</p>
        ) : null}

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function LlmRatesTab() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<LlmModelRate | null>(null);
  const [form, setForm] = useState<LlmModelRateCreate>(emptyRate);
  const [disableId, setDisableId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'pricing', 'models', { activeOnly }],
    queryFn: () => pricingApi.listModels(activeOnly),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? pricingApi.updateModel(editing.id, form) : pricingApi.createModel(form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'pricing', 'models'] });
      setPanelOpen(false);
      setEditing(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => pricingApi.disableModel(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'pricing', 'models'] });
      setDisableId(null);
    },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-teal-600"
          />
          Active only
        </label>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(emptyRate());
            setPanelOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add model rate
        </button>
      </div>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data ?? []}
            loading={query.isLoading}
            emptyTitle="No model rates"
            rowKey={(row) => row.id}
            onRowClick={(row) => {
              setEditing(row);
              setForm({
                model_id: row.model_id,
                display_name: row.display_name,
                input_price_per_1m_usd: row.input_price_per_1m_usd,
                output_price_per_1m_usd: row.output_price_per_1m_usd,
                is_active: row.is_active,
                effective_from: row.effective_from,
                notes: row.notes,
              });
              setPanelOpen(true);
            }}
            columns={[
              {
                header: 'Model',
                accessor: (row) => (
                  <div>
                    <p className="font-medium">{row.display_name || row.model_id}</p>
                    <p className="font-mono text-xs text-slate-500">{row.model_id}</p>
                  </div>
                ),
              },
              {
                header: 'Input / 1M',
                accessor: (row) => formatCurrency(row.input_price_per_1m_usd),
              },
              {
                header: 'Output / 1M',
                accessor: (row) => formatCurrency(row.output_price_per_1m_usd),
              },
              {
                header: 'Effective',
                accessor: (row) => formatDate(row.effective_from),
              },
              {
                header: 'Status',
                accessor: (row) => (
                  <StatusBadge variant={row.is_active ? 'success' : 'neutral'}>
                    {row.is_active ? 'Active' : 'Disabled'}
                  </StatusBadge>
                ),
              },
              {
                header: '',
                accessor: (row) =>
                  row.is_active ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDisableId(row.id);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Disable
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </div>
      )}

      <DetailPanel
        open={panelOpen}
        title={editing ? 'Edit model rate' : 'Create model rate'}
        subtitle='Use model_id "*" as the fallback rate for unpriced models.'
        onClose={() => setPanelOpen(false)}
        footer={
          <button
            type="button"
            disabled={!form.model_id.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create rate'}
          </button>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Model ID</span>
            <input
              value={form.model_id}
              onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))}
              placeholder="deepseek-v4-flash or *"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Display name</span>
            <input
              value={form.display_name || ''}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value || null }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Input $/1M tokens</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={form.input_price_per_1m_usd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, input_price_per_1m_usd: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Output $/1M tokens</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={form.output_price_per_1m_usd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, output_price_per_1m_usd: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Effective from</span>
            <input
              type="date"
              value={monthInputValue(form.effective_from)}
              onChange={(e) =>
                setForm((f) => ({ ...f, effective_from: toIsoOrNull(e.target.value) }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Notes</span>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="accent-teal-600"
            />
            Active
          </label>
          {saveMutation.error ? (
            <p className="text-sm text-rose-600">{extractAdminError(saveMutation.error).message}</p>
          ) : null}
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!disableId}
        title="Disable model rate?"
        description="Soft-disables this rate. Unpriced models will fall back to the '*' rate if configured."
        danger
        confirmLabel="Disable"
        loading={disableMutation.isPending}
        onCancel={() => setDisableId(null)}
        onConfirm={() => disableId && disableMutation.mutate(disableId)}
      />
    </div>
  );
}

function CostCatalogTab() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<CostCatalogItem | null>(null);
  const [form, setForm] = useState<CostCatalogItemCreate>(emptyCostItem);
  const [disableId, setDisableId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'cost-catalog', { activeOnly }],
    queryFn: () => costCatalogApi.list(activeOnly),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? costCatalogApi.update(editing.id, form) : costCatalogApi.create(form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'cost-catalog'] });
      setPanelOpen(false);
      setEditing(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => costCatalogApi.disable(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'cost-catalog'] });
      setDisableId(null);
    },
  });

  const requiresEventType = form.cadence === 'per_event';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-teal-600"
          />
          Active only
        </label>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(emptyCostItem());
            setPanelOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add cost item
        </button>
      </div>

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data ?? []}
            loading={query.isLoading}
            emptyTitle="No cost catalog items"
            rowKey={(row) => row.id}
            onRowClick={(row) => {
              setEditing(row);
              setForm({
                name: row.name,
                description: row.description,
                amount_usd: row.amount_usd,
                cadence: row.cadence,
                event_type: row.event_type,
                is_active: row.is_active,
                effective_from: row.effective_from,
                effective_to: row.effective_to,
              });
              setPanelOpen(true);
            }}
            columns={[
              {
                header: 'Name',
                accessor: (row) => (
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.description || '—'}</p>
                  </div>
                ),
              },
              {
                header: 'Amount',
                accessor: (row) => formatCurrency(row.amount_usd),
              },
              {
                header: 'Cadence',
                accessor: (row) => <StatusBadge variant="info">{row.cadence}</StatusBadge>,
              },
              {
                header: 'Event type',
                accessor: (row) => row.event_type || '—',
              },
              {
                header: 'Status',
                accessor: (row) => (
                  <StatusBadge variant={row.is_active ? 'success' : 'neutral'}>
                    {row.is_active ? 'Active' : 'Disabled'}
                  </StatusBadge>
                ),
              },
              {
                header: '',
                accessor: (row) =>
                  row.is_active ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDisableId(row.id);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Disable
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </div>
      )}

      <DetailPanel
        open={panelOpen}
        title={editing ? 'Edit cost item' : 'Create cost item'}
        subtitle="Monthly items are pro-rated by days in the finance period."
        onClose={() => setPanelOpen(false)}
        footer={
          <button
            type="button"
            disabled={
              !form.name.trim() ||
              saveMutation.isPending ||
              (requiresEventType && !form.event_type)
            }
            onClick={() => saveMutation.mutate()}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create item'}
          </button>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Description</span>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Amount (USD)</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={form.amount_usd}
                onChange={(e) => setForm((f) => ({ ...f, amount_usd: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Cadence</span>
              <select
                value={form.cadence}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cadence: e.target.value as CostCadence,
                    event_type:
                      e.target.value === 'per_event' ? f.event_type || 'query_executed' : null,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="monthly">Monthly</option>
                <option value="per_event">Per event</option>
                <option value="per_1k_tokens">Per 1k tokens</option>
              </select>
            </label>
          </div>
          {requiresEventType ? (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Event type</span>
              <select
                value={form.event_type || ''}
                onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value || null }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                {USAGE_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Effective from</span>
              <input
                type="date"
                value={monthInputValue(form.effective_from)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effective_from: toIsoOrNull(e.target.value) }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Effective to</span>
              <input
                type="date"
                value={monthInputValue(form.effective_to)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effective_to: toIsoOrNull(e.target.value) }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="accent-teal-600"
            />
            Active
          </label>
          {saveMutation.error ? (
            <p className="text-sm text-rose-600">{extractAdminError(saveMutation.error).message}</p>
          ) : null}
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!disableId}
        title="Disable cost item?"
        description="Soft-disables this catalog item so it no longer contributes to finance COGS."
        danger
        confirmLabel="Disable"
        loading={disableMutation.isPending}
        onCancel={() => setDisableId(null)}
        onConfirm={() => disableId && disableMutation.mutate(disableId)}
      />
    </div>
  );
}

const FinancePage: React.FC = () => {
  const [tab, setTab] = useState<FinanceTab>('overview');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Revenue, COGS, net profit, credit mapping, LLM rates, and infrastructure cost catalog."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['overview', 'P&L overview'],
            ['credits', 'Credits'],
            ['llm-rates', 'LLM rates'],
            ['cost-catalog', 'Cost catalog'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <FinanceOverviewTab /> : null}
      {tab === 'credits' ? <CreditsTab /> : null}
      {tab === 'llm-rates' ? <LlmRatesTab /> : null}
      {tab === 'cost-catalog' ? <CostCatalogTab /> : null}
    </div>
  );
};

export default FinancePage;
