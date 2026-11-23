import { useState } from 'react';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAuditLogs } from '../../hooks/staff';
import { STAFF_ROLE_LABEL, type StaffRole } from '../../lib/permissions';
import type { AuditLogEntry } from '../../types/staff';
import { formatDateTime } from '../../utils/format';

const PAGE_SIZE = 20;

const ACTION_TONE: Record<AuditLogEntry['action'], BadgeTone> = {
  create: 'success',
  update: 'info',
  delete: 'danger'
};

const ACTION_OPTIONS = [
{ value: 'create', label: 'Create' },
{ value: 'update', label: 'Update' },
{ value: 'delete', label: 'Delete' }];


// first path segment of the API (see middlewares/auditLogger.js)
const ENTITY_OPTIONS = [
'students', 'parents', 'teachers', 'admins', 'staff', 'settings', 'exams', 'questions',
'exam-results', 'class-Level', 'program', 'subjects', 'academics', 'terms', 'year-Groups',
'feesGroup', 'expenses', 'profile'].
map((value) => ({ value, label: value }));

const roleLabel = (role?: string) => STAFF_ROLE_LABEL[role as StaffRole] ?? role ?? '—';

interface Filters {
  action: string;
  entity: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { action: '', entity: '', from: '', to: '' };

export function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [viewing, setViewing] = useState<AuditLogEntry | null>(null);

  const query = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    action: filters.action || undefined,
    entity: filters.entity || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined
  });

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const columns: Array<Column<AuditLogEntry>> = [
  { key: 'time', header: 'When', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
  {
    key: 'actor',
    header: 'Who',
    render: (row) =>
    <div className="min-w-0">
          <p dir="auto" className="truncate font-semibold text-ink-900">{row.actor?.name ?? '—'}</p>
          <p className="text-[12px] text-ink-500">{roleLabel(row.actor?.role)}</p>
        </div>

  },
  { key: 'action', header: 'Action', render: (row) => <Badge tone={ACTION_TONE[row.action]}>{row.action}</Badge> },
  { key: 'entity', header: 'Section', render: (row) => row.entity },
  {
    key: 'path',
    header: 'Request',
    render: (row) => <code className="font-mono text-[12px] text-ink-600">{row.method} {row.path}</code>
  },
  {
    key: 'details',
    header: '',
    align: 'right',
    render: (row) => <Button variant="ghost" size="sm" onClick={() => setViewing(row)}>Details</Button>
  }];


  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Every successful change made in the system: who did it, what changed and when. Passwords and pictures are never stored."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Audit Log' }]} />


      <Card>
        <div className="grid gap-3 border-b border-ink-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Select id="audit-action" label="Action" options={ACTION_OPTIONS} placeholder="All actions" value={filters.action} onChange={(event) => setFilter('action', event.target.value)} />
          <Select id="audit-entity" label="Section" options={ENTITY_OPTIONS} placeholder="All sections" value={filters.entity} onChange={(event) => setFilter('entity', event.target.value)} />
          <Input id="audit-from" label="From" type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
          <Input id="audit-to" label="To" type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />
          <Button variant="secondary" disabled={!hasFilters} onClick={() => {setFilters(EMPTY_FILTERS);setPage(1);}}>
            Clear filters
          </Button>
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          rowKey={(row) => row._id}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyTitle={hasFilters ? 'No entries match these filters' : 'No activity recorded yet'}
          emptyDescription="Changes appear here as soon as someone creates, updates or deletes a record." />

        {(query.data?.total ?? 0) > PAGE_SIZE &&
        <Pagination
          page={page}
          limit={PAGE_SIZE}
          total={query.data?.total ?? 0}
          resultCount={query.data?.items.length ?? 0}
          hasNext={Boolean(query.data?.next)}
          hasPrevious={Boolean(query.data?.previous)}
          onPageChange={setPage}
          isFetching={query.isFetching} />

        }
      </Card>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Change details" size="lg">
        {viewing &&
        <div className="space-y-4 text-[13.5px]">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
            ['When', formatDateTime(viewing.createdAt)],
            ['Who', `${viewing.actor?.name ?? '—'} (${roleLabel(viewing.actor?.role)})`],
            ['Email', viewing.actor?.email ?? '—'],
            ['Action', viewing.action],
            ['Request', `${viewing.method} ${viewing.path}`],
            ['Record id', viewing.entityId ?? '—'],
            ['IP address', viewing.ip ?? '—'],
            ['Status', String(viewing.statusCode ?? '—')]].
            map(([label, value]) =>
            <div key={label} className="min-w-0">
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-ink-800">{value}</dd>
                </div>
            )}
            </dl>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Submitted data</p>
              <pre dir="ltr" className="scrollbar-thin mt-1 max-h-72 overflow-auto rounded-lg bg-ink-50 p-3 font-mono text-[12px] text-ink-800">
                {viewing.changes ? JSON.stringify(viewing.changes, null, 2) : '—'}
              </pre>
            </div>
            {viewing.userAgent && <p className="break-words text-[12px] text-ink-500">{viewing.userAgent}</p>}
          </div>
        }
      </Modal>
    </>);

}
