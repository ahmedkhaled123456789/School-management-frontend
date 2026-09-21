import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={cn('rounded-xl border border-ink-200/80 bg-white shadow-card', className)}>
      {children}
    </Tag>);

}

export function CardHeader({
  title,
  description,
  action,
  className





}: {title: React.ReactNode;description?: React.ReactNode;action?: React.ReactNode;className?: string;}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4',
        className
      )}>
      
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      {action}
    </div>);

}

export function CardBody({
  children,
  className



}: {children: React.ReactNode;className?: string;}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}