import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { TriangleAlertIcon } from '@/shared/ui/icon';
import { PageState } from '@/shared/ui/page-state';
import { Progress } from '@/shared/ui/progress';
import { SettingsSection } from '@/shared/ui/settings';
import { isLogUnavailable, statusOptions, trafficOptions, type RouteRow, type SystemStatus, type Traffic, type TrafficRange } from '../api/system';
import { areaOf, bucketLabel, bytesText, countText, durationText, momentText, percentText, shortRoute, uptimeText } from '../model/format';
import { ChartCard, Lines, StackedBars, SURFACE, type Series } from './Charts';

/**
 * Said wherever the records cannot be read: the log store has a problem, the service itself goes on, and since when it
 * fails when the status knows.
 */
export function LogStoreNotice({ since }: { since?: string | null }) {
  return <Alert>
    <TriangleAlertIcon className="text-mark-high" />
    <AlertTitle>로그 저장소에 문제가 있어 기록을 불러오지 못했습니다</AlertTitle>
    <AlertDescription>
      {`서비스는 그대로 동작합니다. 문제가 이어지는 동안의 활동 · 오류 기록은 남지 않습니다.${since ? ` (${momentText(since)}부터)` : ''}`}
    </AlertDescription>
  </Alert>;
}

/**
 * 개요: the server now (always shown, as it does not need the log store), then the chosen range (24 hours by hour, or 7 or
 * 30 days by day) in figures, charts and the busiest and slowest APIs. While the log store fails, the charts give way
 * to a notice saying so.
 */
export function Overview({ range }: { range: TrafficRange }) {
  const status = useQuery(statusOptions());
  const traffic = useQuery(trafficOptions(range));
  const storeDown = status.data ? !status.data.logStore.ok : isLogUnavailable(traffic.error);
  const usage = () => {
    if (isLogUnavailable(traffic.error) && !traffic.data) return <p className="text-sm text-muted-foreground">로그 저장소가 돌아오면 다시 보입니다.</p>;
    if (traffic.isError && !traffic.data) return <PageState kind="error" title="이용 현황을 불러오지 못했습니다" description={traffic.error.message} isCompact
      action={<Button variant="secondary" onClick={() => void traffic.refetch()}>다시 시도</Button>} />;
    if (!traffic.data) return null;
    const t = traffic.data.totals;
    const totals = [
      { label: '요청', value: `${countText(t.requests)}건` },
      { label: '서버 오류(5xx)', value: `${countText(t.serverErrors)}건`, alert: t.serverErrors > 0 },
      { label: '느린 요청', value: `${countText(t.slow)}건` },
      { label: '활동', value: `${countText(t.activities)}건` },
      { label: '활동한 구성원', value: `${t.activeMembers}명` },
    ];
    return <>
      <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1">
        {totals.map(total => <div key={total.label} className="flex items-baseline gap-1">
          <dt className="text-sm text-muted-foreground">{total.label}</dt>
          <dd className={cn('m-0 font-semibold tabular-nums', total.alert && 'text-destructive')}>{total.value}</dd>
        </div>)}
      </dl>
      <TrafficCharts traffic={traffic.data} />
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <RouteList title="가장 많이 부른 API" rows={traffic.data.busiest} measure="count" />
        <RouteList title="가장 느린 API" rows={traffic.data.slowest} measure="time" />
      </div>
    </>;
  };
  return <div className="flex min-w-0 flex-col gap-6 p-6 max-md:p-4">
    {storeDown ? <LogStoreNotice since={status.data?.logStore.failingSince} /> : null}
    {status.isError && !status.data
      ? <PageState kind="error" title="서버 상태를 불러오지 못했습니다" description={status.error.message} isCompact
        action={<Button variant="secondary" onClick={() => void status.refetch()}>다시 시도</Button>} />
      : status.data ? <StatusTiles status={status.data} /> : null}
    <section className="flex flex-col gap-4" aria-label="이용 현황">
      <h2 className="text-sm font-medium text-muted-foreground">이용 현황</h2>
      {usage()}
    </section>
  </div>;
}

type Tile = { key: string; label: string; value: string; unit?: string; note?: string; meter?: number; alert?: boolean };

/**
 * The server now in eight tiles: how long it has run and which release, memory and processor use with a meter, the disk
 * left, the size of the business and log databases, and the log store with its latest weekly copy (red when the store
 * fails or the copy did).
 */
function StatusTiles({ status }: { status: SystemStatus }) {
  const { runtime, disk, logStore, lastBackup } = status;
  const heap = runtime.heapMax > 0 ? runtime.heapUsed / runtime.heapMax : undefined;
  const used = disk.total > 0 ? 1 - disk.free / disk.total : undefined;
  const tiles: Tile[] = [
    { key: 'uptime', label: '가동 시간', value: uptimeText(status.uptimeSeconds), note: `${status.version} · ${momentText(status.startedAt)} 시작` },
    { key: 'memory', label: '메모리', value: bytesText(runtime.heapUsed), unit: `/ ${bytesText(runtime.heapMax)}`, meter: heap },
    { key: 'cpu', label: '프로세서', value: percentText(runtime.processCpu), note: `서버 전체 ${percentText(runtime.systemCpu)} · 코어 ${runtime.processors}개`,
      meter: runtime.processCpu ?? undefined },
    { key: 'disk', label: '디스크 남은 공간', value: bytesText(disk.free), unit: `/ ${bytesText(disk.total)}`, meter: used,
      alert: used !== undefined && used > 0.9 },
    { key: 'db', label: '업무 DB', value: bytesText(status.businessDbBytes) },
    { key: 'logs', label: '로그 DB', value: bytesText(logStore.bytes), note: '30일 보관' },
    { key: 'store', label: '로그 저장', value: logStore.ok ? '정상' : '문제 있음', alert: !logStore.ok,
      note: logStore.lost > 0 ? `시작 후 못 남긴 기록 ${countText(logStore.lost)}건` : '빠진 기록 없음' },
    { key: 'backup', label: '주간 백업', value: lastBackup ? (lastBackup.error ? '실패' : momentText(lastBackup.at)) : '아직 없음', alert: !!lastBackup?.error,
      note: lastBackup?.error ?? (lastBackup?.bytes != null ? `${bytesText(lastBackup.bytes)} · 매주 일요일 새벽` : '매주 일요일 새벽') },
  ];
  return <dl className="m-0 grid grid-cols-4 gap-3 max-md:grid-cols-2">{tiles.map(tile => <div key={tile.key}
    className={cn(SURFACE, 'flex flex-col gap-1', tile.alert && 'border-destructive/45')}>
    <dt className="text-sm text-muted-foreground">{tile.label}</dt>
    <dd className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-1">
      <span className={cn('text-2xl leading-tight font-bold tabular-nums wrap-anywhere max-md:text-base', tile.alert && 'text-destructive')}>{tile.value}</span>
      {tile.unit ? <span className="text-sm whitespace-nowrap text-muted-foreground">{tile.unit}</span> : null}
    </dd>
    {tile.meter !== undefined ? <Progress aria-label={tile.label} value={Math.min(100, Math.round(tile.meter * 100))} max={100}
      className={cn(tile.meter > 0.85 && '[&_[data-slot=progress-indicator]]:bg-mark-high')} /> : null}
    {tile.note ? <p className="line-clamp-2 text-sm text-muted-foreground">{tile.note}</p> : null}
  </div>)}</dl>;
}

/**
 * The range in five charts: requests by how they ended (stacked), response time (average and slowest), what members did,
 * how many of them, and the errors the server logged.
 */
function TrafficCharts({ traffic }: { traffic: Traffic }) {
  const hourly = traffic.range === 'DAY';
  const labels = traffic.buckets.map(bucket => bucketLabel(bucket.at, hourly));
  const of = (pick: (bucket: Traffic['buckets'][number]) => number | null) => traffic.buckets.map(pick);
  const requests: Series[] = [
    { key: 'ok', label: '성공', tone: 'blue', values: of(bucket => bucket.ok) },
    { key: 'refused', label: '거절됨(4xx)', tone: 'orange', values: of(bucket => bucket.clientErrors) },
    { key: 'failed', label: '서버 오류(5xx)', tone: 'red', values: of(bucket => bucket.serverErrors) },
  ];
  const timing: Series[] = [
    { key: 'avg', label: '평균', tone: 'blue', values: of(bucket => bucket.avgMs ?? null) },
    { key: 'max', label: '가장 느림', tone: 'yellow', values: of(bucket => (bucket.avgMs == null ? null : bucket.maxMs)) },
  ];
  const activity: Series[] = [{ key: 'activity', label: '활동', tone: 'green', values: of(bucket => bucket.activities) }];
  const members: Series[] = [{ key: 'members', label: '활동한 구성원', tone: 'blue', values: of(bucket => bucket.activeMembers) }];
  const errors: Series[] = [{ key: 'errors', label: '서버 오류 기록', tone: 'red', values: of(bucket => bucket.errors) }];
  const t = traffic.totals;
  return <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
    <ChartCard title="요청 수" total={`${countText(t.requests)}건`} series={requests}><StackedBars labels={labels} series={requests} unit="건" /></ChartCard>
    <ChartCard title="응답 시간" total={`느린 요청(1초 이상) ${countText(t.slow)}건`} series={timing}>
      <Lines labels={labels} series={timing} format={value => durationText(Math.round(value))} />
    </ChartCard>
    <ChartCard title="구성원 활동" total={`${countText(t.activities)}건 · ${t.activeMembers}명`} series={activity}>
      <StackedBars labels={labels} series={activity} unit="건" />
    </ChartCard>
    <ChartCard title={hourly ? '시간별 활동한 구성원' : '일별 활동한 구성원'} total={`${t.activeMembers}명`} series={members}>
      <StackedBars labels={labels} series={members} unit="명" />
    </ChartCard>
    <ChartCard title="서버 오류 기록" total={`${countText(t.errors)}건`} series={errors}><StackedBars labels={labels} series={errors} unit="건" /></ChartCard>
  </div>;
}

/**
 * A short list of API mappings, each the part of cowork it belongs to over its method and path, and at its end either how
 * often it was called or how long it took (average, slowest), with any server failures in red.
 */
function RouteList({ title, rows, measure }: { title: string; rows: RouteRow[]; measure: 'count' | 'time' }) {
  if (rows.length === 0) return <SettingsSection title={title}>
    <p className="p-4 text-sm text-muted-foreground">이 기간에 요청이 없습니다.</p>
  </SettingsSection>;
  return <SettingsSection title={title}>
    {rows.map(row => <div key={`${row.method} ${row.route}`} className="flex min-h-11 items-center gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{areaOf(row.route)}</span>
        <span className="font-mono text-xs wrap-anywhere text-muted-foreground">{`${row.method} ${shortRoute(row.route)}`}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="tabular-nums">{measure === 'count' ? `${countText(row.requests)}건` : `평균 ${durationText(row.avgMs)}`}</span>
        <span className={cn('text-xs tabular-nums', row.serverErrors > 0 ? 'text-destructive' : 'text-muted-foreground')}>
          {measure === 'count' ? `평균 ${durationText(row.avgMs)}` : `가장 느림 ${durationText(row.maxMs)}`}
          {row.serverErrors > 0 ? ` · 서버 오류 ${row.serverErrors}건` : ''}
        </span>
      </div>
    </div>)}
  </SettingsSection>;
}
