import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Star } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ErrorState, LoadingBlock } from '../components/ui/EmptyState';
import { feedbackApi } from '../services/admin';
import { extractAdminError } from '../services/adminApiClient';
import type { FeedbackRead } from '../types/admin';
import { formatDate, formatNumber, truncate } from '../utils/format';

const FeedbackPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FeedbackRead | null>(null);

  const stats = useQuery({
    queryKey: ['admin', 'feedback', 'stats'],
    queryFn: () => feedbackApi.stats(),
  });

  const query = useQuery({
    queryKey: ['admin', 'feedback', { page }],
    queryFn: () => feedbackApi.list({ page, page_size: 20 }),
  });

  if (stats.isLoading && query.isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <PageHeader title="Feedback" description="Triage product feedback and ratings." />

      {stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total feedback"
            value={formatNumber(stats.data.total_feedback)}
            icon={MessageSquare}
            tone="teal"
          />
          <StatCard
            title="Avg rating"
            value={stats.data.average_rating?.toFixed(1) ?? '—'}
            icon={Star}
            tone="amber"
          />
          <StatCard
            title="Last 7 days"
            value={formatNumber(stats.data.recent_feedback_count)}
            icon={MessageSquare}
            tone="sky"
          />
          <div className="card-static p-5">
            <p className="text-sm font-medium text-slate-500">By type</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(stats.data.feedback_by_type || {}).map(([type, count]) => (
                <StatusBadge key={type} variant="neutral">
                  {type}: {count}
                </StatusBadge>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {query.error ? (
        <ErrorState message={extractAdminError(query.error).message} onRetry={() => query.refetch()} />
      ) : (
        <div className="card-static overflow-hidden">
          <DataTable
            data={query.data?.items ?? []}
            loading={query.isLoading}
            emptyTitle="No feedback yet"
            rowKey={(f) => f.id}
            onRowClick={setSelected}
            columns={[
              {
                header: 'Type',
                accessor: (f) => <StatusBadge variant="info">{f.feedback_type}</StatusBadge>,
              },
              { header: 'Question', accessor: (f) => truncate(f.question, 60) },
              {
                header: 'Rating',
                accessor: (f) => (f.rating != null ? `${f.rating}/5` : '—'),
              },
              { header: 'Created', accessor: (f) => formatDate(f.created_at) },
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
        open={!!selected}
        title="Feedback detail"
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Question</p>
              <p className="mt-1 whitespace-pre-wrap">{selected.question}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Response</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{selected.response}</p>
            </div>
            <p>
              <span className="text-slate-500">User:</span> {selected.user_id}
            </p>
            <p>
              <span className="text-slate-500">Rating:</span>{' '}
              {selected.rating != null ? selected.rating : '—'}
            </p>
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
};

export default FeedbackPage;
