import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRightIcon, CircleCheckIcon, InfoIcon, Link2Icon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { MODULE_LIST, MODULES, roundPartner, type ModuleId } from '../lib/modules';
import type { Role } from '../types/common';
import { cn } from '../utils/cn';

const PORTAL_LABEL: Record<Role, string> = {
  admin: 'Administration',
  teacher: 'Teachers',
  student: 'Students',
  parent: 'Parents'
};

/**
 * Stand-in page for a planned module: what it will do, which portals get it,
 * what it connects to and when it is delivered.
 */
export function ModulePlaceholder({ module: moduleId, page }: {module: ModuleId;page?: string;}) {
  const { pathname } = useLocation();
  const role = pathname.split('/')[1] as Role;
  const info = MODULES[moduleId];
  const partner = roundPartner(moduleId);
  const title = page ?? info.title;
  const Icon = info.icon;
  const rounds = [...new Set(MODULE_LIST.map((m) => m.round))];

  return (
    <div>
      <PageHeader
        title={title}
        description={info.summary}
        breadcrumbs={[
        { label: PORTAL_LABEL[role] ?? 'Home', to: `/${role}` },
        ...(page && page !== info.title ? [{ label: info.title }] : []),
        { label: title }]
        } />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-4 border-b border-ink-100 px-5 py-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-bold text-ink-900">{info.title}</h2>
                  <Badge tone="accent">Coming soon</Badge>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  Delivery round {info.round}
                  {partner && <> · built together with <span className="font-semibold text-ink-700">{partner.title}</span></>}
                </p>
              </div>
            </div>
            <CardBody>
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">What it will do</h3>
              <ul className="mt-3 space-y-2.5">
                {info.features.map((feature) =>
                <li key={feature} className="flex gap-2.5 text-[13.5px] text-ink-700">
                    <CircleCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                )}
              </ul>
              {info.notes?.map((note) =>
              <p key={note} className="mt-4 flex gap-2 rounded-lg border border-warn-100 bg-warn-50 px-3 py-2.5 text-[12.5px] text-ink-700">
                  <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-warn-500" aria-hidden="true" />
                  <span>{note}</span>
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Connected to" description="Existing parts of the system this module uses or feeds." />
            <CardBody className="flex flex-wrap gap-2">
              {info.connects.map((link) => {
                const linkable = role === 'admin' && link.to;
                return linkable ?
                <Link
                  key={link.label}
                  to={link.to as string}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-700">
                    {link.label}
                    <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link> :

                <span
                  key={link.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-500">
                    <Link2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </span>;

              })}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Who gets what" />
            <CardBody>
              <dl className="space-y-3">
                {(Object.keys(PORTAL_LABEL) as Role[]).filter((r) => info.portals[r]).map((r) =>
                <div key={r} className={cn('rounded-lg px-3 py-2', r === role ? 'bg-primary-50 ring-1 ring-inset ring-primary-100' : 'bg-ink-50')}>
                    <dt className="text-[12px] font-bold uppercase tracking-wide text-ink-500">
                      {PORTAL_LABEL[r]}{r === role && ' (you)'}
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-ink-700">{info.portals[r]}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Roadmap" description="Two modules per round." />
            <CardBody>
              <ol className="space-y-3">
                {rounds.map((round) =>
                <li key={round} className="flex gap-3">
                    <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold',
                      round === info.round ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500'
                    )}>
                      {round}
                    </span>
                    <span className="text-[13px] leading-6 text-ink-700">
                      {MODULE_LIST.filter((m) => m.round === round).map((m) =>
                    <span key={m.id} className={cn(m.id === moduleId && 'font-bold text-ink-900')}>
                          {m.title}
                        </span>
                    ).reduce<ReactNode[]>((acc, el, i) => i ? [...acc, ' + ', el] : [el], [])}
                    </span>
                  </li>
                )}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>);

}
