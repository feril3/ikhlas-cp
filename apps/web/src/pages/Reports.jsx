import { useEffect, useMemo, useState } from 'react';
import {
  IconCalendarStats,
  IconDownload,
  IconTrendingDown,
  IconTrendingUp,
  IconWallet
} from '@tabler/icons-react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah, toInputDate } from '@/lib/format.js';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const cashflowConfig = {
  income: { label: 'Kas masuk', color: 'var(--ui-chart-1)' },
  expense: { label: 'Kas keluar', color: 'var(--ui-chart-2)' }
};

const categoryConfig = {
  total: { label: 'Total', color: 'var(--ui-chart-1)' }
};

function firstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`;
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return toInputDate(value);
}

function formatAxisAmount(value) {
  const number = Number(value ?? 0);
  const compact = (amount) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount);
  if (Math.abs(number) >= 1_000_000_000) return `${compact(number / 1_000_000_000)} M`;
  if (Math.abs(number) >= 1_000_000) return `${compact(number / 1_000_000)} jt`;
  if (Math.abs(number) >= 1_000) return `${compact(number / 1_000)} rb`;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number);
}

function Metric({ icon: Icon, label, value, tone = 'default', caption }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-4" stroke={1.8} />
        {label}
      </div>
      <strong className={`mt-2 block truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl ${tone === 'income' ? 'text-primary' : tone === 'expense' ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </strong>
      {caption && <span className="mt-1 block text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    </div>
  );
}

export default function Reports() {
  const today = toInputDate();
  const [range, setRange] = useState({ from: firstDayOfMonth(today), to: today });
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load(nextRange = range) {
    setData(null);
    setStatus({ type: 'idle', message: '' });
    try {
      setData(await api.reportSummary(nextRange.from, nextRange.to));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function downloadCsv() {
    setStatus({ type: 'loading', message: 'Menyiapkan CSV...' });
    try {
      await api.downloadTransactionsCsv(range.from, range.to);
      setStatus({ type: 'success', message: 'CSV berhasil diunduh.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function applyPreset(preset) {
    let next;
    if (preset === '30d') next = { from: shiftDate(today, -29), to: today };
    else if (preset === '90d') next = { from: shiftDate(today, -89), to: today };
    else next = { from: firstDayOfMonth(today), to: today };
    setRange(next);
    load(next);
  }

  const categoryData = useMemo(
    () => (data?.categories ?? []).slice(0, 8).map((item) => ({ ...item, total: Number(item.total) })),
    [data]
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Laporan Keuangan"
        description="Analisis kas per periode dengan arus harian dan distribusi kategori yang tetap bisa diverifikasi dari angka dasarnya."
        actions={(
          <Button variant="outline" onClick={downloadCsv} disabled={status.type === 'loading'}>
            <IconDownload data-icon="inline-start" /> Unduh CSV
          </Button>
        )}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Dari tanggal
              <Input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Sampai tanggal
              <Input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
            </label>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/55 p-1 md:col-span-2 xl:col-span-1">
              <Button variant="ghost" size="sm" onClick={() => applyPreset('month')}>Bulan ini</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset('30d')}>30 hari</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset('90d')}>90 hari</Button>
              <Button onClick={() => load()}>Terapkan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {status.message && (
        <Alert variant={status.type === 'error' ? 'destructive' : status.type === 'success' ? 'success' : 'default'}>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {!data && status.type !== 'error' && <ReportSkeleton />}

      {data && (
        <>
          <Card className="overflow-hidden">
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-[1fr_1fr_1fr_1.15fr]">
              <Metric icon={IconWallet} label="Saldo awal periode" value={formatRupiah(data.summary.openingBalance)} caption={formatDate(data.summary.from)} />
              <Metric icon={IconTrendingUp} label="Kas masuk" value={`+${formatRupiah(data.summary.totalIncome)}`} tone="income" caption={`${data.summary.transactionCount} transaksi total`} />
              <Metric icon={IconTrendingDown} label="Kas keluar" value={`-${formatRupiah(data.summary.totalExpense)}`} tone="expense" caption={`Net ${formatRupiah(data.summary.netChange)}`} />
              <Metric icon={IconCalendarStats} label="Saldo akhir periode" value={formatRupiah(data.summary.closingBalance)} caption={formatDate(data.summary.to)} />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader className="border-b bg-muted/25">
                <CardTitle>Arus kas periode</CardTitle>
                <CardDescription>Kas masuk dan keluar per hari pada rentang yang dipilih.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={cashflowConfig} className="h-[290px] min-h-[270px]">
                  <BarChart data={data.cashflow} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ui-border)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                      tickMargin={10}
                      tickFormatter={(value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))}
                    />
                    <YAxis width={54} axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={formatAxisAmount} />
                    <ChartTooltip
                      content={<ChartTooltipContent
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value) => formatRupiah(value)}
                      />}
                    />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="border-b bg-muted/25">
                <CardTitle>Distribusi kategori</CardTitle>
                <CardDescription>Delapan kategori dengan nominal terbesar pada periode ini.</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length ? (
                  <ChartContainer config={categoryConfig} className="h-[290px] min-h-[270px]">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--ui-border)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={formatAxisAmount} />
                      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 11 }} />
                      <ChartTooltip
                        content={<ChartTooltipContent
                          labelFormatter={(value) => value}
                          formatter={(value) => formatRupiah(value)}
                        />}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                        {categoryData.map((item) => (
                          <Cell key={`${item.type}-${item.category}`} fill={item.type === 'INCOME' ? 'var(--ui-chart-1)' : 'var(--ui-chart-2)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Rincian kategori</CardTitle>
                <CardDescription>Nilai numerik tetap tersedia untuk verifikasi di balik visualisasi.</CardDescription>
              </div>
              <Badge variant="outline">{data.summary.transactionCount} transaksi</Badge>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Transaksi</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categories.map((item) => (
                    <TableRow key={`${item.type}-${item.category}`}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'INCOME' ? 'success' : 'destructive'}>
                          {item.type === 'INCOME' ? 'Kas Masuk' : 'Kas Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.transactionCount}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${item.type === 'INCOME' ? 'text-primary' : 'text-destructive'}`}>
                        {formatRupiah(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!data.categories.length && <div className="py-10 text-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</div>}
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription>
              Rekap ini ditujukan untuk monitoring kas operasional. Penyajian laporan formal entitas nonlaba tetap mengikuti kebijakan akuntansi organisasi dan standar yang berlaku.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
