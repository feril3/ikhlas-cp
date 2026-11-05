import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconCalendarEvent,
  IconClipboardCheck,
  IconClock
} from '@/components/icons.jsx';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah, toInputDate } from '@/lib/format.js';
import { useAuth } from '@/auth/AuthContext.jsx';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { useApprovalCounts } from '@/features/approvals/ApprovalCountsContext.jsx';
import { PwaSetupCard } from '@/features/pwa/AppPreferences.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const chartConfig = {
  income: { label: 'Kas masuk', color: 'var(--chart-1)' },
  expense: { label: 'Kas keluar', color: 'var(--chart-2)' }
};

function formatAxisAmount(value) {
  const number = Number(value ?? 0);
  const compact = (amount) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount);
  if (Math.abs(number) >= 1_000_000_000) return `${compact(number / 1_000_000_000)} M`;
  if (Math.abs(number) >= 1_000_000) return `${compact(number / 1_000_000)} jt`;
  if (Math.abs(number) >= 1_000) return `${compact(number / 1_000)} rb`;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number);
}

function CashflowDot({ cx, cy, payload, dataKey, color }) {
  if (!payload || Number(payload[dataKey] ?? 0) <= 0) return null;
  return <circle cx={cx} cy={cy} r="3" fill={color} stroke="var(--card)" strokeWidth="1.5" />;
}

function Metric({ label, value, caption, tone }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 px-5 py-3.5 sm:block sm:py-5">
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        {caption && <div className="hidden text-xs text-subtle-foreground sm:block">{caption}</div>}
      </div>
      <div className={`shrink-0 text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl ${tone === 'income' ? 'text-success' : tone === 'expense' ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

// Tugas yang menunggu: pengajuan untuk Ketua/Admin, revisi untuk Bendahara.
function PendingTask({ role }) {
  const { pendingReview, revisionRequired } = useApprovalCounts();
  const count = role === 'ADMIN' ? pendingReview : revisionRequired;
  if (!count) return null;
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <IconClipboardCheck className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-md font-semibold tracking-tight">
          {role === 'ADMIN' ? `${count} pengajuan menunggu review Anda` : `${count} pengajuan perlu Anda perbaiki`}
        </p>
        <p className="text-sm text-muted-foreground">
          {role === 'ADMIN' ? 'Transaksi Bendahara baru masuk saldo setelah Anda setujui.' : 'Baca catatan Ketua, perbaiki, lalu kirim ulang.'}
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link to="/approvals">{role === 'ADMIN' ? 'Review' : 'Perbaiki'}</Link>
      </Button>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[360px] w-full rounded-2xl" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
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
    <div className="flex flex-col gap-4">
      <PageHeader
        meta={dateLabel}
        title={`Assalamu'alaikum, ${user?.name?.split(' ')[0] ?? 'Pengurus'}`}
        actions={canCreateTransactions ? (
          <div className="hidden gap-2 lg:flex">
            <Button variant="secondary" asChild>
              <Link to="/transactions/income"><IconArrowDown /> Catat kas masuk</Link>
            </Button>
            <Button asChild>
              <Link to="/transactions/expense"><IconArrowUp /> Catat kas keluar</Link>
            </Button>
          </div>
        ) : null}
      />

      <PendingTask role={user?.role} />
      <PwaSetupCard />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Beranda gagal dimuat</AlertTitle>
          <AlertDescription>{error} Muat ulang halaman, atau coba lagi beberapa saat lagi.</AlertDescription>
        </Alert>
      ) : (
        <>
          <section aria-label="Ringkasan kas" className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
            <Card className="flex flex-col justify-between gap-4 p-5">
              <div>
                <div className="text-sm text-muted-foreground">Saldo saat ini</div>
                <div className="mt-1 break-words text-4xl font-bold tracking-tight tabular-nums">{formatRupiah(data.summary.currentBalance)}</div>
              </div>
              <div className="text-xs text-subtle-foreground">Saldo awal {formatRupiah(data.summary.openingBalance)} ditambah kas masuk, dikurangi kas keluar yang disetujui.</div>
            </Card>
            <Card className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Metric label="Kas masuk bulan ini" value={`+${formatRupiah(data.monthSummary.totalIncome)}`} tone="income" caption={`${data.monthSummary.transactionCount} transaksi`} />
              <Metric label="Kas keluar bulan ini" value={`-${formatRupiah(data.monthSummary.totalExpense)}`} tone="expense" caption={`Sampai ${formatDate(data.monthSummary.to, { day: 'numeric', month: 'long' })}`} />
              <Metric label="Saldo awal" value={formatRupiah(data.summary.openingBalance)} caption="Dasar perhitungan kas" />
            </Card>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Arus kas 30 hari terakhir</CardTitle>
                  <CardDescription>Kas masuk dan kas keluar per hari.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/reports">Laporan <IconArrowUpRight /></Link>
                </Button>
              </CardHeader>
              <CardContent className="px-2 sm:px-5">
                <ChartContainer config={chartConfig} className="h-[260px] min-h-[240px]">
                  <AreaChart data={data.cashflow} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                      minTickGap={28}
                      tick={{ fontSize: 11, fill: 'var(--subtle-foreground)' }}
                      tickFormatter={(value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))}
                    />
                    <YAxis
                      width={48}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11, fill: 'var(--subtle-foreground)' }}
                      tickFormatter={formatAxisAmount}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value) => formatRupiah(value)}
                      />}
                    />
                    <Area type="monotone" dataKey="income" stroke="var(--color-income)" strokeWidth={2} fill="url(#incomeFill)" dot={(props) => <CashflowDot {...props} dataKey="income" color="var(--color-income)" />} activeDot={{ r: 4 }} isAnimationActive={false} />
                    <Area type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2} fill="url(#expenseFill)" dot={(props) => <CashflowDot {...props} dataKey="expense" color="var(--color-expense)" />} activeDot={{ r: 4 }} isAnimationActive={false} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center gap-2"><IconClock className="text-muted-foreground" /> Jadwal salat hari ini</CardTitle>
                  <CardDescription>{data.prayerHijriDate?.formatted ?? data.prayerScheduleDate}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {data.prayerSchedule.map((item) => {
                      const next = nextPrayer?.prayerName === item.prayerName;
                      return (
                        <li key={item.prayerName} className="flex items-center gap-3 py-2.5">
                          <span className={`min-w-0 flex-1 text-sm ${next ? 'font-semibold' : ''}`}>{item.prayerName}</span>
                          {next && <Badge variant="success">Berikutnya</Badge>}
                          <time className={`text-sm tabular-nums ${next ? 'font-semibold' : 'text-muted-foreground'}`}>{item.adhanTime}</time>
                        </li>
                      );
                    })}
                  </ul>
                  {!data.prayerSchedule.length && <p className="py-5 text-sm text-muted-foreground">Jadwal salat belum tersedia. Coba muat ulang nanti.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
                  <CardTitle className="flex items-center gap-2"><IconCalendarEvent className="text-muted-foreground" /> Agenda terdekat</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/schedule">Kelola</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {activities.map((item) => (
                      <li className="flex gap-3 py-2.5" key={item.id}>
                        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent">
                          <span className="text-md font-bold leading-none tabular-nums">{item.activityDate.slice(-2)}</span>
                          <span className="mt-0.5 text-2xs text-muted-foreground">{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${item.activityDate}T00:00:00`))}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.startTime || 'Waktu fleksibel'}{item.speaker ? ` · ${item.speaker}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!activities.length && <p className="py-4 text-sm text-muted-foreground">Belum ada agenda mendatang.</p>}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Transaksi terbaru</CardTitle>
                <CardDescription>Enam pencatatan kas terakhir.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transactions">Lihat semua <IconArrowUpRight /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border md:hidden">
                {data.recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{transaction.category}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.transactionDate)} · {transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{formatRupiah(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(transaction.transactionDate)}</TableCell>
                        <TableCell>
                          <span className="block font-medium">{transaction.category}</span>
                          {transaction.sourceDetail && <span className="block max-w-[220px] truncate text-xs text-muted-foreground">{transaction.sourceDetail}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'INCOME' ? 'success' : 'destructive'}>
                            {transaction.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-success' : 'text-destructive'}`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}{formatRupiah(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {!data.recentTransactions.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">Belum ada transaksi. Catat kas masuk atau kas keluar pertama dari tombol di atas.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
