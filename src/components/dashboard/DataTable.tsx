import React from 'react';
import { EmptyState, LoadingBlock } from '../ui/EmptyState';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  rowKey?: (item: T, index: number) => string;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  emptyTitle = 'No data',
  emptyDescription,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingBlock />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
          <tr className="border-b border-slate-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, rowIndex) => (
            <tr
              key={rowKey ? rowKey(item, rowIndex) : rowIndex}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-teal-50/40' : 'hover:bg-slate-50/80'
              }`}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`px-4 py-3.5 text-sm text-slate-700 ${col.className ?? ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : (item[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
