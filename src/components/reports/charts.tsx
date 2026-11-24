import React, { useMemo, useRef, useState } from 'react';
import { DownloadIcon, Table2Icon, BarChart3Icon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { cn } from '../../utils/cn';
import { downloadCsv, type CsvRow } from '../../utils/reports';
import { SERIES, STATUS } from '../../lib/vizColors';

/*
 * Small chart kit for the reports pages, following the data-viz rules:
 * thin marks (<= 24px, 4px rounded data end, square at the baseline),
 * 2px surface gaps, hairline recessive grid, text never in series colors,
 * a legend for >= 2 series, selective labels, a hover/focus tooltip on
 * every mark, and a table view + CSV for every chart (relief rule).
 */


export interface Datum {
  label: string;
  value: number;
  /** override color (status data); defaults to series 1 */
  color?: string;
  /** extra tooltip line */
  hint?: string;
}

const fmtNumber = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

/* ------------------------------- tooltip ---------------------------------- */

interface TipState {x: number;y: number;value: string;label: string;hint?: string;}

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (event: React.MouseEvent | React.FocusEvent, content: Omit<TipState, 'x' | 'y'>) => {
    const box = ref.current?.getBoundingClientRect();
    const target = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box) return;
    const x = 'clientX' in event ? event.clientX - box.left : target.left - box.left + target.width / 2;
    const y = 'clientY' in event ? event.clientY - box.top : target.top - box.top;
    setTip({ x, y, ...content });
  };
  const hide = () => setTip(null);
  const node = tip &&
  <div
    role="tooltip"
    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 py-2 text-[12px] shadow-pop"
    style={{ left: tip.x, top: tip.y }}>

      {/* value leads, label follows */}
      <p className="font-mono text-[13px] font-bold text-ink-900">{tip.value}</p>
      <p dir="auto" className="text-ink-600">{tip.label}</p>
      {tip.hint && <p className="text-ink-500">{tip.hint}</p>}
    </div>;

  return { ref, show, hide, node };
}

/* ------------------------------- chart card -------------------------------- */

interface ChartCardProps {
  title: string;
  description?: string;
  /** rows for the table view and the CSV export */
  table: {columns: string[];rows: CsvRow[];};
  csvName: string;
  isLoading?: boolean;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  children: React.ReactNode;
}

/** Card with a chart / table toggle and CSV export. */
export function ChartCard({ title, description, table, csvName, isLoading, empty, emptyText = 'No data for this selection.', className, children }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn('break-inside-avoid', className)}>
      <CardHeader
        title={title}
        description={description}
        action={
        <div className="flex gap-1 print:hidden">
            <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-ink-600 hover:bg-ink-100">

              {asTable ? <BarChart3Icon className="h-3.5 w-3.5" aria-hidden="true" /> : <Table2Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {asTable ? 'Chart' : 'Table'}
            </button>
            <button
            type="button"
            disabled={!table.rows.length}
            onClick={() => downloadCsv(csvName, table.columns, table.rows)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-40">

              <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />CSV
            </button>
          </div>
        } />

      <CardBody>
        {isLoading ?
        <SkeletonText lines={5} /> :
        empty ?
        <p className="py-6 text-center text-[13px] text-ink-500">{emptyText}</p> :
        asTable ?
        <div className="scrollbar-thin max-h-80 overflow-auto">
            <table className="w-full text-start text-[13px]">
              <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wider text-ink-500">
                <tr>{table.columns.map((c, i) => <th key={c} className={cn('border-b border-ink-100 py-1.5', i ? 'text-end' : 'text-start')}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) =>
              <tr key={r} className="border-b border-ink-50">
                    {row.map((cell, i) => <td key={i} dir={i ? undefined : 'auto'} className={cn('py-1.5', i ? 'text-end font-mono' : 'text-ink-800')}>{typeof cell === 'number' ? fmtNumber(cell) : cell}</td>)}
                  </tr>
              )}
              </tbody>
            </table>
          </div> :
        children}
      </CardBody>
    </Card>);

}

/* -------------------------------- KPI tile --------------------------------- */

/** A headline number (no chart needed). `tone` only for real status meaning, always with a label. */
export function Kpi({ label, value, sub, tone }: {label: string;value: string;sub?: string;tone?: keyof typeof STATUS;}) {
  return (
    <div className="rounded-xl border border-ink-200/80 bg-white px-4 py-3.5 shadow-card">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 break-words font-mono text-[22px] font-extrabold text-ink-900">{value}</p>
      {sub &&
      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-500">
          {tone && <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[tone] }} aria-hidden="true" />}
          {sub}
        </p>
      }
    </div>);

}

/* -------------------------------- bar list --------------------------------- */

/** Horizontal bars: magnitude per category, value at the tip. One series => one hue, no legend. */
export function BarList({ data, format = fmtNumber, max: fixedMax, sort = true }: {data: Datum[];format?: (n: number) => string;max?: number;sort?: boolean;}) {
  const tip = useTooltip();
  const rows = useMemo(() => sort ? [...data].sort((a, b) => b.value - a.value) : data, [data, sort]);
  const max = fixedMax ?? Math.max(...rows.map((d) => d.value), 0);
  return (
    <div ref={tip.ref} className="relative space-y-1.5" onMouseLeave={tip.hide}>
      {rows.map((d) =>
      <div
        key={d.label}
        tabIndex={0}
        aria-label={`${d.label}: ${format(d.value)}`}
        onMouseMove={(e) => tip.show(e, { value: format(d.value), label: d.label, hint: d.hint })}
        onFocus={(e) => tip.show(e, { value: format(d.value), label: d.label, hint: d.hint })}
        onBlur={tip.hide}
        className="group grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-3 rounded-md py-0.5 outline-none focus-visible:bg-ink-50">

          <span dir="auto" className="truncate text-[12.5px] text-ink-700" title={d.label}>{d.label}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative h-3.5 min-w-[40px] flex-1">
              <span
              className="absolute inset-y-0 start-0 rounded-e-[4px] transition-[filter] group-hover:brightness-110"
              style={{ width: `${max ? Math.max(d.value / max * 100, d.value ? 1.5 : 0) : 0}%`, background: d.color ?? SERIES[0] }} />

            </span>
            <span className="shrink-0 whitespace-nowrap text-end font-mono text-[12px] text-ink-800">{format(d.value)}</span>
          </span>
        </div>
      )}
      {tip.node}
    </div>);

}

/* ------------------------------ stacked bar -------------------------------- */

/** Composition of a whole (<= 4 parts): one bar, 2px gaps, legend with values. */
export function StackedBar({ data, format = fmtNumber }: {data: Datum[];format?: (n: number) => string;}) {
  const tip = useTooltip();
  const total = data.reduce((s, d) => s + d.value, 0);
  const parts = data.filter((d) => d.value > 0);
  const pct = (v: number) => total ? `${Math.round(v / total * 100)}%` : '0%';
  return (
    <div ref={tip.ref} className="relative" onMouseLeave={tip.hide}>
      <div className="flex h-5 w-full gap-[2px]" role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)} (${pct(d.value)})`).join(', ')}>
        {total === 0 ?
        <span className="h-full w-full rounded-e-[4px]" style={{ background: 'var(--viz-track)' }} /> :
        parts.map((d, i) =>
        <span
          key={d.label}
          tabIndex={0}
          onMouseMove={(e) => tip.show(e, { value: `${format(d.value)} · ${pct(d.value)}`, label: d.label, hint: d.hint })}
          onFocus={(e) => tip.show(e, { value: `${format(d.value)} · ${pct(d.value)}`, label: d.label, hint: d.hint })}
          onBlur={tip.hide}
          className={cn('h-full outline-none transition-[filter] hover:brightness-110 focus-visible:brightness-110', i === parts.length - 1 && 'rounded-e-[4px]')}
          style={{ width: `${d.value / total * 100}%`, minWidth: 3, background: d.color ?? SERIES[i % SERIES.length] }} />

        )}
      </div>
      {/* legend: always present for >= 2 parts, values included */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
        {data.map((d, i) =>
        <li key={d.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color ?? SERIES[i % SERIES.length] }} aria-hidden="true" />
            <span dir="auto" className="text-ink-600">{d.label}</span>
            <span className="font-mono font-semibold text-ink-900">{format(d.value)}</span>
            <span className="text-ink-400">{pct(d.value)}</span>
          </li>
        )}
      </ul>
      {tip.node}
    </div>);

}

/* ------------------------------ column chart ------------------------------- */

/** Round a max up to a clean axis value (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  return (steps.find((s) => s * exp >= value) ?? 10) * exp;
}
const compact = (n: number) => n >= 1_000_000 ? `${fmtNumber(n / 1_000_000)}M` : n >= 10_000 ? `${fmtNumber(n / 1000)}K` : fmtNumber(n);

/** Columns over time (one series): hairline grid, 4px rounded caps, label on the peak only. */
export function ColumnChart({ data, format = fmtNumber, height = 168 }: {data: Datum[];format?: (n: number) => string;height?: number;}) {
  const tip = useTooltip();
  const counts = data.every((d) => Number.isInteger(d.value));
  const top = Math.max(...data.map((d) => d.value), 0);
  // counts never get fractional ticks (0 / 0.5 / 1 students)
  const max = counts && top <= 4 ? Math.max(top, 2) % 2 ? Math.max(top, 2) + 1 : Math.max(top, 2) : niceMax(top);
  const peak = data.reduce((best, d, i) => d.value > (data[best]?.value ?? -1) ? i : best, 0);
  // counts: drop the middle tick when it would be a fraction (e.g. 2.5 changes)
  const ticks = counts && !Number.isInteger(max / 2) ? [0, max] : [0, max / 2, max];
  // thin out x labels so they never collide (labels are ~6 characters)
  const every = Math.max(1, Math.ceil(data.length / 6));
  return (
    <div ref={tip.ref} className="relative pt-5" onMouseLeave={tip.hide}>
      <div className="flex gap-2">
        <div className="relative w-10 shrink-0 text-end font-mono text-[11px] text-ink-400" style={{ height }}>
          {ticks.map((t) =>
          <span key={t} className="absolute end-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>{compact(t)}</span>
          )}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((t) =>
          <span key={t} className="absolute inset-x-0 h-px" style={{ top: `${(1 - t / max) * 100}%`, background: 'var(--viz-grid)' }} aria-hidden="true" />
          )}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) =>
            <div
              key={d.label}
              tabIndex={0}
              aria-label={`${d.label}: ${format(d.value)}`}
              onMouseMove={(e) => tip.show(e, { value: format(d.value), label: d.label, hint: d.hint })}
              onFocus={(e) => tip.show(e, { value: format(d.value), label: d.label, hint: d.hint })}
              onBlur={tip.hide}
              className="group relative flex h-full flex-1 items-end justify-center outline-none">

                {i === peak && d.value > 0 &&
              <span className="absolute -translate-y-full pb-0.5 font-mono text-[11px] font-semibold text-ink-700" style={{ bottom: `${d.value / max * 100}%` }}>{compact(d.value)}</span>
              }
                <span
                className="w-full max-w-[24px] rounded-t-[4px] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                style={{ height: `${d.value / max * 100}%`, minHeight: d.value ? 2 : 0, background: d.color ?? SERIES[0] }} />

              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ms-12 mt-1.5 flex h-4 gap-[2px]">
        {data.map((d, i) =>
        <span key={d.label} className="relative flex-1 text-[10.5px] text-ink-500">
            {i % every === 0 && <span className="absolute start-1/2 -translate-x-1/2 whitespace-nowrap rtl:translate-x-1/2">{d.label}</span>}
          </span>
        )}
      </div>
      {tip.node}
    </div>);

}
