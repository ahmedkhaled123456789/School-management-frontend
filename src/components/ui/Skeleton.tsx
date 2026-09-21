import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className }: {className?: string;}) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-md bg-ink-100', className)} />);


}

export function SkeletonText({ lines = 3, className }: {lines?: number;className?: string;}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) =>
      <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      )}
    </div>);

}

export function SkeletonCards({ count = 4 }: {count?: number;}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) =>
      <div key={index} className="rounded-xl border border-ink-200/80 bg-white p-5 shadow-card">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-16" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      )}
    </div>);

}