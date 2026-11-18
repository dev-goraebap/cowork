import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { cn } from 'cn';
import { kindOf } from '@/entities/notification';
import { useAddressFilters, useAddressWords } from '@/shared/lib/list-address';
import { useIsMobile } from '@/shared/lib/use-mobile';
import { pageCrumbs } from '@/widgets/app-shell';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FilterBar, FilterChips, FilterMenu, useFilters, type FilterDef } from '@/shared/ui/filter';
import { BellIcon, SentIcon, TriangleAlertIcon } from '@/shared/ui/icon';
import { Page, PageViews, type PageView } from '@/shared/ui/layout/page';
import { PageState } from '@/shared/ui/page-state';
import { PersonAvatar } from '@/shared/ui/person';
import { SearchTool } from '@/shared/ui/search-tool';
import { SettingsSection } from '@/shared/ui/settings';
import { Facts, WithPanel } from '@/shared/ui/side-panel';
import { Spinner } from '@/shared/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { noticeKindsOptions, PUSH_KEY, pushMemberOptions, pushMembersOptions, pushSummaryOptions, sendMemberTest, type NoticeKindRow, type PushMember } from '../api/push';
import { NOTICE_KINDS } from '../model/notice-kinds';

type Crumb = { label: string; href?: string; icon?: string };
type Tab = 'deliveries' | 'kinds';
const VIEWS: PageView<Tab>[] = [{ value: 'deliveries', label: '발송 현황', icon: SentIcon }, { value: 'kinds', label: '알림 종류', icon: BellIcon }];
const FILTER_KEYS = ['state'] as const;
const FILTERS: FilterDef<typeof FILTER_KEYS[number]>[] = [
  { key: 'state', label: '상태', icon: BellIcon, options: [{ value: 'FAILED', label: '실패 있음' }, { value: 'NO_DEVICE', label: '기기 없음' }] },
];

type Tone = 'green' | 'blue' | 'red' | 'orange' | 'gray' | 'purple';
/** A token's colour as the schedule's category fills, which read in the light and dark themes alike. */
const TONE: Record<Tone, string> = {
  green: 'bg-event-green text-event-green-foreground',
  blue: 'bg-event-blue text-event-blue-foreground',
  red: 'bg-event-red text-event-red-foreground',
  orange: 'bg-event-orange text-event-orange-foreground',
  gray: 'bg-event-gray text-event-gray-foreground',
  purple: 'bg-event-purple text-event-purple-foreground',
};
const Token = ({ label, tone }: { label: string; tone: Tone }) => <Badge className={TONE[tone]}>{label}</Badge>;

/** Each push's outcome, named for an administrator, with the colour of its token. */
const STATUS: Record<string, { label: string; color: Tone }> = {
  SENT: { label: '전달됨', color: 'green' },
  PENDING: { label: '보내는 중', color: 'blue' },
  FAILED: { label: '실패', color: 'red' },
  GONE: { label: '구독 끝남', color: 'orange' },
  NO_DEVICE: { label: '기기 없음', color: 'gray' },
  MUTED: { label: '꺼 둔 알림', color: 'gray' },
};

/** A raised surface: the week's tiles and each kind of notice (DESIGN.md 면 단계). */
const SURFACE = 'min-w-0 rounded-xl border bg-card p-4';
const ROW = 'relative bg-background hover:bg-row-hover data-[state=selected]:bg-muted';
/** The member's name is a button whose ::after covers the row, so the whole row opens the member beside the list. */
const OPENS_ROW = 'min-w-0 truncate text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring';

const moment = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const momentText = (iso?: string | null) => (iso ? moment.format(new Date(iso)) : '-');

/** A push's outcome as a small token; one this screen does not know shows as it is named. */
function PushStatusToken({ status }: { status?: string | null }) {
  if (!status) return null;
  const known = STATUS[status];
  return <Token label={known?.label ?? status} tone={known?.color ?? 'gray'} />;
}

/**
 * 알림 발송 현황 (client/'s push deliveries), for 인스턴스 관리자, in two tabs kept in the address (?tab=kinds): 발송 현황,
 * whether browser pushes reach people, and 알림 종류, what each kind of notice is and how much of it went out.
 */
export function PushDeliveriesPage({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const search = useSearch({ strict: false }) as { tab?: string };
  const tab: Tab = search.tab === 'kinds' ? 'kinds' : 'deliveries';
  const [words, setWords] = useAddressWords();
  const [opened, setOpened] = useState<PushMember | null>(null);
  const [address, setAddress] = useAddressFilters(FILTER_KEYS);
  // 상태는 하나만 고른다(서버가 하나를 받는다): 다른 값을 고르면 바뀌고, 고른 값을 다시 누르면 풀린다.
  const filters = useFilters(FILTERS, { state: address, onStateChange: next => setAddress({ state: next.state?.slice(-1) ?? [] }) });
  const listing = { q: words.trim() || undefined, state: filters.state.state?.[0] };
  return <Page crumbs={pageCrumbs(crumbs)}
    views={<PageViews label="알림 발송 현황 보기" views={VIEWS} value={tab}
      onChange={next => void navigate({ href: next === 'kinds' ? '/instance/push-deliveries?tab=kinds' : '/instance/push-deliveries', replace: true })} />}
    tools={tab === 'deliveries' ? <><SearchTool label="구성원 검색" placeholder="이름" value={words} onChange={setWords} /><FilterMenu filters={filters} /></> : undefined}
    below={tab === 'deliveries' ? (isMobile ? <FilterChips filters={filters} /> : <FilterBar filters={filters} />) : undefined}>
    {/* 발송 현황도 종류 탭과 같은 폭(52rem)으로 가운데 둔다. */}
    <div className="mx-auto flex min-h-0 w-full max-w-208 flex-1 flex-col">{tab === 'kinds'
      ? <Kinds />
      : <Deliveries listing={listing} isNarrowed={!!listing.q || filters.active.length > 0} onClear={() => { setWords(''); filters.clear(); }}
        opened={opened} onOpen={setOpened} />}</div>
  </Page>;
}

/**
 * 발송 현황: the week at a glance leads (members who get pushes, delivered, failed, no device), then every working member
 * by name with their devices and latest push, narrowed to those with a failure or without a device. A member opens
 * their devices and every push with the push service's answer, and a test push.
 */
function Deliveries({ listing, isNarrowed, onClear, opened, onOpen }: {
  listing: { q?: string; state?: string }; isNarrowed: boolean; onClear: () => void; opened: PushMember | null; onOpen: (member: PushMember | null) => void;
}) {
  const isMobile = useIsMobile();
  const summary = useQuery(pushSummaryOptions());
  const members = useQuery(pushMembersOptions(listing));
  const s = summary.data;
  const tiles = s ? [
    { key: 'members', label: '알림 켠 구성원', value: `${s.membersWithDevice}`, unit: `/ ${s.workingMembers}명`, note: `기기 ${s.activeDevices}대` },
    { key: 'sent', label: '전달됨', value: `${s.sent}`, unit: '건' },
    { key: 'failed', label: '실패', value: `${s.failed + s.gone}`, unit: '건', note: s.gone > 0 ? `구독 끝남 ${s.gone}건 포함` : undefined, alert: s.failed + s.gone > 0 },
    { key: 'noDevice', label: '기기 없어 못 보냄', value: `${s.noDevice}`, unit: '건', note: s.muted > 0 ? `꺼 둔 알림 ${s.muted}건 별도` : undefined },
  ] : [];
  const list = members.data ?? [];
  const rows = () => {
    if (members.isPending) return null;
    if (members.isError) return <PageState kind="error" isCompact title="구성원별 알림을 불러오지 못했습니다" description={members.error.message}
      action={<Button variant="secondary" onClick={() => void members.refetch()}>다시 시도</Button>} />;
    if (list.length === 0) return isNarrowed
      ? <PageState kind="search" isCompact title="조건에 맞는 구성원이 없습니다"
        action={<Button variant="secondary" onClick={onClear}>조건 지우기</Button>} />
      : <PageState kind="empty" isCompact title="재직 중인 구성원이 없습니다" />;
    return isMobile
      ? <ul aria-label="구성원별 알림" className="flex flex-col border-t">
        {list.map(member => <li key={member.id} data-state={opened?.id === member.id ? 'selected' : undefined}
          className={cn(ROW, 'flex items-center gap-3 border-b px-4 py-3')}>
          <PersonAvatar id={member.id} name={member.name} size={32} isStatic />
          <span className="flex min-w-0 flex-1 flex-col">
            <button type="button" className={cn(OPENS_ROW, 'font-medium')} onClick={() => onOpen(member)}>{member.name}</button>
            <span className="truncate text-sm text-muted-foreground">
              {`${member.departmentName ?? '미배정'} · ${member.devices > 0 ? `기기 ${member.devices}대` : '기기 없음'}${member.failed > 0 ? ` · 실패 ${member.failed}` : ''}`}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <PushStatusToken status={member.lastStatus} />
            {member.lastPushAt ? <span className="text-xs text-muted-foreground tabular-nums">{momentText(member.lastPushAt)}</span> : null}
          </span>
        </li>)}
      </ul>
      : <MembersTable rows={list} opened={opened} onOpen={onOpen} />;
  };
  return <WithPanel title={opened?.name} subtitle={opened ? opened.departmentName ?? '미배정' : undefined}
    panel={opened ? <MemberPushes member={opened} /> : undefined} onClose={() => onOpen(null)}>
    <div className="flex flex-col gap-4 py-4">
      {s ? <div className="flex flex-col gap-3 px-4">
        {!s.configured ? <Alert>
          <TriangleAlertIcon className="text-mark-high" />
          <AlertTitle>푸시 알림이 꺼져 있습니다</AlertTitle>
          <AlertDescription>서버에 VAPID 키(VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY)가 설정되지 않아 브라우저 푸시를 보내지 않고 있습니다. 앱 안 알림은 그대로 갑니다.</AlertDescription>
        </Alert> : null}
        <h2 className="text-sm font-medium text-muted-foreground">최근 7일</h2>
        <dl className="m-0 grid grid-cols-4 gap-3 max-md:grid-cols-2">{tiles.map(tile => <div key={tile.key}
          className={cn(SURFACE, 'flex flex-col gap-1', tile.alert && 'border-destructive/45')}>
          <dt className="text-sm text-muted-foreground">{tile.label}</dt>
          <dd className="m-0 flex flex-wrap items-baseline gap-x-1">
            <span className={cn('text-2xl leading-tight font-bold tabular-nums max-md:text-base', tile.alert && 'text-destructive')}>{tile.value}</span>
            <span className="text-sm text-muted-foreground">{tile.unit}</span>
          </dd>
          {tile.note ? <p className="text-sm text-muted-foreground">{tile.note}</p> : null}
        </div>)}</dl>
      </div> : null}
      {rows()}
    </div>
  </WithPanel>;
}

/**
 * Working members as a desktop table: the picture and name and department, how many devices take pushes, the latest push
 * and how it went, then the week's delivered, failed and no-device counts, the failures in red; a row opens the member.
 */
function MembersTable({ rows, opened, onOpen }: { rows: PushMember[]; opened: PushMember | null; onOpen: (member: PushMember) => void }) {
  // The side panel takes half the centred box; below this width the list scrolls sideways instead of squeezing the names out.
  return <Table className="bg-background">
    <TableHeader>
      <TableRow>
        <TableHead className={cn('pl-4')}>구성원</TableHead>
        <TableHead className={cn('w-20')}>기기</TableHead>
        <TableHead className={cn('w-58')}>최근 알림</TableHead>
        <TableHead className={cn('w-20 text-right')}>전달</TableHead>
        <TableHead className={cn('w-20 text-right')}>실패</TableHead>
        <TableHead className={cn('w-24 pr-4 text-right')}>기기 없음</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(row => <TableRow key={row.id} data-state={opened?.id === row.id ? 'selected' : undefined}>
        <TableCell>
          <span className="flex min-w-0 items-center gap-2">
            <PersonAvatar id={row.id} name={row.name} size={20} isStatic />
            <button type="button" className={OPENS_ROW} onClick={() => onOpen(row)}>{row.name}</button>
            <span className="truncate text-muted-foreground">{row.departmentName ?? '미배정'}</span>
          </span>
        </TableCell>
        <TableCell className={row.devices > 0 ? undefined : 'text-muted-foreground'}>{row.devices > 0 ? `${row.devices}대` : '없음'}</TableCell>
        <TableCell>{row.lastPushAt
          ? <span className="flex items-center gap-2"><span className="tabular-nums">{momentText(row.lastPushAt)}</span><PushStatusToken status={row.lastStatus} /></span>
          : <span className="text-muted-foreground">-</span>}</TableCell>
        <TableCell className="text-right tabular-nums">{row.sent}</TableCell>
        <TableCell className={cn('text-right tabular-nums', row.failed > 0 && 'text-destructive')}>{row.failed}</TableCell>
        <TableCell className="text-right tabular-nums">{row.noDevice}</TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** One line in a panel's section: a name over what it says, and a token at its end. */
function PanelRow({ label, description, end }: { label: string; description?: string; end?: ReactNode }) {
  return <div className="flex min-h-11 items-center gap-3 px-3 py-2">
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="font-medium wrap-anywhere">{label}</span>
      {description ? <span className="text-sm whitespace-pre-line text-muted-foreground wrap-anywhere">{description}</span> : null}
    </div>
    {end ? <span className="shrink-0">{end}</span> : null}
  </div>;
}

/**
 * One member's pushes: every device they had (those still taking pushes first, ended ones quiet), then their latest
 * pushes with the device, the outcome, the push service's answer and the tries. A test push checks their devices; its
 * outcome shows here a moment later.
 */
function MemberPushes({ member }: { member: PushMember }) {
  const client = useQueryClient();
  const detail = useQuery(pushMemberOptions(member.id));
  const test = useMutation({ mutationFn: () => sendMemberTest(member.id), onSettled: () => client.invalidateQueries({ queryKey: PUSH_KEY }) });
  const data = detail.data;
  if (!data) return detail.isError
    ? <p className="text-sm text-destructive" role="alert">{detail.error.message}</p>
    : <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  return <div className="flex flex-col gap-5">
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="self-start" disabled={test.isPending || data.devices.every(device => device.expiredAt)} onClick={() => test.mutate()}>
        {test.isPending ? <Spinner data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
        테스트 알림 보내기
      </Button>
      {test.isSuccess ? <p className="text-sm text-muted-foreground" role="status">기기 {test.data.devices}대에 보냈습니다.</p> : null}
      {test.error ? <p className="text-sm text-destructive" role="alert">{test.error.message}</p> : null}
    </div>
    <SettingsSection title={`기기 ${data.devices.filter(device => !device.expiredAt).length}대`}>
      {data.devices.length === 0
        ? <PanelRow label="알림을 켠 기기가 없습니다" />
        : data.devices.map(device => <PanelRow key={device.id} label={device.deviceName ?? '이름 없는 기기'}
          description={`${momentText(device.createdAt)} 추가 · 마지막 접속 ${momentText(device.lastSeenAt)}${device.expiredAt ? ` · ${momentText(device.expiredAt)} 끝남` : ''}`}
          end={device.expiredAt ? <Token label="끝남" tone="gray" /> : <Token label="받는 중" tone="green" />} />)}
    </SettingsSection>
    <SettingsSection title="최근 알림">
      {data.deliveries.length === 0
        ? <PanelRow label="아직 보낸 알림이 없습니다" />
        : data.deliveries.map(delivery => <PanelRow key={delivery.id} label={`${delivery.test ? '[테스트] ' : ''}${delivery.title}`}
          description={[
            `${momentText(delivery.createdAt)}${delivery.deviceName ? ` · ${delivery.deviceName}` : ''}${delivery.attempts > 1 ? ` · ${delivery.attempts}번 시도` : ''}${delivery.httpStatus ? ` · HTTP ${delivery.httpStatus}` : ''}`,
            delivery.error && delivery.status !== 'SENT' ? delivery.error : '',
          ].filter(Boolean).join('\n')}
          end={<PushStatusToken status={delivery.status} />} />)}
    </SettingsSection>
  </div>;
}

/**
 * 알림 종류, read only: each kind of notice, when it goes, to whom, whose picture it shows, where it opens and under which
 * push group a member may turn it off, with its latest notice as an example and the last thirty days in numbers. A
 * kind the server has sent that is not described yet still shows, by its code, so nothing sent is hidden.
 */
function Kinds() {
  const kinds = useQuery(noticeKindsOptions());
  if (kinds.isPending) return null;
  if (kinds.isError) return <PageState kind="error" title="알림 종류를 불러오지 못했습니다" description={kinds.error.message}
    action={<Button variant="secondary" onClick={() => void kinds.refetch()}>다시 시도</Button>} />;
  const sent = new Map(kinds.data.map(row => [row.kind, row]));
  const unknown = kinds.data.filter(row => !NOTICE_KINDS.some(kind => kind.kind === row.kind));
  return <div className="flex flex-col gap-4 p-4">
    <p className="text-sm text-muted-foreground">최근 30일</p>
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {NOTICE_KINDS.map(kind => {
        const row = sent.get(kind.kind);
        const label = kindOf(kind.kind);
        return <li key={kind.kind} className={cn(SURFACE, 'flex flex-col gap-3')}>
          <div className="flex items-center gap-2"><Token label={label.label} tone={label.color} /><span className="font-mono text-xs text-muted-foreground">{kind.kind}</span></div>
          <KindExample row={row} />
          <Facts facts={[['보내는 때', kind.when], ['받는 사람', kind.to], ['보낸 사람으로 보임', kind.from], ['누르면', kind.opens], ['푸시 끄기', `설정의 '${kind.pushGroup}'`]]} />
          <KindCounts row={row} />
        </li>;
      })}
      {unknown.map(row => <li key={row.kind} className={cn(SURFACE, 'flex flex-col gap-3')}>
        <div className="flex items-center gap-2"><Badge variant="outline">설명 없음</Badge><span className="font-mono text-xs text-muted-foreground">{row.kind}</span></div>
        <KindExample row={row} />
        <KindCounts row={row} />
      </li>)}
    </ul>
  </div>;
}

/** The kind's latest notice as it read, or a note that none has gone yet. */
function KindExample({ row }: { row?: NoticeKindRow }) {
  if (!row?.exampleTitle) return <p className="text-sm text-muted-foreground">아직 보낸 적이 없습니다.</p>;
  return <div className="flex flex-col gap-0.5 border-l-2 border-input px-3 py-2">
    <p className="font-medium">{row.exampleTitle}</p>
    {row.exampleMessage ? <p className="line-clamp-2 text-sm text-muted-foreground">{row.exampleMessage}</p> : null}
  </div>;
}

/** The last thirty days: notices made, people reached, pushes delivered, and when the latest went out. */
function KindCounts({ row }: { row?: NoticeKindRow }) {
  return <p className="text-sm text-muted-foreground tabular-nums">
    {`알림 ${row?.notices ?? 0}건 · 받은 사람 ${row?.recipients ?? 0}명 · 푸시 전달 ${row?.pushed ?? 0}건${row?.lastAt ? ` · 마지막 ${momentText(row.lastAt)}` : ''}`}
  </p>;
}
