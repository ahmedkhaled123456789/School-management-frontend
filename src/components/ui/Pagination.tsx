import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  resultCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}

export function Pagination({
  page,
  limit,
  total,
  resultCount,
  hasNext,
  hasPrevious,
  onPageChange,
  isFetching
}: PaginationProps) {
  const from = resultCount === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + resultCount;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
      
      <p className="text-[13px] text-ink-500">
        Showing <span className="font-semibold text-ink-700">{from}</span>–
        <span className="font-semibold text-ink-700">{to}</span>
        {total > 0 &&
        <>
            {' '}
            of <span className="font-semibold text-ink-700">{total}</span>
          </>
        }
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrevious || isFetching}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          icon={<ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
          
          Previous
        </Button>
        <span className="px-1 text-[13px] font-semibold text-ink-600">Page {page}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext || isFetching}
          onClick={() => onPageChange(page + 1)}>
          
          Next
          <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>);

}