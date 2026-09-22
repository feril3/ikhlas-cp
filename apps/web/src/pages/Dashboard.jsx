import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconCalendarEvent,
  IconClock,
  IconWallet
} from '@tabler/icons-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah, toInputDate } from '@/lib/format.js';
import { useAuth } from '@/auth/AuthContext.jsx';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const chartConfig = {
  income: { label: 'Kas masuk', color: 'var(--ui-chart-1)' },
  expense: { label: 'Kas keluar', color: 'var(--ui-chart-2)' }
};

function formatAxisAmount(value) {
  const number = Number(value ?? 0);
  const compact = (amount) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount);
  if (Math.abs(number) >= 1_000_000_000) return `${compact(number / 1_000_000_000)} M`;
  if (Math.abs(number) >= 1_000_000) return `${compact(number / 1_000_000)} jt`;
  if (Math.abs(number) >= 1_000) return `${compact(number / 1_000)} rb`;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number);
}

function Metric({ label, value, tone = 'default', caption, featured = false }) {
  const valueClass = tone === 'income'
    ? 'text-primary'
    : tone === 'expense'
      ? 'text-destructive'
      : 'text-foreground';

  return (
    <div className={`min-w-0 px-4 py-4 sm:px-5 ${featured ? 'bg-secondary/65' : ''}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <strong className={`mt-1.5 block truncate text-[clamp(1.25rem,2.5vw,1.8rem)] font-semibold tracking-[-0.035em] ${valueClass}`}>
        {value}
      </strong>
      {caption && <span className="mt-1 block text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-[360px] w-full" />
      </div>
      <Skeleton className="h-[320px] w-full" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const canCreateTransactions = ['ADMIN', 'TREASURER'].includes(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const today = toInputDate();

  useEffect(() => {
    let cancelled = false;
    api.dashboard(today)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${today}T00:00:00`)), [today]);

  if (!data && !error) return <DashboardSkeleton />;

  const currentTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());

  const nextPrayer = data?.prayerSchedule?.find((item) => item.adhanTime > currentTime) ?? null;
  const activities = data?.activities?.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        meta={dateLabel}
        title={`Assalamu'alaikum, ${user?.name?.split(' ')[0] ?? 'Pengurus'}`}
        description="Pantau kondisi kas, transaksi terbaru, jadwal salat, dan agenda masjid dari satu layar."
        actions={canCreateTransactions ? (
          <>
            <Button variant="outline" asChild>
              <Link to="/transactions/income"><IconArrowDown data-icon="inline-start" /> Kas Masuk</Link>
            </Button>
            <Button asChild>
              <Link to="/transactions/expense"><IconArrowUp data-icon="inline-start" /> Kas Keluar</Link>
            </Button>
          </>
        ) : null}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard gagal dimuat</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-[1.15fr_repeat(3,1fr)]">
              <Metric label="Saldo saat ini" value={formatRupiah(data.summary.currentBalance)} caption="Saldo berjalan seluruh periode" featured />
              <Metric label="Kas masuk bulan ini" value={`+${formatRupiah(data.monthSummary.totalIncome)}`} tone="income" caption={`${data.monthSummary.transactionCount} transaksi periode berjalan`} />
              <Metric label="Kas keluar bulan ini" value={`-${formatRupiah(data.monthSummary.totalExpense)}`} tone="expense" caption={`Per ${formatDate(data.monthSummary.to)}`} />
              <Metric label="Saldo awal" value={formatRupiah(data.summary.openingBalance)} caption="Basis perhitungan kas" />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="min-w-0">
              <CardHeader className="flex-row items-start justify-between gap-3 border-b bg-muted/25">
                <div>
                  <CardTitle>Arus kas 30 hari terakhir</CardTitle>
                  <CardDescription>Pergerakan kas masuk dan kas keluar harian.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/reports">Laporan <IconArrowUpRight data-icon="inline-end" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] min-h-[260px]">
                  <AreaChart data={data.cashflow} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.015} />
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ui-border)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                      minTickGap={28}
                      tickFormatter={(value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))}
                    />
                    <YAxis
                      width={54}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatAxisAmount}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value) => formatRupiah(value)}
                      />}
                    />
                    <Area type="monotone" dataKey="income" stroke="var(--color-income)" strokeWidth={2.5} fill="url(#incomeFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    <Area type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2.5} fill="url(#expenseFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2"><IconClock className="size-4 text-primary" /> Jadwal salat hari ini</CardTitle>
                  <CardDescription>{data.prayerHijriDate?.formatted ?? data.prayerScheduleDate}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-0">
                  {data.prayerSchedule.map((item) => (
                    <div
                      key={item.prayerName}
                      className={`flex items-center gap-3 border-b py-2.5 last:border-0 ${nextPrayer?.prayerName === item.prayerName ? 'text-primary' : ''}`}
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium">{item.prayerName}</span>
                      {nextPrayer?.prayerName === item.prayerName && <Badge variant="success">Berikutnya</Badge>}
                      <time className="font-mono text-sm font-semibold tabular-nums">{item.adhanTime}</time>
                    </div>
                  ))}
                  {!data.prayerSchedule.length && <span className="py-5 text-sm text-muted-foreground">Jadwal belum tersedia.</span>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2"><IconCalendarEvent className="size-4 text-primary" /> Agenda terdekat</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-0">
                  {activities.map((item) => (
                    <article className="flex gap-3 border-b py-2.5 last:border-0" key={item.id}>
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <strong className="text-sm leading-none">{item.activityDate.slice(-2)}</strong>
                        <span className="mt-1 text-[9px] font-semibold">{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${item.activityDate}T00:00:00`)).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-medium">{item.title}</strong>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {item.startTime || 'Waktu fleksibel'}{item.speaker ? ` · ${item.speaker}` : ''}
                        </span>
                      </div>
                    </article>
                  ))}
                  {!activities.length && <span className="py-5 text-sm text-muted-foreground">Belum ada agenda mendatang.</span>}
                  <Button variant="link" size="sm" className="mt-2 justify-start" asChild>
                    <Link to="/schedule">Kelola agenda <IconArrowUpRight data-icon="inline-end" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Transaksi terbaru</CardTitle>
                <CardDescription>Enam pencatatan kas terakhir.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transactions">Lihat semua <IconArrowUpRight data-icon="inline-end" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="hidden md:table-cell">Metode</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(transaction.transactionDate)}</TableCell>
                      <TableCell>
                        <strong className="block text-sm font-medium">{transaction.category}</strong>
                        {transaction.sourceDetail && <span className="block max-w-[220px] truncate text-[11px] text-muted-foreground">{transaction.sourceDetail}</span>}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'INCOME' ? 'success' : 'destructive'}>
                          {transaction.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`whitespace-nowrap text-right text-sm font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-primary' : 'text-destructive'}`}>
                        {transaction.type === 'INCOME' ? '+' : '-'}{formatRupiah(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!data.recentTransactions.length && (
                <div className="py-10 text-center text-sm text-muted-foreground">Belum ada transaksi.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
