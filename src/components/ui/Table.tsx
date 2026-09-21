import React from 'react';
import { cn } from '../../utils/cn';
import { Skeleton } from './Skeleton';
import { EmptyState, ErrorState } from './States';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  skeletonRows?: number;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  skeletonRows = 6,
  caption
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (!isLoading && rows.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />);

  }

  return (
    <div className="scrollbar-thin relative w-full overflow-x-auto">
      {isFetching && !isLoading &&
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary-100">
          <div className="h-full w-1/3 animate-[shimmer_1.1s_linear_infinite] bg-primary-500" />
        </div>
      }
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/70">
            {columns.map((column) =>
            <th
              key={column.key}
              scope="col"
              className={cn(
                'whitespace-nowrap px-4 py-3 text-[11.5px] font-bold uppercase tracking-wider text-ink-500',
                column.align === 'right' && 'text-right',
                column.className
              )}>
              
                {column.header}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {isLoading ?
          Array.from({ length: skeletonRows }).map((_, rowIndex) =>
          <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) =>
            <td key={column.key} className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-full max-w-[140px]" />
                    </td>
            )}
                </tr>
          ) :
          rows.map((row) =>
          <tr key={rowKey(row)} className="transition-colors hover:bg-primary-50/40">
                  {columns.map((column) =>
            <td
              key={column.key}
              className={cn(
                'px-4 py-3.5 align-middle text-ink-700',
                column.align === 'right' && 'text-right',
                column.className
              )}>
              
                      {column.render(row)}
                    </td>
            )}
                </tr>
          )}
        </tbody>
      </table>
    </div>);

}