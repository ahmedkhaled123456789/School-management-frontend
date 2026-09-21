import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warn' | 'info' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  success: 'bg-success-50 text-success-600 ring-success-100',
  danger: 'bg-danger-50 text-danger-600 ring-danger-100',
  warn: 'bg-warn-50 text-warn-500 ring-warn-100',
  info: 'bg-primary-50 text-primary-700 ring-primary-100',
  accent: 'bg-accent-50 text-accent-500 ring-accent-100'
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({ tone = 'neutral', children, className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONES[tone],
        className
      )}>
      
      {icon}
      {children}
    </span>);

}