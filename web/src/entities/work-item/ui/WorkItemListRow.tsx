import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { DetailLink } from '@/shared/ui/detail-surface';
import { ChevronDownIcon, ChevronRightIcon, ProjectsIcon } from '@/shared/ui/icon';
import { formatWorkItemDate } from '../model/date';
import type { WorkItemRow } from '../model/types';
import { WorkItemAssignee } from './WorkItemAssignee';
import { WorkItemDueDate } from './WorkItemDueDate';
import { WorkItemLabels } from './WorkItemLabels';
import { WorkItemPriorityIcon, WorkItemStatusIcon, WorkItemTypeIcon } from './WorkItemMarks';
import { WorkItemPullRequests } from './WorkItemPullRequests';

type Tree = { depth: number; children: number; isOpen: boolean; parentLabel?: string; onToggle: () => void };

/** 줄은 자기 바탕을 칠해 페이지의 점 무늬를 가리고, 가리키면 옅게 덮는다. 줄 링크(::after)가 이 줄을 덮는다. */
const ROW = 'relative border-b bg-background text-sm hover:bg-row-hover';

/** 프로젝트 이름: 그 프로젝트의 업무 목록으로 가는 작은 링크. 줄 링크 위에 떠서 따로 눌린다. */
function ProjectLink({ workItem, className }: { workItem: WorkItemRow; className?: string }) {
  return <Link to={`/workspace/projects/${encodeURIComponent(workItem.projectKey)}/work-items`}
    className={cn('relative z-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground', className)}>
    <ProjectsIcon className="size-3.5 shrink-0 text-icon-muted" />
    <span className="truncate">{workItem.projectName}</span>
  </Link>;
}

/** 제목: 상세를 여는 줄 링크(줄 어디를 눌러도 열린다), 부모가 목록 밖이면 그 아래에 누구의 하위 업무인지. */
function Title({ workItem, href, parentLabel, className }: { workItem: WorkItemRow; href?: string; parentLabel?: string; className?: string }) {
  const title = href
    ? <DetailLink href={href} className="truncate">{workItem.title}</DetailLink>
    : <span className="truncate">{workItem.title}</span>;
  if (!parentLabel) return <span className={cn('flex min-w-0', className)}>{title}</span>;
  return <span className={cn('flex min-w-0 flex-col', className)}>
    {title}
    <span className="truncate text-xs text-muted-foreground">{parentLabel}</span>
  </span>;
}

/**
 * 업무 번호와 상태는 제목 앞에 모은다. 오른쪽은 유형과 선택 정보, 프로젝트, 담당자, 수정일 순서다.
 * 휴대폰에서는 제목 아래 한 줄에 왼쪽은 이 업무가 무엇인지(유형·마감·프로젝트), 오른쪽은 담당자와 메뉴를 둔다.
 * 그 줄을 오른쪽 끝에만 몰아 두면 빈 줄처럼 보였다.
 */
export function WorkItemListRow({ workItem, href, isCompact = false, isSelected, showsProject = false, tree, actions }: {
  workItem: WorkItemRow;
  href?: string;
  isCompact?: boolean;
  isSelected?: boolean;
  showsProject?: boolean;
  tree?: Tree;
  /** 행 끝의 메뉴(삭제 같은 조작). 기능 층에서 넣는다. */
  actions?: ReactNode;
}) {
  const start = <span className={cn('flex shrink-0 items-center gap-2', tree?.depth ? (isCompact ? 'pl-8' : 'pl-10') : undefined)}>
    {tree?.children
      ? <Button variant="ghost" size="icon-xs" aria-expanded={tree.isOpen} aria-label={`${workItem.ref} 하위 업무 ${tree.isOpen ? '접기' : '펼치기'}`}
        className="relative z-1 max-md:size-11"
        onClick={event => { event.preventDefault(); event.stopPropagation(); tree.onToggle(); }}>
        {tree.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </Button>
      : tree?.depth ? <svg width="1rem" height="1rem" viewBox="0 0 16 16" aria-label="하위 업무" role="img" className="shrink-0 text-icon-muted">
        <path d="M3 1v8h10" fill="none" stroke="currentColor" />
      </svg> : null}
    <WorkItemPriorityIcon priority={workItem.priority} />
    <span className={cn('truncate text-muted-foreground tabular-nums', isCompact ? 'max-w-20' : 'max-w-30')}>{workItem.ref}</span>
    <WorkItemStatusIcon category={workItem.category} label={workItem.columnName} />
  </span>;
  const due = workItem.dueDate ? <WorkItemDueDate dueDate={workItem.dueDate} category={workItem.category} prefix="마감" /> : null;
  const selected = isSelected ? 'bg-accent' : undefined;
  if (isCompact) return <li aria-current={isSelected || undefined}
    className={cn(ROW, 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-4 py-3', selected)}>
    {start}
    <Title workItem={workItem} href={href} parentLabel={tree?.parentLabel} />
    <span className="col-start-2 flex min-w-0 items-center justify-between gap-2">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <WorkItemTypeIcon type={workItem.type} showsLabel />
        {due}
        {showsProject && workItem.projectName ? <ProjectLink workItem={workItem} className="max-w-24" /> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <WorkItemAssignee fitsContent isCompact id={workItem.assigneeId} name={workItem.assigneeName} />
        {actions}
      </span>
    </span>
  </li>;
  return <li aria-current={isSelected || undefined} className={cn(ROW, 'flex items-center gap-2 px-4 py-3 compact:py-2', selected)}>
    {start}
    <Title workItem={workItem} href={href} parentLabel={tree?.parentLabel} className="flex-1" />
    <span className="flex shrink-0 items-center gap-2.5">
      <WorkItemTypeIcon type={workItem.type} showsLabel className="max-w-18" />
      <WorkItemPullRequests counts={workItem.pullRequests} />
      <WorkItemLabels labels={workItem.labels} className="max-w-60" />
      {due}
      {showsProject && workItem.projectName ? <ProjectLink workItem={workItem} className="max-w-28" /> : null}
      <WorkItemAssignee fitsContent id={workItem.assigneeId} name={workItem.assigneeName} />
      <span aria-label="수정일" className="w-12 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">{formatWorkItemDate(workItem.updatedAt)}</span>
      {actions}
    </span>
  </li>;
}
