import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Receipt, TrendingUp, X } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { Pagination } from '../components/ui/Pagination';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge, statusVariant } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState } from '../components/ui/EmptyState';
import { billingAdminApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { AdminBillingEvent } from '../types/admin';
import { formatCurrency, formatDate, truncate, useDebouncedValue } from '../utils/format';

type Tab = 'events' | 'subscriptions';

const EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

const EVENT_STATUSES = ['processed', 'failed', 'received', 'ignored', 'duplicate'];
const SUB_STATUSES = ['active', 'trial', 'past_due', 'cancelled', 'expired'];

function eventStatusVariant(status: string) {
  if (status === 'processed') return 'success' as const;
  if (status === 'failed') return 'danger' as const;
  if (status === 'received') return 'warning' as const;
  return 'neutral' as const;
}

function amountLabel(e: AdminBillingEvent): string {
  if (e.amount_cents == null) return '—';
  const value = formatCurrency(e.amount_cents / 100);
  return e.currency && e.currency.toLowerCase() !== 'usd'
    ? `${value} ${e.currency.toUpperCase()}`
    : value;
}

const BillingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get('user_id') || '';

  const [tab, setTab] = useState<Tab>('events');
  const [eventsPage, setEventsPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AdminBillingEvent | null>(null);

  const [subsPage, setSubsPage] = useState(1);
  const [subStatus, setSubStatus] = useState('');
  const [subSearch, setSubSearch] = useState('');

  const debouncedEventSearch = useDebouncedValue(eventSearch);
  const debouncedSubSearch = useDebouncedValue(subSearch);

  const summary = useQuery({
    queryKey: ['admin', 'billing', 'summary'],
    queryFn: () => billingAdminApi.summary(),
  });

  const events = useQuery({
    queryKey: [
      'admin',
      'billing',
      'events',
      { eventsPage, eventType, eventStatus, q: debouncedEventSearch, userIdFilter },
    ],
    queryFn: () =>
      billingAdminApi.listEvents({
        page: eventsPage,
        page_size: 20,
        event_type: eventType || undefined,
        status: eventStatus || undefined,
        q: debouncedEventSearch || undefined,
        user_id: userIdFilter || undefined,
      }),
    enabled: tab === 'events',
  });

  const subscriptions = useQuery({
    queryKey: ['admin', 'billing', 'subscriptions', { subsPage, subStatus, q: debouncedSubSearch }],
    queryFn: () =>
      billingAdminApi.listSubscriptions({
        page: subsPage,
        page_size: 20,
        status: subStatus || undefined,
        q: debouncedSubSearch || undefined,
      }),
    enabled: tab === 'subscriptions',
  });

  const s = summary.data;
  const activeSubs = s?.subscriptions_by_status?.active ?? 0;
  const trialSubs = s?.subscriptions_by_status?.trial ?? 0;
  const pastDueSubs = s?.subscriptions_by_status?.past_due ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Trace Stripe transactions and subscriptions without leaving the dashboard."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Est. MRR"
          value={formatCurrency((s?.estimated_mrr_cents ?? 0) / 100)}
          subtitle="Active subscriptions, yearly normalized"
          icon={TrendingUp}
          tone="teal"
        />
        <StatCard
          title="Active subs"
          value={activeSubs}
          subtitle={`${trialSubs} trial · ${pastDueSubs} past due`}
          icon={CreditCard}
          tone="sky"
          delay={0.05}
        />
        <StatCard
          title="Events (24h)"
          value={s?.events_last_24h ?? 0}
          subtitle={`${s?.events_last_7d ?? 0} in the last 7 days`}
          icon={Receipt}
          tone="slate"
          delay={0.1}
        />
        <StatCard
          title="Failed events (7d)"
          value={s?.failed_events_last_7d ?? 0}
          icon={AlertTriangle}
          tone={s && s.failed_events_last_7d > 0 ? 'rose' : 'slate'}
          delay={0.15}
        />
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {(
          [
            ['events', 'Transactions'],
            ['subscriptions', 'Subscriptions'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <div>
          <FilterBar
            search={eventSearch}
            onSearchChange={(v) => {
              setEventSearch(v);
              setEventsPage(1);
            }}
            searchPlaceholder="Event, customer, invoice id or email…"
          >
            {userIdFilter ? (
              <button
                type="button"
                onClick={() => {
                  searchParams.delete('user_id');
                  setSearchParams(searchParams, { replace: true });
                  setEventsPage(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100"
              >
                User: {truncate(userIdFilter, 8)} <X className="h-3 w-3" />
              </button>
            ) : null}
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setEventsPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={eventStatus}
              onChange={(e) => {
                setEventStatus(e.target.value);
                setEventsPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {EVENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </FilterBar>

          {events.error ? (
            <ErrorState
              message={extractAdminError(events.error).message}
              onRetry={() => events.refetch()}
            />
          ) : (
            <div className="card-static overflow-hidden">
              <DataTable
                data={events.data?.items ?? []}
                loading={events.isLoading}
                emptyTitle="No billing events"
                emptyDescription="Stripe webhook deliveries will appear here as they arrive."
                rowKey={(e) => e.id}
                onRowClick={setSelectedEvent}
                columns={[
                  { header: 'Received', accessor: (e) => formatDate(e.created_at) },
                  {
                    header: 'Type',
                    accessor: (e) => <span className="font-mono text-xs">{e.event_type}</span>,
                  },
                  {
                    header: 'Status',
                    accessor: (e) => (
                      <StatusBadge variant={eventStatusVariant(e.status)}>{e.status}</StatusBadge>
                    ),
                  },
                  {
                    header: 'User',
                    accessor: (e) =>
                      e.user_id ? (
                        <Link
                          to={`/users/${e.user_id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="font-medium text-slate-900 hover:text-teal-700"
                        >
                          {e.user_email || truncate(e.user_id, 12)}
                        </Link>
                      ) : (
                        <span className="text-slate-400">{e.stripe_customer_id || '—'}</span>
                      ),
                  },
                  { header: 'Amount', accessor: (e) => amountLabel(e) },
                ]}
              />
              {events.data ? (
                <Pagination
                  page={events.data.page}
                  totalPages={events.data.total_pages}
                  totalItems={events.data.total_items}
                  hasNext={events.data.has_next}
                  hasPrevious={events.data.has_previous}
                  onPageChange={setEventsPage}
                />
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div>
          <FilterBar
            search={subSearch}
            onSearchChange={(v) => {
              setSubSearch(v);
              setSubsPage(1);
            }}
            searchPlaceholder="Subscriber email…"
          >
            <select
              value={subStatus}
              onChange={(e) => {
                setSubStatus(e.target.value);
                setSubsPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {SUB_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </FilterBar>

          {subscriptions.error ? (
            <ErrorState
              message={extractAdminError(subscriptions.error).message}
              onRetry={() => subscriptions.refetch()}
            />
          ) : (
            <div className="card-static overflow-hidden">
              <DataTable
                data={subscriptions.data?.items ?? []}
                loading={subscriptions.isLoading}
                emptyTitle="No subscriptions"
                rowKey={(row) => row.id}
                columns={[
                  {
                    header: 'Subscriber',
                    accessor: (row) =>
                      row.user_id ? (
                        <Link
                          to={`/users/${row.user_id}`}
                          className="font-medium text-slate-900 hover:text-teal-700"
                        >
                          {row.user_email || truncate(row.user_id, 12)}
                        </Link>
                      ) : (
                        row.workspace_name || '—'
                      ),
                  },
                  {
                    header: 'Plan',
                    accessor: (row) => (
                      <span>
                        {row.plan_name || '—'}
                        {row.plan_tier ? (
                          <span className="ml-1.5 text-xs text-slate-400">({row.plan_tier})</span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    header: 'Status',
                    accessor: (row) => (
                      <StatusBadge variant={statusVariant(row.status)}>{row.status}</StatusBadge>
                    ),
                  },
                  {
                    header: 'Amount',
                    accessor: (row) =>
                      row.unit_amount_cents != null
                        ? `${formatCurrency(row.unit_amount_cents / 100)}${
                            row.billing_interval ? ` / ${row.billing_interval}` : ''
                          }`
                        : '—',
                  },
                  { header: 'Cycle ends', accessor: (row) => formatDate(row.billing_cycle_end) },
                  { header: 'Started', accessor: (row) => formatDate(row.started_at) },
                ]}
              />
              {subscriptions.data ? (
                <Pagination
                  page={subscriptions.data.page}
                  totalPages={subscriptions.data.total_pages}
                  totalItems={subscriptions.data.total_items}
                  hasNext={subscriptions.data.has_next}
                  hasPrevious={subscriptions.data.has_previous}
                  onPageChange={setSubsPage}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      <DetailPanel
        open={!!selectedEvent}
        title="Billing event"
        subtitle={selectedEvent?.stripe_event_id || selectedEvent?.id}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent ? (
          <div className="space-y-4 text-sm">
            <dl className="space-y-3">
              {(
                [
                  ['Type', selectedEvent.event_type],
                  ['Status', selectedEvent.status],
                  ['User', selectedEvent.user_email || selectedEvent.user_id],
                  ['Stripe customer', selectedEvent.stripe_customer_id],
                  ['Subscription', selectedEvent.stripe_subscription_id],
                  ['Invoice', selectedEvent.stripe_invoice_id],
                  ['Amount', amountLabel(selectedEvent)],
                  ['Received', formatDate(selectedEvent.created_at)],
                  ['Processed', formatDate(selectedEvent.processed_at)],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 break-all font-medium text-slate-800">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {selectedEvent.error ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-rose-600">Processing error</p>
                <pre className="overflow-auto rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                  {selectedEvent.error}
                </pre>
              </div>
            ) : null}
            {selectedEvent.summary ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Payload summary</p>
                <pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-teal-200">
                  {JSON.stringify(selectedEvent.summary, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
};

export default BillingPage;
