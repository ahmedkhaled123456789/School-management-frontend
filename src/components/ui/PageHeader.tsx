import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: {items: Crumb[];}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-500">
        {items.map((item, index) =>
        <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.to && index !== items.length - 1 ?
          <Link to={item.to} className="hover:text-primary-600 hover:underline">
                {item.label}
              </Link> :

          <span className={index === items.length - 1 ? 'font-semibold text-ink-700' : ''}>
                {item.label}
              </span>
          }
            {index < items.length - 1 &&
          <ChevronRightIcon className="h-3 w-3 text-ink-300" aria-hidden="true" />
          }
          </li>
        )}
      </ol>
    </nav>);

}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 &&
      <div className="mb-2">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      }
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 sm:text-[26px]">
            {title}
          </h1>
          {description &&
          <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">{description}</p>
          }
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>);

}