import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  to?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon,
  to,
  isLoading,
  isUnavailable,
  hint
}: StatCardProps) {
  const content =
  <div
    className={cn(
      'h-full rounded-xl border border-ink-200/80 bg-white p-5 shadow-card transition-colors',
      to && 'hover:border-primary-200 hover:bg-primary-50/30'
    )}>
    
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          {icon}
        </span>
      </div>
      {isLoading ?
    <Skeleton className="mt-4 h-8 w-16" /> :
    isUnavailable ?
    <p className="mt-3 text-[13px] font-semibold text-ink-400">Not available from backend</p> :

    <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-ink-900">
          {value}
        </p>
    }
      {hint && !isLoading && <p className="mt-2 text-[12.5px] text-ink-500">{hint}</p>}
    </div>;


  return to ?
  <Link to={to} className="block h-full">
      {content}
    </Link> :

  content;

}