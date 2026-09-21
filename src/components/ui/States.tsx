import React from 'react';
import { AlertTriangleIcon, InboxIcon, LockIcon, RefreshCwIcon, ServerCogIcon } from 'lucide-react';
import { errorMessage } from '../../api/client';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className






}: {title: string;description?: string;action?: React.ReactNode;icon?: React.ReactNode;className?: string;}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        {icon ?? <InboxIcon className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>);

}

export function ErrorState({
  error,
  onRetry,
  className




}: {error: unknown;onRetry?: () => void;className?: string;}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-500">
        <AlertTriangleIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-bold text-ink-900">We couldn&apos;t load this data</h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-500">{errorMessage(error)}</p>
      {onRetry &&
      <Button
        variant="secondary"
        size="sm"
        className="mt-5"
        onClick={onRetry}
        icon={<RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
        
          Try again
        </Button>
      }
    </div>);

}

export function UnauthorizedState({
  message = 'You do not have access to this area with your current role.',
  action



}: {message?: string;action?: React.ReactNode;}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warn-50 text-warn-500">
        <LockIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-bold text-ink-900">Access restricted</h1>
      <p className="mt-1 max-w-md text-sm text-ink-500">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>);

}

/**
 * Renders wherever the UI depends on an endpoint the backend has not shipped.
 * Never replace this with an invented API call.
 */
export function BackendRequired({
  feature,
  endpoint,
  detail,
  className





}: {feature: string;endpoint?: string;detail?: string;className?: string;}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-warn-500/40 bg-warn-50/60 p-5',
        className
      )}>
      
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warn-100 text-warn-500">
          <ServerCogIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-warn-500">
            Backend required
          </p>
          <h3 className="mt-1 text-[14px] font-bold text-ink-900">{feature}</h3>
          {detail && <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{detail}</p>}
          {endpoint &&
          <code className="mt-2 inline-block rounded-md bg-white px-2 py-1 font-mono text-[12px] text-ink-700 ring-1 ring-inset ring-ink-200">
              {endpoint}
            </code>
          }
        </div>
      </div>
    </div>);

}