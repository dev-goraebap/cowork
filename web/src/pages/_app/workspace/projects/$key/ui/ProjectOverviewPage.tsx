import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { documentsOptions } from '@/entities/document';
import { ProjectRoleLabel, projectMembersOptions, projectOptions, type Project } from '@/entities/project';
import {
  boardGroupsOptions, CATEGORIES, cyclesOptions, workItemHref, WorkItemListRow, workItemsOptions, type Cycle, type WorkItemBoardGroup,
} from '@/entities/work-item';
import { ApiError } from '@/shared/api';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { ArchiveIcon, CalendarIcon, FileTextIcon, NotesIcon, RepeatIcon, SettingsIcon, type Icon } from '@/shared/ui/icon';
import { Page } from '@/shared/ui/layout/page';
import { Mark } from '@/shared/ui/mark-picker';
import { PageState } from '@/shared/ui/page-state';
import { PersonAvatar } from '@/shared/ui/person';
import { MarkdownRead } from '@/shared/ui/rich-body';
import { pageCrumbs } from '@/shared/ui/nav-icon';

type Crumb = { label: string; href?: string; icon?: string };

const day = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
const shortDay = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
/** 개요에 보이는 최근 업무 · 문서의 수. */
const RECENT = 5;
/** 겹쳐 그리는 멤버 사진 수. */
const FACES = 5;

/** 한 묶음의 머리: 아이콘과 이름, 끝에 그 화면으로 가는 링크. */
function Section({ icon: SectionIcon, title, to, more = '모두 보기', children }: {
  icon: Icon; title: string; to?: string; more?: string; children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <SectionIcon className="size-4 text-icon-muted" />
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {to ? <Link to={to} className="rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{more}</Link> : null}
      </header>
      {children}
    </section>
  );
}

/** 속성 한 줄(Linear의 프로젝트 속성): 왼쪽에 이름, 오른쪽에 값. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-4">
      <dt className="w-24 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-sm">{children}</dd>
    </div>
  );
}

/** 업무의 진행: 상태 분류마다의 수를 한 줄 막대로, 그 아래에 분류별 수. 닫힌 것(완료) 비율을 크게 적는다. */
function Progress({ groups }: { groups: WorkItemBoardGroup[] }) {
  const counts = CATEGORIES.map(category => ({ ...category, total: groups.filter(group => group.category === category.value).reduce((sum, group) => sum + group.total, 0) }));
  const total = counts.reduce((sum, each) => sum + each.total, 0);
  const done = counts.find(each => each.value === 'COMPLETED')?.total ?? 0;
  const live = total - (counts.find(each => each.value === 'CANCELED')?.total ?? 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">아직 업무가 없습니다.</p>;
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{live > 0 ? Math.round((done / live) * 100) : 0}%</span>
        <span className="text-sm text-muted-foreground tabular-nums">{`완료 ${done} / ${live}건`}</span>
      </div>
      <div role="img" aria-label={counts.map(each => `${each.label} ${each.total}건`).join(', ')} className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {counts.filter(each => each.total > 0).map(each => (
          // check-ui: allow-style 상태별 수에 비례하는 막대 폭은 데이터다.
          <span key={each.value} style={{ '--share': each.total } as CSSProperties} className={cn('grow-(--share) basis-0 bg-current', each.tone)} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {counts.map(each => (
          <li key={each.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <each.icon className={cn('size-3.5', each.tone)} />
            {each.label}
            <span className="font-medium text-foreground tabular-nums">{each.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 진행 중인 사이클: 이름 · 기간과 끝낸 업무의 비율. */
function CurrentCycle({ cycle }: { cycle: Cycle }) {
  const all = cycle.totals?.workItems ?? 0;
  const done = cycle.totals?.completed ?? 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{cycle.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {cycle.startDate && cycle.endDate ? `${shortDay.format(new Date(cycle.startDate))} ~ ${shortDay.format(new Date(cycle.endDate))}` : ''}
        </span>
      </div>
      {cycle.goal ? <p className="truncate text-sm text-muted-foreground">{cycle.goal}</p> : null}
      <div className="flex items-center gap-3">
        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          {/* check-ui: allow-style 끝낸 비율만큼의 막대 폭은 데이터다. */}
          <span style={{ '--done': all > 0 ? done / all : 0 } as CSSProperties} className="w-[calc(var(--done)*100%)] rounded-full bg-current text-mark-done" />
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{`${done} / ${all}건`}</span>
      </div>
    </div>
  );
}

/**
 * 프로젝트 개요(2026-11-15, Linear의 프로젝트 개요처럼 좁은 단): 프로젝트 목록에서 프로젝트를 누르면 열린다. 표식 · 이름 ·
 * 설명, 속성(내 역할 · 멤버 · 만든 날 · 고친 날), 업무의 진행(상태별 수와 완료율), 진행 중인 사이클, 최근에 바뀐 업무와 문서를
 * 한눈에 보이고 저마다의 화면으로 이어 준다. 멤버가 아닌 프로젝트는 찾을 수 없다.
 */
export function ProjectOverviewPage({ crumbs, projectKey }: { crumbs: Crumb[]; projectKey: string }) {
  const project = useQuery(projectOptions(projectKey));
  const key = project.data?.key ?? projectKey;
  const isReady = !!project.data;
  const members = useQuery({ ...projectMembersOptions(key), enabled: isReady });
  const groups = useQuery({ ...boardGroupsOptions(key, {}, 'STATUS'), enabled: isReady });
  const cycles = useQuery({ ...cyclesOptions(key), enabled: isReady });
  const workItems = useInfiniteQuery({ ...workItemsOptions(key, { sort: 'UPDATED', direction: 'DESC' }, RECENT), enabled: isReady });
  const documents = useInfiniteQuery({ ...documentsOptions({ project: key, top: true, sort: 'UPDATED', direction: 'DESC' }), enabled: isReady });
  const at = `/workspace/projects/${encodeURIComponent(key)}`;
  const body = (data: Project) => {
    const current = cycles.data?.cycles?.find(cycle => cycle.state === 'CURRENT');
    const recentItems = workItems.data?.pages[0]?.items ?? [];
    const recentDocuments = (documents.data?.pages[0]?.items ?? []).slice(0, RECENT);
    const people = members.data ?? [];
    return (
      <div className="flex justify-center px-4 pt-8 pb-2 md:px-8 md:py-10">
        <div className="flex w-full max-w-180 min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Mark icon={data.icon} color={data.color} letter={data.key} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-balance">{data.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">{data.key}</span>
                  {data.archivedAt ? <span className="inline-flex items-center gap-1"><ArchiveIcon className="size-3.5" />보관됨</span> : null}
                  {data.myRole !== 'NONE' ? <ProjectRoleLabel role={data.myRole} /> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" nativeButton={false} render={<Link to="/workspace/projects/$key/work-items" params={{ key }} />}><NotesIcon data-icon="inline-start" />업무</Button>
              <Button variant="secondary" size="sm" nativeButton={false} render={<Link to="/workspace/projects/$key/cycles" params={{ key }} />}><RepeatIcon data-icon="inline-start" />사이클</Button>
              <Button variant="secondary" size="sm" nativeButton={false} render={<Link to="/workspace/projects/$key/documents" params={{ key }} />}><FileTextIcon data-icon="inline-start" />문서</Button>
              {data.can.manage ? <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/workspace/projects/$key/settings/general" params={{ key }} />}><SettingsIcon data-icon="inline-start" />설정</Button> : null}
            </div>
          </header>

          {data.description?.trim()
            ? <MarkdownRead value={data.description} label={`${data.name} 설명`} />
            : <p className="text-sm text-muted-foreground">설명이 없습니다.</p>}

          <dl className="flex flex-col divide-y border-y">
            <Fact label="멤버">
              <Link to={data.can.manage ? '/workspace/projects/$key/settings/members' : '/workspace/projects/$key/members'} params={{ key }} aria-label={`멤버 ${people.length}명 보기`}
                className="flex items-center gap-2 rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center">
                  {people.slice(0, FACES).map((person, index) => (
                    <span key={person.userId} className={cn('rounded-full ring-2 ring-background', index > 0 && '-ml-1.5')}><PersonAvatar id={person.userId} name={person.name} size={20} isStatic /></span>
                  ))}
                </span>
                <span className="text-muted-foreground tabular-nums">{people.length > FACES ? `외 ${people.length - FACES}명` : `${data.memberCount}명`}</span>
              </Link>
            </Fact>
            <Fact label="만든 날"><span className="tabular-nums">{day.format(new Date(data.createdAt))}</span></Fact>
            <Fact label="고친 날"><span className="tabular-nums">{day.format(new Date(data.updatedAt))}</span></Fact>
          </dl>

          <Section icon={NotesIcon} title="업무 진행" to={`${at}/work-items`} more="업무 보기">
            {groups.data ? <Progress groups={groups.data} /> : null}
          </Section>

          {current ? (
            <Section icon={RepeatIcon} title="진행 중인 사이클" to={`${at}/cycles`} more="사이클 보기">
              <CurrentCycle cycle={current} />
            </Section>
          ) : null}

          <Section icon={CalendarIcon} title="최근 업무" to={`${at}/work-items`}>
            {recentItems.length > 0
              ? <ul aria-label="최근 업무" className="flex flex-col overflow-hidden rounded-xl border bg-background">
                {/* 업무 줄은 저마다 목록 항목(li)이다. */}
                {recentItems.map(item => <WorkItemListRow key={item.id} workItem={item} href={workItemHref(item)} isCompact />)}
              </ul>
              : workItems.data ? <p className="text-sm text-muted-foreground">아직 업무가 없습니다.</p> : null}
          </Section>

          <Section icon={FileTextIcon} title="최근 문서" to={`${at}/documents`}>
            {recentDocuments.length > 0
              ? <ul aria-label="최근 문서" className="flex flex-col overflow-hidden rounded-xl border bg-background">
                {recentDocuments.map(document => (
                  <li key={document.id} className="border-b last:border-b-0">
                    <Link to="/workspace/projects/$key/documents/$documentId" params={{ key, documentId: document.id }}
                      className="flex min-h-10 items-center gap-3 px-3 text-sm outline-none hover:bg-row-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                      <FileTextIcon className="size-4 shrink-0 text-icon-muted" />
                      <span className="min-w-0 flex-1 truncate">{document.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{document.updatedByName}</span>
                      {document.updatedAt ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{shortDay.format(new Date(document.updatedAt))}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              : documents.data ? <p className="text-sm text-muted-foreground">아직 문서가 없습니다.</p> : null}
          </Section>

        </div>
      </div>
    );
  };
  return (
    <Page crumbs={pageCrumbs(crumbs)}>
      {project.error
        ? project.error instanceof ApiError && project.error.status === 404
          ? <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="없는 프로젝트이거나 멤버가 아닌 프로젝트입니다. 필요하면 프로젝트 관리자에게 멤버로 넣어 달라고 요청하세요." />
          : <PageState kind="error" title="프로젝트를 불러오지 못했습니다" description={project.error.message} />
        : project.data ? body(project.data) : null}
    </Page>
  );
}
