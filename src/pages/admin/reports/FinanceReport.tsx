import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarList, ChartCard, ColumnChart, Kpi, StackedBar } from '../../../components/reports/charts';
import { STATUS } from '../../../lib/vizColors';
import { useCurrency, useExpenses, useInvoices, useOutstandingReport, usePayments } from '../../../hooks/finance';
import { INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatMoney } from '../../../utils/money';
import { PERIOD_LABEL, bucketKey, countBy, dayKey, inPeriod, percent, periodStart, sumBy, timeBuckets, type Period } from '../../../utils/reports';

// whole invoice list for the aggregates (the API returns everything without a limit)
const ALL = { limit: 0 };

export function FinanceReport({ period }: {period: Period;}) {
  const currency = useCurrency();
  const money = (n: number) => formatMoney(n, currency);
  const start = periodStart(period);
  const invoices = useInvoices(ALL);
  const payments = usePayments({ status: 'valid', from: start ? dayKey(start) : undefined });
  const expenses = useExpenses();
  const outstanding = useOutstandingReport({ overdueOnly: 'true' });

  const live = useMemo(() => (invoices.data?.items ?? []).filter((i) => !i.isCancelled), [invoices.data]);
  const billed = sumBy(live, (i) => i.total);
  const paid = sumBy(live, (i) => i.paid);
  const balance = sumBy(live, (i) => i.balance);
  const validPayments = useMemo(() => payments.data?.items ?? [], [payments.data]);
  const collected = sumBy(validPayments, (p) => p.amount);
  const spentList = useMemo(() => (expenses.data?.items ?? []).filter((e) => inPeriod(e.date, start)), [expenses.data, start]);
  const spent = sumBy(spentList, (e) => Number(e.amount) || 0);

  const collectionsOverTime = useMemo(() => {
    const buckets = timeBuckets(period, validPayments.map((p) => p.paidAt));
    const totals = new Map<string, number>();
    validPayments.forEach((p) => {
      const key = bucketKey(period, p.paidAt);
      totals.set(key, (totals.get(key) ?? 0) + p.amount);
    });
    return buckets.map((b) => ({ label: b.label, value: Math.round((totals.get(b.key) ?? 0) * 100) / 100 }));
  }, [validPayments, period]);

  const expensesOverTime = useMemo(() => {
    const buckets = timeBuckets(period, spentList.map((e) => e.date));
    const totals = new Map<string, number>();
    spentList.forEach((e) => {
      const key = bucketKey(period, e.date);
      totals.set(key, (totals.get(key) ?? 0) + (Number(e.amount) || 0));
    });
    return buckets.map((b) => ({ label: b.label, value: Math.round((totals.get(b.key) ?? 0) * 100) / 100 }));
  }, [spentList, period]);

  const invoiceStatus = useMemo(() => {
    const counts = countBy(live, (i) => i.status);
    return [
    { label: INVOICE_STATUS_LABEL.paid, value: counts.get('paid') ?? 0, color: STATUS.good },
    { label: INVOICE_STATUS_LABEL.partially_paid, value: counts.get('partially_paid') ?? 0, color: STATUS.warning },
    { label: INVOICE_STATUS_LABEL.issued, value: counts.get('issued') ?? 0, color: STATUS.critical }];

  }, [live]);

  const byMethod = useMemo(() => {
    const totals = new Map<string, number>();
    validPayments.forEach((p) => totals.set(p.method, (totals.get(p.method) ?? 0) + p.amount));
    return [...totals.entries()].map(([method, value]) => ({ label: PAYMENT_METHOD_LABEL[method as keyof typeof PAYMENT_METHOD_LABEL] ?? method, value }));
  }, [validPayments]);

  const balanceByLevel = useMemo(() => {
    const totals = new Map<string, {value: number;count: number;}>();
    live.filter((i) => i.balance > 0).forEach((i) => {
      const name = i.classLevel?.name ?? 'Unknown level';
      const row = totals.get(name) ?? { value: 0, count: 0 };
      totals.set(name, { value: row.value + i.balance, count: row.count + 1 });
    });
    return [...totals.entries()].map(([label, r]) => ({ label, value: Math.round(r.value * 100) / 100, hint: `${r.count} invoice(s)` }));
  }, [live]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    spentList.forEach((e) => {
      const key = e.expensesType?.trim() || 'Uncategorised';
      totals.set(key, (totals.get(key) ?? 0) + (Number(e.amount) || 0));
    });
    return [...totals.entries()].map(([label, value]) => ({ label, value }));
  }, [spentList]);

  const periodText = PERIOD_LABEL[period].toLowerCase();

  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Billed" value={money(billed)} sub={`${live.length} live invoice(s)`} />
        <Kpi label="Collection rate" value={`${percent(paid, billed)}%`} sub={`${money(paid)} paid · ${money(balance)} remaining`} tone={billed ? percent(paid, billed) >= 75 ? 'good' : percent(paid, billed) >= 50 ? 'warning' : 'critical' : undefined} />
        <Kpi label="Overdue" value={money(outstanding.data?.totalOverdue ?? 0)} sub={`${outstanding.data?.count ?? 0} student(s) late`} tone={outstanding.data?.totalOverdue ? 'critical' : 'good'} />
        <Kpi label={`Net · ${periodText}`} value={money(collected - spent)} sub={`${money(collected)} in − ${money(spent)} out`} tone={collected - spent >= 0 ? 'good' : 'critical'} />
      </section>

      <p className="text-[12.5px] text-ink-500 print:hidden">
        Detailed lists of late payers and receipts are in <Link to="/admin/finance/reports" className="font-semibold text-primary-600 hover:underline">Finance → Reports</Link>.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title={`Money collected · ${periodText}`}
          description="Valid payments (voided ones excluded)."
          csvName="collections"
          isLoading={payments.isLoading}
          empty={!validPayments.length}
          table={{ columns: ['Period', `Collected (${currency})`], rows: collectionsOverTime.map((d) => [d.label, d.value]) }}>

          <ColumnChart data={collectionsOverTime} format={money} />
        </ChartCard>

        <ChartCard
          title={`Expenses · ${periodText}`}
          csvName="expenses-over-time"
          isLoading={expenses.isLoading}
          empty={!spentList.length}
          table={{ columns: ['Period', `Spent (${currency})`], rows: expensesOverTime.map((d) => [d.label, d.value]) }}>

          <ColumnChart data={expensesOverTime} format={money} />
        </ChartCard>

        <ChartCard
          title="Invoice status"
          description="Live invoices (cancelled ones excluded)."
          csvName="invoice-status"
          isLoading={invoices.isLoading}
          empty={!live.length}
          table={{ columns: ['Status', 'Invoices'], rows: invoiceStatus.map((d) => [d.label, d.value]) }}>

          <StackedBar data={invoiceStatus} />
        </ChartCard>

        <ChartCard
          title={`Collected by method · ${periodText}`}
          csvName="collections-by-method"
          isLoading={payments.isLoading}
          empty={!byMethod.length}
          table={{ columns: ['Method', `Collected (${currency})`], rows: byMethod.map((d) => [d.label, d.value]) }}>

          <BarList data={byMethod} format={money} />
        </ChartCard>

        <ChartCard
          title="Remaining balance by class level"
          description="What is still owed, overdue or not."
          csvName="balance-by-level"
          isLoading={invoices.isLoading}
          empty={!balanceByLevel.length}
          emptyText="Every invoice is fully paid."
          table={{ columns: ['Class level', `Balance (${currency})`], rows: balanceByLevel.map((d) => [d.label, d.value]) }}>

          <BarList data={balanceByLevel} format={money} />
        </ChartCard>

        <ChartCard
          title={`Expenses by category · ${periodText}`}
          csvName="expenses-by-category"
          isLoading={expenses.isLoading}
          empty={!byCategory.length}
          table={{ columns: ['Category', `Spent (${currency})`], rows: byCategory.map((d) => [d.label, d.value]) }}>

          <BarList data={byCategory} format={money} />
        </ChartCard>
      </div>
    </div>);

}
