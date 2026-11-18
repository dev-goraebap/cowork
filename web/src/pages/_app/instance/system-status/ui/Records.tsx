import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { cn } from 'cn';
import { stampText } from '@/shared/lib/date-stamp';
import { useIsMobile } from '@/shared/lib/use-mobile';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ListMore } from '@/shared/ui/list-more';
import { PageState } from '@/shared/ui/page-state';
import { Facts, WithPanel } from '@/shared/ui/side-panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { activitiesOptions, errorOptions, errorsOptions, isLogUnavailable, type ActivityListing, type ActivityRow, type ErrorListing, type ErrorRow } from '../api/system';
import { activityOutcome, activityText, agentText, durationText, momentText, shortRoute, type OutcomeTone } from '../model/format';
import { LogStoreNotice } from './Overview';
import { ToneBadge } from '@/shared/ui/tone-badge';

/** A row of a list whose rows open beside it; the chosen one stays lit while its panel is open. */
const ROW = 'relative bg-background hover:bg-row-hover data-[state=selected]:bg-muted';
/**
 * The row's name is a button whose ::after covers the nearest relative ancestor (the row), so the whole row opens and the
 * keyboard reaches it there (RowLink's way, for a panel with no address of its own).
 */
const OPENS_ROW = 'min-w-0 truncate text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring';
const CODE = 'font-mono text-xs';

const whoOf = (row: ActivityRow) => row.employeeName ?? (row.employeeId ? '알 수 없는 구성원' : '로그인 전');

/**
 * 활동 기록: what members did over the last 30 days, newest first (every change, sign-ins and the reads worth keeping,
 * and the main screens they opened, again within 30 minutes of the last time on the same line), narrowed by the page's
 * conditions. A desktop shows a table, a phone rows; a row opens everything kept of it.
 */
export function Activities({ listing, isNarrowed, onClear, opened, onOpen }: {
  listing: ActivityListing; isNarrowed: boolean; onClear: () => void; opened: ActivityRow | null; onOpen: (row: ActivityRow | null) => void;
}) {
  const isMobile = useIsMobile();
  const list = useInfiniteQuery(activitiesOptions(listing));
  const items = useMemo(() => list.data?.pages.flatMap(page => page.items) ?? [], [list.data]);
  if (isLogUnavailable(list.error)) return <div className="p-6 max-md:p-4"><LogStoreNotice /></div>;
  if (list.isPending) return null;
  if (list.isError) return <PageState kind="error" title="활동 기록을 불러오지 못했습니다" description={list.error.message}
    action={<Button variant="secondary" onClick={() => void list.refetch()}>다시 시도</Button>} />;
  if (items.length === 0) return isNarrowed
    ? <PageState kind="search" title="조건에 맞는 활동이 없습니다" action={<Button variant="secondary" onClick={onClear}>조건 지우기</Button>} />
    : <PageState kind="empty" title="아직 남은 활동이 없습니다" />;
  return <WithPanel title={opened ? activityText(opened).title : undefined} subtitle={opened ? momentText(opened.at) : undefined}
    panel={opened ? <ActivityFacts row={opened} /> : undefined} onClose={() => onOpen(null)}>
    {isMobile
      ? <ul aria-label="활동 기록" className="flex flex-col">
        {items.map(row => {
          const text = activityText(row);
          return <li key={`${row.kind}-${row.id}`} data-state={opened?.id === row.id && opened.kind === row.kind ? 'selected' : undefined}
            className={cn(ROW, 'flex items-center gap-3 border-b px-4 py-3')}>
            <span className="flex min-w-0 flex-1 flex-col">
              <button type="button" className={cn(OPENS_ROW, 'font-medium')} onClick={() => onOpen(row)}>{`${whoOf(row)} · ${text.title}`}</button>
              <span className={cn('truncate text-sm text-muted-foreground', row.kind === 'CHANGE' && CODE)}>{text.detail}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <OutcomeBadge {...activityOutcome(row)} />
              <span className="text-xs text-muted-foreground tabular-nums">{momentText(row.at)}</span>
            </span>
          </li>;
        })}
      </ul>
      : <ActivityTable rows={items} opened={opened} onOpen={onOpen} />}
    <ListMore shown={items.length} hasMore={!!list.hasNextPage && !list.isPlaceholderData} isLoading={list.isFetchingNextPage} onMore={() => void list.fetchNextPage()} />
  </WithPanel>;
}

/** The activities as a desktop table: what, when, who, how it ended, how long, from where; a row opens its detail. */
function ActivityTable({ rows, opened, onOpen }: { rows: ActivityRow[]; opened: ActivityRow | null; onOpen: (row: ActivityRow) => void }) {
  // The side panel takes half the centred box; below this width the list scrolls sideways instead of squeezing 한 일 out.
  return <Table className="bg-background">
    <TableHeader>
      <TableRow>
        <TableHead className={cn('pl-4')}>한 일</TableHead>
        <TableHead className={cn('w-44')}>시각</TableHead>
        <TableHead className={cn('w-40')}>구성원</TableHead>
        <TableHead className={cn('w-30')}>결과</TableHead>
        <TableHead className={cn('w-24')}>걸린 시간</TableHead>
        <TableHead className={cn('w-46 pr-4')}>접속</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(row => {
        const text = activityText(row);
        return <TableRow key={`${row.kind}-${row.id}`} data-state={opened?.id === row.id && opened.kind === row.kind ? 'selected' : undefined}>
          <TableCell>
            <span className="flex min-w-0 flex-col">
              <button type="button" className={OPENS_ROW} onClick={() => onOpen(row)}>{text.title}</button>
              <span className={cn('truncate text-xs text-muted-foreground', row.kind === 'CHANGE' && 'font-mono')}>{text.detail}</span>
            </span>
          </TableCell>
          <TableCell className="tabular-nums">{stampText(row.at)}</TableCell>
          <TableCell>
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{whoOf(row)}</span>
              {row.departmentName ? <span className="truncate text-xs text-muted-foreground">{row.departmentName}</span> : null}
            </span>
          </TableCell>
          <TableCell><OutcomeBadge {...activityOutcome(row)} /></TableCell>
          <TableCell className="tabular-nums">{row.durationMs == null ? '-' : durationText(row.durationMs)}</TableCell>
          <TableCell>
            <span className="flex min-w-0 flex-col">
              <span className="truncate tabular-nums">{row.ip}</span>
              <span className="truncate text-xs text-muted-foreground">{agentText(row.userAgent) ?? '-'}</span>
            </span>
          </TableCell>
        </TableRow>;
      })}
    </TableBody>
  </Table>;
}

/**
 * Everything kept of an activity: a change's path values naming what was acted on, and the trace id that finds the same
 * request among the server errors; a screen opened, when it was first and last opened and how many times. Both, the
 * address and browser.
 */
function ActivityFacts({ row }: { row: ActivityRow }) {
  const who = row.employeeName ? `${row.employeeName}${row.departmentName ? ` · ${row.departmentName}` : ''}` : row.employeeId ?? '로그인 전';
  const facts: [string, ReactNode][] = row.kind === 'VISIT'
    ? [
      ['처음 연 시각', momentText(row.at)],
      ['마지막 연 시각', momentText(row.lastAt ?? row.at)],
      ['횟수', `${row.visits ?? 1}회 (마지막으로 연 뒤 30분 안에 다시 연 것을 묶음)`],
      ['구성원', who],
      ['화면', row.route],
    ]
    : [
      ['시각', momentText(row.at)],
      ['구성원', who],
      ['한 일', `${activityText(row).title} · ${row.method ?? ''} ${shortRoute(row.route)}`],
      ['대상', row.target ?? '-'],
      ['결과', <OutcomeBadge key="outcome" {...activityOutcome(row)} />],
      ['걸린 시간', row.durationMs == null ? '-' : durationText(row.durationMs)],
    ];
  return <Facts facts={[...facts, ['IP', row.ip], ['브라우저', agentText(row.userAgent) ?? '-'], ['User-Agent', row.userAgent ?? '-'],
    ...(row.traceId ? [['추적 번호', row.traceId] as [string, ReactNode]] : [])]} />;
}

/**
 * 서버 오류: what the server logged as errors (and its own code's warnings) over the last 30 days, newest first, the same
 * error within a minute one line with its count; a line opens its stack.
 */
export function Errors({ listing, isNarrowed, onClear, opened, onOpen }: {
  listing: ErrorListing; isNarrowed: boolean; onClear: () => void; opened: ErrorRow | null; onOpen: (row: ErrorRow | null) => void;
}) {
  const list = useInfiniteQuery(errorsOptions(listing));
  const items = useMemo(() => list.data?.pages.flatMap(page => page.items) ?? [], [list.data]);
  if (isLogUnavailable(list.error)) return <div className="p-6 max-md:p-4"><LogStoreNotice /></div>;
  if (list.isPending) return null;
  if (list.isError) return <PageState kind="error" title="서버 오류 기록을 불러오지 못했습니다" description={list.error.message}
    action={<Button variant="secondary" onClick={() => void list.refetch()}>다시 시도</Button>} />;
  if (items.length === 0) return isNarrowed
    ? <PageState kind="search" title="조건에 맞는 오류가 없습니다" action={<Button variant="secondary" onClick={onClear}>조건 지우기</Button>} />
    : <PageState kind="empty" title="최근 30일 동안 서버 오류가 없습니다" />;
  return <WithPanel title={opened ? (opened.level === 'ERROR' ? '서버 오류' : '서버 경고') : undefined} subtitle={opened ? momentText(opened.lastAt) : undefined}
    panel={opened ? <ErrorFacts row={opened} /> : undefined} onClose={() => onOpen(null)}>
    <ul aria-label="서버 오류" className="flex flex-col">
      {items.map(row => <li key={row.id} data-state={opened?.id === row.id ? 'selected' : undefined} className={cn(ROW, 'flex items-center gap-3 border-b px-4 py-3')}>
        {row.level === 'ERROR'
          ? <Badge className="bg-event-red text-event-red-foreground">오류</Badge>
          : <Badge className="bg-event-orange text-event-orange-foreground">경고</Badge>}
        <span className="flex min-w-0 flex-1 flex-col">
          <button type="button" className={cn(OPENS_ROW, 'font-medium')} onClick={() => onOpen(row)}>{row.message}</button>
          <span className={cn('truncate text-muted-foreground', CODE)}>
            {row.method && row.path ? `${row.method} ${row.path}` : row.logger}{row.exception ? ` · ${row.exception.split('.').pop()}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-xs tabular-nums">{momentText(row.lastAt)}</span>
          {row.occurrences > 1 ? <span className="text-xs text-muted-foreground tabular-nums">{row.occurrences}번</span> : null}
        </span>
      </li>)}
    </ul>
    <ListMore shown={items.length} hasMore={!!list.hasNextPage && !list.isPlaceholderData} isLoading={list.isFetchingNextPage} onMore={() => void list.fetchNextPage()} />
  </WithPanel>;
}

/** An error's facts: when it began and was last seen, how often, the request (or the job's logger), the trace id, its stack. */
function ErrorFacts({ row }: { row: ErrorRow }) {
  const detail = useQuery(errorOptions(row.id));
  const error = detail.data?.error ?? row;
  return <div className="flex flex-col gap-4">
    <p className="font-semibold wrap-anywhere">{error.message}</p>
    <Facts facts={[
      ['처음', momentText(error.firstAt)],
      ['마지막', momentText(error.lastAt)],
      ['횟수', `${error.occurrences}번`],
      ['요청', error.method && error.path ? `${error.method} ${error.path}` : '요청 밖(예약 작업 등)'],
      ['구성원', error.employeeName ?? (error.employeeId ? '알 수 없는 구성원' : '-')],
      ['IP', error.ip ?? '-'],
      ['로거', error.logger],
      ['예외', error.exception ?? '-'],
      ['추적 번호', error.traceId ?? '-'],
    ]} />
    <section className="flex flex-col gap-2" aria-label="스택">
      <h3 className="text-sm font-medium text-muted-foreground">스택</h3>
      {detail.isPending ? <p className="text-sm text-muted-foreground">불러오는 중…</p>
        : detail.data?.stack ? <pre className="m-0 max-h-96 overflow-auto rounded-xl border bg-card p-3 font-mono text-xs leading-normal whitespace-pre">{detail.data.stack}</pre>
          : <p className="text-sm text-muted-foreground">예외 없이 남긴 기록입니다.</p>}
    </section>
  </div>;
}

/** 신청 · 바뀜이 어떻게 끝났는지를 색 알약으로. */
const OutcomeBadge = ({ label, color }: OutcomeTone) => <ToneBadge label={label} tone={color} />;
