import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { orgChartOptions, type OrgPerson } from '@/entities/organization';
import {
  PROJECT_ROLE_LABEL, ProjectRoleLabel, projectMembershipsOptions, projectsOptions, refreshProjects, setProjectRole, type Project, type ProjectRole,
} from '@/entities/project';
import { useOpenPanel } from '@/shared/lib/panel';
import { useIsMobile } from '@/shared/lib/use-mobile';
import { Button } from '@/shared/ui/button';
import { SettingsIcon } from '@/shared/ui/icon';
import { ListMore } from '@/shared/ui/list-more';
import { MarkIcon, markTone } from '@/shared/ui/mark-picker';
import { Page } from '@/shared/ui/layout/page';
import { PageState } from '@/shared/ui/page-state';
import { memberHref, PersonAvatar } from '@/shared/ui/person';
import { SearchTool } from '@/shared/ui/search-tool';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableText } from '@/shared/ui/table';
import { toast } from '@/shared/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { pageCrumbs } from '@/shared/ui/nav-icon';
import { ParticipationDialog } from './ParticipationDialog';

type Crumb = { label: string; href?: string; icon?: string };
/** 한 사람의 참여: 프로젝트와 그 안의 역할. */
type Joined = { project: Project; role: ProjectRole };
type Row = { person: OrgPerson; projects: Joined[] };
/** 참여 관리 열기: 그 사람의 프로젝트 참여를 관리하는 대화상자를 연다(내가 관리자인 프로젝트가 있을 때만). */
type Manage = (person: OrgPerson) => void;

/** 한 칸에 그리는 프로젝트 수. 넘치면 +n으로 줄이고, 가리키면 전부 보인다. */
const SHOWN = 3;

const dash = (value?: string | null) => value || <span className="text-muted-foreground">-</span>;

/** 프로젝트 하나: 그 표식(아이콘 · 색)과 이름, 그 안의 역할. 누르면 그 프로젝트의 업무로. */
function ProjectChip({ joined: { project, role } }: { joined: Joined }) {
  return (
    <Link to="/workspace/projects/$key/work-items" params={{ key: project.key }}
      className="relative z-1 flex h-6 max-w-44 min-w-0 shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
      {/* check-ui: allow-style 프로젝트 표식의 색은 관리자가 고른 데이터다. */}
      <span style={markTone(project.color)} className="flex text-(--mark,currentColor) [&_svg]:size-3.5"><MarkIcon name={project.icon ?? 'projects'} /></span>
      <span className="truncate">{project.name}</span>
      <ProjectRoleLabel role={role} />
    </Link>
  );
}

/** 참여한 프로젝트들(Linear 멤버 표의 Teams): 앞의 셋과 +n, 관리할 수 있으면 끝에 참여 관리(톱니). */
function Projects({ row, onManage }: { row: Row; onManage?: Manage }) {
  const rest = row.projects.slice(SHOWN);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {row.projects.length === 0 ? <span className="text-muted-foreground">-</span> : null}
      {row.projects.slice(0, SHOWN).map(joined => <ProjectChip key={joined.project.id} joined={joined} />)}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} className="relative z-1 flex h-6 shrink-0 items-center rounded-md bg-muted px-2 text-xs text-muted-foreground">+{rest.length}</span>} />
          <TooltipContent>{rest.map(joined => `${joined.project.name} ${PROJECT_ROLE_LABEL[joined.role]}`).join(', ')}</TooltipContent>
        </Tooltip>
      )}
      {onManage ? <ManageButton row={row} onManage={onManage} /> : null}
    </span>
  );
}

/** 프로젝트 참여 관리(톱니, 참여 칸 끝): 누르면 이 사람의 참여를 관리하는 대화상자가 열린다(ParticipationDialog). */
function ManageButton({ row, onManage }: { row: Row; onManage: (person: OrgPerson) => void }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`${row.person.name}의 프로젝트 참여 관리`} title="프로젝트 참여 · 역할 관리"
      className="relative z-1 shrink-0 text-icon-muted max-md:size-11" onClick={() => onManage(row.person)}>
      <SettingsIcon />
    </Button>
  );
}

/** 이름 칸: 사진과 이름. 이름 단추가 줄 전체를 덮어(::after) 어디를 눌러도 프로필이 열린다. */
function Name({ person, onOpen }: { person: OrgPerson; onOpen: () => void }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PersonAvatar id={person.id} name={person.name} size={20} isStatic />
      <button type="button" aria-label={`${person.name} 프로필 열기`} onClick={onOpen}
        className="truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
        {person.name}
      </button>
    </span>
  );
}

/** 데스크톱 표(Linear의 Members 표): 이름 · 이메일 · 참여 프로젝트. */
function MembersTable({ rows, onOpen, onManage }: { rows: Row[]; onOpen: (id: string) => void; onManage?: Manage }) {
  return (
    <Table aria-label="멤버" className="bg-background">
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead className="w-56">이메일</TableHead>
          <TableHead>참여 프로젝트</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.person.id} className="group/row relative bg-background hover:bg-row-hover">
            <TableCell><Name person={row.person} onOpen={() => onOpen(row.person.id)} /></TableCell>
            <TableCell className="text-muted-foreground"><TableText className="max-w-56">{dash(row.person.workEmail)}</TableText></TableCell>
            <TableCell><Projects row={row} onManage={onManage} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** 휴대폰 줄: 사진 · 이름, 그 아래 참여 프로젝트. */
function MemberRow({ row, onOpen, onManage }: { row: Row; onOpen: () => void; onManage?: Manage }) {
  return (
    <li className="relative flex flex-col gap-2 border-b bg-background px-4 py-3">
      <span className="flex min-w-0 items-center gap-2">
        <Name person={row.person} onOpen={onOpen} />
      </span>
      {row.projects.length > 0 || onManage ? <span className="pl-8"><Projects row={row} onManage={onManage} /></span> : null}
    </li>
  );
}

/**
 * 업무 › 워크스페이스 › 멤버 (Linear의 Members): 업무 공간의 사람들과 저마다 참여한 프로젝트와 그 역할(뷰어 · 에디터 · 관리자).
 * 데스크톱은 표, 휴대폰은 줄 목록이다. 프로젝트에 참여 중인 사람을 앞에, 아직 없는 사람을 뒤에 두고 이름으로 찾는다. 줄을 누르면
 * 그 사람의 프로필, 프로젝트를 누르면 그 업무로 간다. 내가 관리자인 프로젝트(워크스페이스 관리자는 모든 프로젝트)가 있으면 참여 칸
 * 끝의 톱니로 대화상자를 열어 그 프로젝트들을 찾고, 참여시키고 역할을 바꾸고 뺀다(2026-11-15). 역할은 아이콘과 이름으로 보인다. 보이는 참여는 내가 볼 수 있는 프로젝트의 것뿐이다.
 */
export function WorkspaceMembersPage({ crumbs }: { crumbs: Crumb[] }) {
  const openPanel = useOpenPanel();
  const isMobile = useIsMobile();
  const [words, setWords] = useState('');
  const chart = useQuery(orgChartOptions());
  const projects = useQuery(projectsOptions('ACTIVE'));
  const memberships = useQuery(projectMembershipsOptions());
  const client = useQueryClient();
  const managed = (projects.data ?? []).filter(project => project.can.manage);
  const change = useMutation({
    mutationFn: ({ project, userId, role, isIn }: { project: Project; userId: string; role: ProjectRole | null; isIn: boolean }) => setProjectRole(project.key, userId, role, isIn),
    onSuccess: (_, { project, role, isIn }) => toast.add({ title: role === null ? `${project.name}에서 뺐습니다.` : isIn ? `${project.name}의 역할을 바꿨습니다.` : `${project.name}에 추가했습니다.` }),
    onError: (error: Error) => toast.add({ title: error.message }),
    onSettled: () => refreshProjects(client),
  });
  const [managing, setManaging] = useState<OrgPerson | null>(null);
  const onManage: Manage | undefined = managed.length > 0 ? setManaging : undefined;
  const open = (id: string) => openPanel(memberHref(id));
  const body = () => {
    const error = chart.error ?? projects.error ?? memberships.error;
    if (error) return <PageState kind="error" title="멤버를 불러오지 못했습니다" description={error.message} />;
    if (!chart.data || !projects.data || !memberships.data) return null;
    const byId = new Map(projects.data.map(project => [project.id, project]));
    const order = new Map(projects.data.map((project, index) => [project.id, index]));
    const projectsOf = (person: OrgPerson) => memberships.data
      .filter(each => each.userId === person.id && byId.has(each.projectId))
      .sort((one, other) => (order.get(one.projectId) ?? 0) - (order.get(other.projectId) ?? 0))
      .map(each => ({ project: byId.get(each.projectId)!, role: each.role }));
    const needle = words.trim().toLowerCase();
    const rows: Row[] = chart.data.people
      .filter(person => !needle || person.name.toLowerCase().includes(needle) || (person.workEmail ?? '').toLowerCase().includes(needle))
      .map(person => ({ person, projects: projectsOf(person) }))
      .sort((one, other) => Number(other.projects.length > 0) - Number(one.projects.length > 0) || one.person.name.localeCompare(other.person.name, 'ko'));
    if (rows.length === 0) return <PageState kind="search" title="찾는 멤버가 없습니다" />;
    const joined = rows.filter(row => row.projects.length > 0).length;
    const foot = <ListMore shown={rows.length} total={chart.data.people.length} unit="명" meta={`프로젝트 참여 ${joined}명`} hasMore={false} onMore={() => undefined} />;
    if (isMobile) return <>
      <ul aria-label="멤버">{rows.map(row => <MemberRow key={row.person.id} row={row} onOpen={() => open(row.person.id)} onManage={onManage} />)}</ul>
      {foot}
    </>;
    return <><MembersTable rows={rows} onOpen={open} onManage={onManage} />{foot}</>;
  };
  return (
    <Page crumbs={pageCrumbs(crumbs)} tools={<SearchTool label="멤버 검색" placeholder="이름이나 이메일" value={words} onChange={setWords} />}>
      {body()}
      {managing && memberships.data ? <ParticipationDialog name={managing.name} projects={managed} isPending={change.isPending}
        roles={new Map(memberships.data.filter(each => each.userId === managing.id).map(each => [each.projectId, each.role]))}
        onChange={(project, role, isIn) => change.mutate({ project, userId: managing.id, role, isIn })}
        onClose={() => setManaging(null)} /> : null}
    </Page>
  );
}
