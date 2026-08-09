import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleDollarSign,
  CloudUpload,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/EmptyState';
import { plansApi, pricingApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type {
  AdminPlanCreate,
  PlanResponse,
  PlanTier,
  StripePublishResponse,
  StripeSyncResponse,
} from '../types/admin';
import { formatCreditsLimit, tokensToCreditsLimit } from '../utils/credits';
import { formatCurrency, formatNumber } from '../utils/format';

const FEATURE_OPTIONS = [
  'basic_charts',
  'export_csv',
  'ai_insights',
  'custom_dashboards',
  'api_access',
  'priority_support',
  'advanced_charts',
  'team_collaboration',
  'audit_logs',
  'sso',
  'custom_integrations',
  'dedicated_support',
  'sla',
] as const;

const LIMIT_FIELDS = [
  ['monthly_query_limit', 'Monthly queries'],
  ['monthly_llm_token_limit', 'Monthly LLM tokens'],
  ['monthly_rows_scanned_limit', 'Monthly rows scanned'],
  ['monthly_chart_renders_limit', 'Monthly chart renders'],
  ['max_datasets', 'Max datasets'],
  ['max_workspaces', 'Max workspaces'],
  ['max_members_per_workspace', 'Members per workspace'],
] as const;

function createEmptyForm(): AdminPlanCreate {
  return {
    name: '',
    tier: 'free',
    description: '',
    monthly_query_limit: 100,
    monthly_llm_token_limit: 50_000,
    monthly_rows_scanned_limit: 100_000,
    monthly_chart_renders_limit: 50,
    max_datasets: 3,
    max_workspaces: 1,
    max_members_per_workspace: 1,
    features: {},
    price_monthly: 0,
    price_yearly: 0,
    compare_at_price_monthly: null,
    compare_at_price_yearly: null,
    discount_label: null,
    stripe_product_id: null,
    stripe_price_monthly_id: null,
    stripe_price_yearly_id: null,
    is_active: true,
    publish_to_stripe: false,
  };
}

function planToForm(plan: PlanResponse): AdminPlanCreate {
  return {
    name: plan.name,
    tier: plan.tier,
    description: plan.description || '',
    ...plan.limits,
    features: { ...plan.features },
    price_monthly: plan.price_monthly,
    price_yearly: plan.price_yearly,
    compare_at_price_monthly: plan.compare_at_price_monthly ?? null,
    compare_at_price_yearly: plan.compare_at_price_yearly ?? null,
    discount_label: plan.discount_label ?? null,
    stripe_product_id: plan.stripe_product_id || null,
    stripe_price_monthly_id: plan.stripe_price_monthly_id || null,
    stripe_price_yearly_id: plan.stripe_price_yearly_id || null,
    is_active: plan.is_active,
    publish_to_stripe: false,
  };
}

function stripeLinkState(plan: PlanResponse): 'linked' | 'partial' | 'none' {
  const ids = [
    plan.stripe_product_id,
    plan.stripe_price_monthly_id,
    plan.stripe_price_yearly_id,
  ].filter(Boolean).length;
  if (ids === 3) return 'linked';
  if (ids > 0) return 'partial';
  return 'none';
}

function stripeLinkLabel(state: ReturnType<typeof stripeLinkState>): string {
  if (state === 'linked') return 'Linked';
  if (state === 'partial') return 'Partial';
  return 'Not linked';
}

function stripeLinkVariant(
  state: ReturnType<typeof stripeLinkState>,
): 'success' | 'warning' | 'neutral' {
  if (state === 'linked') return 'success';
  if (state === 'partial') return 'warning';
  return 'neutral';
}

/** Display cents as a dollar amount for inputs (1500 → "15", 1550 → "15.5"). */
function centsToDollarInput(cents?: number | null): string {
  if (cents == null || Number.isNaN(cents)) return '';
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return String(dollars);
  return dollars.toFixed(2).replace(/\.?0+$/, '');
}

/** Parse a dollar input into integer cents. Empty → null. */
function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Parse a required dollar price; empty/invalid → 0 cents. */
function parseRequiredDollarsToCents(value: string): number {
  return parseDollarsToCents(value) ?? 0;
}

function DollarAmountInput({
  label,
  cents,
  optional = false,
  placeholder,
  helper,
  onCentsChange,
}: {
  label: string;
  cents: number | null | undefined;
  optional?: boolean;
  placeholder?: string;
  helper?: string;
  onCentsChange: (cents: number | null) => void;
}) {
  const [draft, setDraft] = useState(() => centsToDollarInput(cents));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(centsToDollarInput(cents));
    }
  }, [cents, focused]);

  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          $
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder={placeholder}
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (optional) {
              const parsed = parseDollarsToCents(draft);
              onCentsChange(parsed);
              setDraft(centsToDollarInput(parsed));
            } else {
              const parsed = parseRequiredDollarsToCents(draft);
              onCentsChange(parsed);
              setDraft(centsToDollarInput(parsed));
            }
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (optional) {
              if (next.trim() === '') {
                onCentsChange(null);
                return;
              }
              const parsed = parseDollarsToCents(next);
              if (parsed != null) onCentsChange(parsed);
            } else {
              const parsed = parseDollarsToCents(next);
              if (parsed != null) onCentsChange(parsed);
            }
          }}
          className="w-full rounded-xl border border-slate-200 py-2 pl-7 pr-3 outline-none focus:border-teal-500"
        />
      </div>
      {helper ? <span className="mt-1 block text-xs text-slate-400">{helper}</span> : null}
    </label>
  );
}

function previewDiscountPercent(compareAt?: number | null, price = 0): number | null {
  if (compareAt == null || compareAt <= 0 || price < 0 || compareAt <= price) return null;
  return Math.round(((compareAt - price) * 100) / compareAt);
}

const PlansPage: React.FC = () => {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<PlanResponse | null>(null);
  const [form, setForm] = useState<AdminPlanCreate>(createEmptyForm);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);
  const [publishResult, setPublishResult] = useState<StripePublishResponse | null>(null);
  const [syncResult, setSyncResult] = useState<StripeSyncResponse | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => plansApi.list(),
  });
  const creditsQuery = useQuery({
    queryKey: ['admin', 'pricing', 'credits'],
    queryFn: () => pricingApi.getCredits(),
  });

  const invalidatePlans = async (planId?: string) => {
    await qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
    if (planId) {
      await qc.invalidateQueries({ queryKey: ['admin', 'plans', planId] });
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditing(null);
  };

  const createMutation = useMutation({
    mutationFn: () => plansApi.create(form),
    onSuccess: async () => {
      await invalidatePlans();
      closePanel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => plansApi.update(editing!.id, form),
    onSuccess: async (plan) => {
      await invalidatePlans(plan.id);
      closePanel();
    },
  });

  const publishMutation = useMutation({
    mutationFn: (planId: string) => plansApi.publishToStripe(planId),
    onSuccess: async (result) => {
      setPublishResult(result);
      setConfirmPublish(false);
      await invalidatePlans(result.plan_id);
      const refreshed = await plansApi.get(result.plan_id);
      setEditing(refreshed);
      setForm(planToForm(refreshed));
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => plansApi.syncFromStripe(),
    onSuccess: async (result) => {
      setSyncResult(result);
      setConfirmSync(false);
      await invalidatePlans();
      if (editing) {
        const refreshed = await plansApi.get(editing.id);
        setEditing(refreshed);
        setForm(planToForm(refreshed));
      }
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setPanelOpen(true);
  };

  const openEdit = (plan: PlanResponse) => {
    setEditing(plan);
    setForm(planToForm(plan));
    setPanelOpen(true);
  };

  const setNumber = (key: keyof AdminPlanCreate, value: string) => {
    setForm((current) => ({ ...current, [key]: Number(value) }));
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const actionError = publishMutation.error || syncMutation.error;
  const invalidDiscount =
    (form.compare_at_price_monthly != null &&
      form.compare_at_price_monthly < (form.price_monthly ?? 0)) ||
    (form.compare_at_price_yearly != null &&
      form.compare_at_price_yearly < (form.price_yearly ?? 0));

  const saveLabel = (() => {
    if (pending) return 'Saving…';
    if (editing) return form.publish_to_stripe ? 'Save & publish' : 'Save changes';
    return form.publish_to_stripe ? 'Create & publish' : 'Create plan';
  })();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plans"
        description="Manage limits, features, pricing, and publish catalog changes to Stripe."
        actions={
          <>
            <button
              type="button"
              onClick={() => setConfirmSync(true)}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync from Stripe
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> New plan
            </button>
          </>
        }
      />

      {actionError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {extractAdminError(actionError).message}
        </p>
      ) : null}

      {publishResult ? (
        <div className="card-static space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Published {publishResult.name} to Stripe
              </h3>
              <p className="mt-1 text-xs text-slate-500">{publishResult.note}</p>
            </div>
            <button
              type="button"
              onClick={() => setPublishResult(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <StatusBadge variant="accent">Product {publishResult.product_action}</StatusBadge>
            <span className="font-mono text-xs text-slate-500">
              {publishResult.stripe_product_id || 'No product ID'}
            </span>
          </div>
          <div className="space-y-2">
            {publishResult.prices.map((price) => (
              <div
                key={`${price.interval}-${price.price_id || price.previous_price_id || price.action}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium capitalize text-slate-800">{price.interval}</span>
                  <StatusBadge variant="info">{price.action}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(price.unit_amount / 100)} ·{' '}
                  <span className="font-mono">{price.price_id || '—'}</span>
                  {price.previous_price_id && price.previous_price_id !== price.price_id ? (
                    <>
                      {' '}
                      (was <span className="font-mono">{price.previous_price_id}</span>)
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {syncResult ? (
        <div className="card-static space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Stripe catalog sync</h3>
              <p className="mt-1 text-xs text-slate-500">
                Synced {syncResult.synced} · Skipped {syncResult.skipped} · Products seen{' '}
                {syncResult.stripe_products_seen}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSyncResult(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {syncResult.plans.map((plan) => (
              <div
                key={`${plan.plan_id || plan.tier}-${plan.action}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {plan.name} ({plan.tier})
                  </span>
                  <StatusBadge variant="info">{plan.action}</StatusBadge>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {plan.stripe_product_id || '—'} · {plan.stripe_price_monthly_id || '—'} ·{' '}
                  {plan.stripe_price_yearly_id || '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(plan.price_monthly / 100)}/mo ·{' '}
                  {formatCurrency(plan.price_yearly / 100)}/yr
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data ?? []}
            loading={query.isLoading}
            emptyTitle="No plans"
            rowKey={(plan) => plan.id}
            onRowClick={openEdit}
            columns={[
              {
                header: 'Plan',
                accessor: (plan) => (
                  <div>
                    <p className="font-medium text-slate-900">{plan.name}</p>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                      {plan.description || 'No description'}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Tier',
                accessor: (plan) => <StatusBadge variant="accent">{plan.tier}</StatusBadge>,
              },
              {
                header: 'Queries / mo',
                accessor: (plan) => formatNumber(plan.limits.monthly_query_limit),
              },
              {
                header: 'Price',
                accessor: (plan) => (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(plan.price_monthly / 100)}/mo
                      </span>
                      {plan.discount_percent_monthly != null ? (
                        <StatusBadge variant="accent">-{plan.discount_percent_monthly}%</StatusBadge>
                      ) : null}
                    </div>
                    {plan.compare_at_price_monthly != null ? (
                      <p className="text-xs text-slate-400 line-through">
                        {formatCurrency(plan.compare_at_price_monthly / 100)}/mo
                      </p>
                    ) : null}
                    {plan.discount_label ? (
                      <p className="mt-0.5 text-xs text-teal-700">{plan.discount_label}</p>
                    ) : null}
                  </div>
                ),
              },
              {
                header: 'Stripe',
                accessor: (plan) => {
                  const state = stripeLinkState(plan);
                  return (
                    <StatusBadge variant={stripeLinkVariant(state)}>
                      {stripeLinkLabel(state)}
                    </StatusBadge>
                  );
                },
              },
              {
                header: 'Status',
                accessor: (plan) => (
                  <StatusBadge variant={plan.is_active ? 'success' : 'neutral'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                ),
              },
            ]}
          />
        </div>
      )}

      <DetailPanel
        open={panelOpen}
        title={editing ? `Edit ${editing.name}` : 'Create plan'}
        subtitle={
          editing
            ? 'Changes affect future billing and usage enforcement.'
            : 'Configure a new billing tier.'
        }
        widthClass="max-w-2xl"
        onClose={closePanel}
        footer={
          <div className="space-y-2">
            {editing ? (
              <button
                type="button"
                onClick={() => setConfirmPublish(true)}
                disabled={publishMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
              >
                <CloudUpload className="h-4 w-4" />
                {publishMutation.isPending ? 'Publishing…' : 'Publish to Stripe'}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!form.name.trim() || pending || invalidDiscount}
              onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}
              className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        }
      >
        <div className="space-y-7">
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Basics</h3>
            <p className="mt-1 text-xs text-slate-500">Customer-facing identity and availability.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Tier</span>
                <select
                  value={form.tier}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tier: event.target.value as PlanTier }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="team">Team</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-slate-600">Description</span>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  aria-label="Active plan"
                  checked={!!form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  className="h-4 w-4 accent-teal-600"
                />
                <span>
                  <span className="block font-medium text-slate-800">Active plan</span>
                  <span className="text-xs text-slate-500">
                    Available for assignment and self-serve billing.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Usage limits</h3>
            <p className="mt-1 text-xs text-slate-500">Use -1 for an unlimited resource.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {LIMIT_FIELDS.map(([key, label]) => {
                const creditEq =
                  key === 'monthly_llm_token_limit'
                    ? tokensToCreditsLimit(
                        form.monthly_llm_token_limit,
                        creditsQuery.data?.tokens_per_credit,
                      )
                    : null;
                return (
                  <label key={key} className="text-sm">
                    <span className="mb-1 block text-slate-600">{label}</span>
                    <input
                      type="number"
                      min={-1}
                      value={form[key] ?? 0}
                      onChange={(event) => setNumber(key, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
                    />
                    {creditEq != null ? (
                      <span className="mt-1 block text-xs text-slate-400">
                        ≈ {formatCreditsLimit(creditEq)} credits/month
                        {creditsQuery.data?.tokens_per_credit
                          ? ` (${creditsQuery.data.tokens_per_credit.toLocaleString()} tokens/credit)`
                          : ''}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Features</h3>
            <p className="mt-1 text-xs text-slate-500">Capabilities enabled for this plan.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {FEATURE_OPTIONS.map((feature) => {
                const enabled = !!form.features?.[feature];
                return (
                  <label
                    key={feature}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                      enabled
                        ? 'border-teal-200 bg-teal-50 text-teal-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          features: {
                            ...current.features,
                            [feature]: event.target.checked,
                          },
                        }))
                      }
                      className="sr-only"
                    />
                    <CheckCircle2 className={`h-4 w-4 ${enabled ? 'text-teal-600' : 'text-slate-300'}`} />
                    <span>{feature.replaceAll('_', ' ')}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
            </div>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Changing a published amount creates a <strong>new</strong> Stripe Price and archives
              the previous one for new checkouts. Existing Stripe subscribers keep billing on the
              old Price and are not migrated or prorated.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DollarAmountInput
                key={`${editing?.id ?? 'new'}-price_monthly`}
                label="Monthly price (USD)"
                cents={form.price_monthly ?? 0}
                placeholder="15"
                helper={`Charged as ${formatCurrency((form.price_monthly ?? 0) / 100)}`}
                onCentsChange={(next) =>
                  setForm((current) => ({ ...current, price_monthly: next ?? 0 }))
                }
              />
              <DollarAmountInput
                key={`${editing?.id ?? 'new'}-price_yearly`}
                label="Yearly price (USD)"
                cents={form.price_yearly ?? 0}
                placeholder="150"
                helper={`Charged as ${formatCurrency((form.price_yearly ?? 0) / 100)}`}
                onCentsChange={(next) =>
                  setForm((current) => ({ ...current, price_yearly: next ?? 0 }))
                }
              />
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Display discount</h3>
            <p className="mt-1 text-xs text-slate-500">
              Marketing-only strikethrough pricing. Stripe still charges the amounts above.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DollarAmountInput
                key={`${editing?.id ?? 'new'}-compare_monthly`}
                label="Compare-at monthly (USD)"
                cents={form.compare_at_price_monthly}
                optional
                placeholder="Leave blank to clear"
                helper={
                  form.compare_at_price_monthly != null
                    ? `${formatCurrency(form.compare_at_price_monthly / 100)} list · ${
                        previewDiscountPercent(
                          form.compare_at_price_monthly,
                          form.price_monthly ?? 0,
                        ) ?? 0
                      }% off`
                    : 'No monthly list price'
                }
                onCentsChange={(next) =>
                  setForm((current) => ({ ...current, compare_at_price_monthly: next }))
                }
              />
              <DollarAmountInput
                key={`${editing?.id ?? 'new'}-compare_yearly`}
                label="Compare-at yearly (USD)"
                cents={form.compare_at_price_yearly}
                optional
                placeholder="Leave blank to clear"
                helper={
                  form.compare_at_price_yearly != null
                    ? `${formatCurrency(form.compare_at_price_yearly / 100)} list · ${
                        previewDiscountPercent(
                          form.compare_at_price_yearly,
                          form.price_yearly ?? 0,
                        ) ?? 0
                      }% off`
                    : 'No yearly list price'
                }
                onCentsChange={(next) =>
                  setForm((current) => ({ ...current, compare_at_price_yearly: next }))
                }
              />
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-slate-600">Discount label</span>
                <input
                  value={form.discount_label || ''}
                  placeholder='e.g. "Launch special" or "20% off"'
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_label: event.target.value || null,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500"
                />
              </label>
            </div>
            {editing &&
            (editing.discount_percent_monthly != null ||
              editing.discount_percent_yearly != null) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {editing.discount_percent_monthly != null ? (
                  <StatusBadge variant="accent">
                    Monthly {editing.discount_percent_monthly}% off
                  </StatusBadge>
                ) : null}
                {editing.discount_percent_yearly != null ? (
                  <StatusBadge variant="accent">
                    Yearly {editing.discount_percent_yearly}% off
                  </StatusBadge>
                ) : null}
              </div>
            ) : null}
            {(form.compare_at_price_monthly != null &&
              form.compare_at_price_monthly < (form.price_monthly ?? 0)) ||
            (form.compare_at_price_yearly != null &&
              form.compare_at_price_yearly < (form.price_yearly ?? 0)) ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Compare-at prices must be greater than or equal to the charged price.
              </p>
            ) : null}
          </section>

          <section className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Stripe publishing</h3>
            <p className="mt-1 text-xs text-slate-500">
              Prefer publishing from this dashboard. Manual Stripe IDs are usually unnecessary.
            </p>
            <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                aria-label="Publish changes to Stripe"
                checked={!!form.publish_to_stripe}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    publish_to_stripe: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-teal-600"
              />
              <span>
                <span className="block font-medium text-slate-800">Publish changes to Stripe</span>
                <span className="text-xs text-slate-500">
                  Creates or updates the Stripe Product/Prices when you save.
                </span>
              </span>
            </label>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked Stripe IDs
              </p>
              {(
                [
                  ['Product', form.stripe_product_id],
                  ['Monthly price', form.stripe_price_monthly_id],
                  ['Yearly price', form.stripe_price_yearly_id],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="text-sm">
                  <span className="text-slate-500">{label}: </span>
                  <span className="font-mono text-xs text-slate-800">{value || '—'}</span>
                </div>
              ))}
            </div>
          </section>

          {mutationError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {extractAdminError(mutationError).message}
            </p>
          ) : null}
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={confirmPublish}
        title="Publish this plan to Stripe?"
        description="Creates or updates the Stripe Product and Prices for this plan. Price amount changes archive old Prices for new checkouts; existing subscribers keep their current Price."
        confirmLabel="Publish to Stripe"
        loading={publishMutation.isPending}
        onCancel={() => setConfirmPublish(false)}
        onConfirm={() => editing && publishMutation.mutate(editing.id)}
      />

      <ConfirmDialog
        open={confirmSync}
        title="Sync plans from Stripe?"
        description="Pulls Stripe Products/Prices and updates local plan Stripe IDs and amounts. Matching uses metadata.tier when present, otherwise product name."
        confirmLabel="Sync from Stripe"
        loading={syncMutation.isPending}
        onCancel={() => setConfirmSync(false)}
        onConfirm={() => syncMutation.mutate()}
      />
    </div>
  );
};

export default PlansPage;
