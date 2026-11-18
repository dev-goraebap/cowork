import { usePageLocation } from '@/shared/lib/route-location';
import { useQuery } from '@tanstack/react-query';
import { unmaskDialogHref } from '@/shared/lib/panel';
import { isWorkItemViewChange } from './work-item-view-transition';
import { Navigate, Outlet, lazyRouteComponent, createRootRouteWithContext, createRoute, createRouter, redirect, useChildMatches, useLocation, useParams } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { ComponentType, ReactNode } from 'react';
import { projectOptions } from '@/entities/project';

import { sessionOptions, type Session } from '@/shared/auth';
import type { SplitMode } from '@/shared/ui/layout/split-view';
import { FIXED_SPACES, crumbsOf, projectKeyOf, roleOfSpace, type AdminRole } from '@/widgets/app-shell';
import { AuthLayout } from './AuthLayout';
import { preparePage } from './prepare-page';

const DocumentLabelsPage = lazyRouteComponent(() => import('@/pages/workspace-settings/document-labels'), 'DocumentLabelsPage');
const AgentTokensPage = lazyRouteComponent(() => import('@/pages/account/agents'), 'AgentTokensPage');
const DisplayPage = lazyRouteComponent(() => import('@/pages/account/display'), 'DisplayPage');
const NotificationSettingsPage = lazyRouteComponent(() => import('@/pages/account/notification-settings'), 'NotificationSettingsPage');
const ProfilePage = lazyRouteComponent(() => import('@/pages/account/profile'), 'ProfilePage');
const SearchPage = lazyRouteComponent(() => import('@/pages/workspace/search'), 'SearchPage');
const PushDeliveriesPage = lazyRouteComponent(() => import('@/pages/instance/push-deliveries'), 'PushDeliveriesPage');
const RolesPage = lazyRouteComponent(() => import('@/pages/instance/members'), 'RolesPage');
const SystemStatusPage = lazyRouteComponent(() => import('@/pages/instance/system-status'), 'SystemStatusPage');
const WorkspaceGeneralPage = lazyRouteComponent(() => import('@/pages/workspace-settings/general'), 'WorkspaceGeneralPage');
const WorkspaceRolesPage = lazyRouteComponent(() => import('@/pages/workspace-settings/roles'), 'WorkspaceRolesPage');
const WorkItemLabelsPage = lazyRouteComponent(() => import('@/pages/workspace-settings/work-item-labels'), 'WorkItemLabelsPage');
const WorkItemTypesPage = lazyRouteComponent(() => import('@/pages/workspace-settings/work-item-types'), 'WorkItemTypesPage');
const ComingSoonPage = lazyRouteComponent(() => import('@/pages/workspace/coming-soon'), 'ComingSoonPage');
const ProjectGeneralPage = lazyRouteComponent(() => import('@/pages/workspace/project-settings'), 'ProjectGeneralPage');
const ProjectIntegrationsPage = lazyRouteComponent(() => import('@/pages/workspace/project-settings'), 'ProjectIntegrationsPage');
const ProjectWorkflowPage = lazyRouteComponent(() => import('@/pages/workspace/project-settings'), 'ProjectWorkflowPage');
const ProjectCycleSettingsPage = lazyRouteComponent(() => import('@/pages/workspace/project-settings'), 'ProjectCycleSettingsPage');
const NewWorkItemPage = lazyRouteComponent(() => import('@/pages/workspace/work-items'), 'NewWorkItemPage');
const WorkItemPage = lazyRouteComponent(() => import('@/pages/workspace/work-items'), 'WorkItemPage');
const WorkItemEditPage = lazyRouteComponent(() => import('@/pages/workspace/work-items'), 'WorkItemEditPage');
const DocumentEditPage = lazyRouteComponent(() => import('@/pages/workspace/documents'), 'DocumentEditPage');
const MyWorkPage = lazyRouteComponent(() => import('@/pages/workspace/work-items'), 'MyWorkPage');
const LoginGate = lazyRouteComponent(() => import('@/pages/auth/login'), 'LoginGate');
const WelcomePage = lazyRouteComponent(() => import('@/pages/auth/onboarding'), 'WelcomePage');
const WorkspaceMembersPage = lazyRouteComponent(() => import('@/pages/workspace/workspace-members'), 'WorkspaceMembersPage');
const NotificationsPage = lazyRouteComponent(() => import('@/pages/workspace/inbox'), 'NotificationsPage');
const DocumentBoxPage = lazyRouteComponent(() => import('@/pages/workspace/documents'), 'DocumentBoxPage');
const DocumentPagesManager = lazyRouteComponent(() => import('@/pages/workspace/documents'), 'DocumentPagesManager');
const BodyHistoryPage = lazyRouteComponent(() => import('@/pages/workspace/body-history'), 'BodyHistoryPage');
const ProjectWorkItemsPage = lazyRouteComponent(() => import('@/pages/workspace/project-work-items'), 'ProjectWorkItemsPage');
const ProjectMembersPage = lazyRouteComponent(() => import('@/pages/workspace/project-members'), 'ProjectMembersPage');
const ProjectCyclesPage = lazyRouteComponent(() => import('@/pages/workspace/project-cycles'), 'ProjectCyclesPage');
const ProjectSchedulePage = lazyRouteComponent(() => import('@/pages/workspace/project-schedule'), 'ProjectSchedulePage');
const ProjectsPage = lazyRouteComponent(() => import('@/pages/workspace/projects'), 'ProjectsPage');
const ProjectOverviewPage = lazyRouteComponent(() => import('@/pages/workspace/projects'), 'ProjectOverviewPage');

/**
 * The app's addresses: /login, and under the signed-in layout one page per entry of every menu (the main menu, 내 계정,
 * each administration, a project's), the pages built so far (PAGES; the rest say they are on their way), and their
 * detail and new pages. An administration's addresses, and a project's settings, are for those holding its role; an
 * address the app does not know goes home (the projects).
 */
const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => <Outlet />,
});

/**
 * 페이지 머리의 경로 한 단계. 아이콘은 이름(글자)이다: 메뉴(widgets/app-shell의 crumbsOf)가 정한 것을 그대로 페이지에 넘긴다.
 */
type Crumb = ReturnType<typeof crumbsOf>[number];

const HOME = '/workspace/projects';
const home = () => redirect({ href: HOME, replace: true });
const needs = (session: Session, role?: AdminRole) => !role || (session.roles ?? []).includes(role);

function LoginRoute() {
  return <LoginGate onSignedIn={async () => {
    // 인증 경계에서는 라우트 선읽기와 조회 캐시를 포함한 브라우저 앱 상태를 새로 만든다.
    window.location.replace(HOME);
  }} />;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/login', component: LoginRoute,
  beforeLoad: async ({ context }) => {
    if (await context.queryClient.ensureQueryData(sessionOptions())) throw redirect({ to: '/', replace: true });
  },
});

/** 문서를 하위 페이지까지 이어 붙인 인쇄용 화면(PDF 내보내기): 앱 틀 없이, 로그인한 사람만. */
const printRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/print/documents/$documentId',
  component: lazyRouteComponent(() => import('@/pages/workspace/document-print'), 'DocumentPrintPage'),
  beforeLoad: async ({ context }) => {
    if (!await context.queryClient.ensureQueryData(sessionOptions())) throw redirect({ to: '/login', replace: true });
  },
});

/** 처음 로그인한 사람의 환영(온보딩): 마치면 홈으로 가고, 마친 사람은 다시 오지 않는다. */
function WelcomeRoute() {
  return <WelcomePage onDone={() => window.location.replace(HOME)} />;
}
const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/welcome', component: WelcomeRoute,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions());
    if (!session) throw redirect({ to: '/login', replace: true });
    if (session.onboarded) throw redirect({ href: HOME, replace: true });
  },
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute, id: 'app', component: AuthLayout,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions());
    if (!session) throw redirect({ to: '/login' });
    if (!session.onboarded) throw redirect({ to: '/welcome', replace: true });
    return { session };
  },
});

/** The head's path for the address in view, a project's titled with the project's name. */
function useCrumbs(): Crumb[] {
  const { pathname } = usePageLocation();
  const key = projectKeyOf(pathname);
  const project = useQuery({ ...projectOptions(key ?? ''), enabled: !!key });
  return crumbsOf(pathname, project.data?.name);
}

/** The menu pages built so far, by address; each takes its head's path. */
const PAGES: Record<string, ComponentType<{ crumbs: Crumb[] }>> = {
  '/my-work': MyWorkPage,
  '/workspace/documents': DocumentBoxPage,
  '/workspace/members': WorkspaceMembersPage,
  '/profile': ProfilePage,
  '/profile/notifications': NotificationSettingsPage,
  '/profile/display': DisplayPage,
  '/profile/agent-tokens': AgentTokensPage,
  '/instance/roles': RolesPage,
  '/instance/system': SystemStatusPage,
  '/instance/push-deliveries': PushDeliveriesPage,
  '/workspace/admin/general': WorkspaceGeneralPage,
  '/workspace/admin/roles': WorkspaceRolesPage,
  '/workspace/admin/document-labels': DocumentLabelsPage,
  '/workspace/admin/labels': WorkItemLabelsPage,
  '/workspace/admin/types': WorkItemTypesPage,
};

/** The page at a menu's address (one not built yet says it is on its way). */
function EntryRoute() {
  const { pathname } = usePageLocation();
  const Shown = PAGES[pathname] ?? ComingSoonPage;
  return <Shown crumbs={useCrumbs()} />;
}

const pageComponents = new Map<string, unknown>(Object.entries(PAGES));
pageComponents.set('/workspace/projects', ProjectsPage);
pageComponents.set('/workspace/projects/$key', ProjectOverviewPage);
pageComponents.set('/workspace/projects/$key/settings/general', ProjectGeneralPage);
pageComponents.set('/workspace/projects/$key/settings/workflow', ProjectWorkflowPage);
pageComponents.set('/workspace/projects/$key/settings/integrations', ProjectIntegrationsPage);
pageComponents.set('/workspace/projects/$key/settings/cycles', ProjectCycleSettingsPage);
pageComponents.set('/workspace/projects/$key/settings/members', ProjectMembersPage);
function preloadPage(pathname: string) {
  for (const [pattern, view] of pageComponents) {
    if (new RegExp('^' + pattern.split('/').map(part => part.startsWith('$') ? '[^/]+' : part).join('/') + '$').test(pathname))
      return (view as { preload?: () => Promise<unknown> }).preload?.();
  }
}
const pageData = {
  loaderDeps: ({ search }: { search: Record<string, unknown> }) => search,
  loader: ({ context, location }: { context: { queryClient: QueryClient }; location: { pathname: string; searchStr: string } }) =>
    Promise.all([preloadPage(location.pathname), preparePage(context.queryClient, location.pathname, location.searchStr)]),
  staleTime: 0,
};

type Params = Record<string, string>;
/** A page under a menu's address (a detail, a new one): drawn from the head's path and the address's parts. */
const page = (path: string, view: unknown, draw: (crumbs: Crumb[], params: Params) => ReactNode, role?: AdminRole) => {
  pageComponents.set(path, view);
  return createRoute({
  getParentRoute: () => appRoute, path, ...pageData,
  beforeLoad: ({ context }) => { if (!needs(context.session, role)) throw home(); },
  component: function Page() { return draw(useCrumbs(), useParams({ strict: false }) as Params); },
});
};

const pageRoutes = [
  // 검색 over everything (a dialog over the page in view on a desktop, app's panel host).
  page('/search', SearchPage, () => <SearchPage crumbs={[{ label: '검색', icon: 'search' }]} />),
  // A document (a 매뉴얼's chapter ?chapter=) of the workspace's 문서함, under it in its head.
  page('/workspace/documents/$documentId', DocumentBoxPage, (crumbs, { documentId }) => <DocumentBoxPage crumbs={crumbs} documentId={documentId} />),
  // 내 업무에서 연 업무 · 새 업무는 /my-work 아래에 둔다(메뉴가 내 업무에 그대로 선다, 2026-11-15). 전체 업무 목록은 없앴다.
  page('/my-work/new', NewWorkItemPage, crumbs => <NewWorkItemPage crumbs={crumbs} />),
  page('/my-work/$ref', WorkItemPage, (crumbs, { ref }) => <WorkItemPage crumbs={crumbs} workItemRef={ref} />),
  // 업무의 수정 화면: 상세의 편집 단추가 연다(제목과 본문만 고치는 화면).
  page('/my-work/$ref/edit', WorkItemEditPage, (crumbs, { ref }) => <WorkItemEditPage crumbs={crumbs} workItemRef={ref} />),
];

/**
 * Addresses that moved ($id carried over, with the query), so a bookmark and a notice left before still land: client/'s
 * 오피스 ones that were renamed, and web/'s old 업무 ones.
 */
const MOVED: Record<string, string> = {
  // 업무 was at /issues before it took the name work items (the server API keeps issues).
  '/issues': '/my-work',
  '/issues/$id': '/my-work/$id',
};

/** Addresses standing for a menu, taking one to its first page, and the moved ones. */
const REDIRECTS: Record<string, string> = {
  ...MOVED,
  '/workspace/documents/ai-notes': '/workspace/documents',
  '/workspace/documents/ai-notes/$id': '/workspace/documents',
  '/': HOME,
  '/instance': '/instance/roles',
  '/workspace/admin': '/workspace/admin/general',
  '/workspace/projects/new': '/workspace/projects',
};

/**
 * 공간 접두가 붙기 전의 주소(2026-11-15까지): 최상위에 있던 오피스 · 워크스페이스 화면은 /office/… · /workspace/…로, 내 업무는
 * /my-work로 넘긴다. 그 아래 주소와 쿼리를 그대로 옮긴다(알림에 남은 옛 링크, 즐겨찾기, 에이전트가 받아 둔 주소).
 */
const SPACE_MOVED: [from: string, to: string][] = [
  ['/projects/admin', '/workspace/admin'],
  ['/projects', '/workspace/projects'],
  ['/work-items', '/my-work'],
  // 잠깐 쓰던 주소(/workspace/work-items/{REF})도 내 업무 아래로.
  ['/workspace/work-items', '/my-work'],
  ['/documents', '/workspace/documents'],
];
const spaceMovedRoutes = SPACE_MOVED.flatMap(([from, to]) => [from, `${from}/$`].map(path => createRoute({
  getParentRoute: () => appRoute, path, ...pageData,
  beforeLoad: ({ params, location }) => {
    const rest = (params as Params)._splat;
    throw redirect({ href: `${to}${rest ? `/${rest}` : ''}${location.searchStr}`, replace: true });
  },
})));

const redirectRoutes = Object.entries(REDIRECTS).map(([path, to]) => createRoute({
  getParentRoute: () => appRoute, path, ...pageData,
  beforeLoad: ({ params, location }) => {
    throw redirect({ href: to.replace('$id', (params as Params).id ?? '') + location.searchStr, replace: true });
  },
}));

/**
 * A body's 버전 기록 at its old short addresses (useMaskedDialog): they open the page with it open. A project's document's and
 * work item's …/history are pages of their own (BodyHistoryPage): the detail opens the same address as a dialog.
 */
const historyRoutes = ['/my-work/$ref/history', '/workspace/documents/$documentId/history']
  .map(path => createRoute({
    getParentRoute: () => appRoute, path, ...pageData,
    beforeLoad: ({ location }) => { throw redirect({ href: unmaskDialogHref(location.pathname, location.searchStr, 'history'), replace: true }); },
  }));

/**
 * The inboxes (받은 알림, 결재함): the list's address and the chosen item's under it (/notifications/{id},
 * /approvals/{id}) are one page that stays while the address moves between them, so the list keeps its place and
 * filters; the item's address has no page of its own (the page reads it). The page decides a phone's detail page.
 */
const INBOXES: Record<string, ComponentType<{ crumbs: Crumb[]; id?: string }>> = {
  '/notifications': NotificationsPage,
};
const inboxRoutes = Object.entries(INBOXES).map(([path, Inbox]) => {
  pageComponents.set(path, Inbox);
  pageComponents.set(path + '/$id', Inbox);
  const route = createRoute({
    getParentRoute: () => appRoute, path, ...pageData,
    component: function InboxRoute() {
      const { id } = useParams({ strict: false }) as Params;
      return <Inbox crumbs={useCrumbs()} id={id} />;
    },
  });
  return route.addChildren([createRoute({ getParentRoute: () => route, path: '$id' })]);
});

/**
 * 공지사항 · 회의록 (2026-11-14): laid out as the inboxes are, the list and the one opened beside it on a desktop. The
 * list's address and those under it (one item /{id}, writing a new one /new, changing one /{id}/edit) are one page that
 * stays while the address moves between them, so the list keeps its place, search and filters. The page reads which
 * one is open (mode) and decides a phone's own pages.
 */
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** 목록-상세 분할의 아래 주소가 여는 것(SPLITS). */
    splitMode?: SplitMode;
  }
}
/** 아래 주소마다 무엇을 여는가. 주소의 끝 글자가 아니라 맞은 라우트가 정한다. */
const SPLITS: Record<string, { view: ComponentType<{ crumbs: Crumb[]; id?: string; mode: SplitMode }>; children: Record<string, SplitMode> }> = {
};
const splitRoutes = Object.entries(SPLITS).map(([path, { view: Split, children }]) => {
  pageComponents.set(path, Split);
  for (const child of Object.keys(children)) pageComponents.set(`${path}/${child}`, Split);
  const route = createRoute({
    getParentRoute: () => appRoute, path, ...pageData,
    component: function SplitRoute() {
      const { id } = useParams({ strict: false }) as Params;
      const child = useChildMatches({ select: matches => matches[0]?.staticData.splitMode });
      return <Split crumbs={useCrumbs()} id={id} mode={child ?? 'list'} />;
    },
  });
  return route.addChildren(Object.entries(children).map(([child, splitMode]) =>
    createRoute({ getParentRoute: () => route, path: child, staticData: { splitMode } })));
});

// 메뉴 항목마다 길 하나. 두 공간에 함께 서는 항목(탐색 · 알림함 · 내 업무)은 한 번만, 제 길이 따로 있는 것(검색 · 프로젝트 목록)은 뺀다.
const entryPaths = new Set<string>();
const entryRoutes = FIXED_SPACES.flatMap(space => space.sections.flatMap(section => section.entries)
  .filter(entry => !(entry.path in REDIRECTS) && !(entry.path in INBOXES) && !(entry.path in SPLITS) && entry.path !== '/workspace/projects' && entry.path !== '/search')
  .filter(entry => !entryPaths.has(entry.path) && !!entryPaths.add(entry.path))
  .map(entry => createRoute({
    getParentRoute: () => appRoute, path: entry.path, component: EntryRoute, ...pageData,
    beforeLoad: ({ context }) => { if (!needs(context.session, roleOfSpace(space))) throw home(); },
  })));

function ProjectsRoute() {
  return <ProjectsPage crumbs={useCrumbs()} />;
}
const projectsRoute = createRoute({ getParentRoute: () => appRoute, path: '/workspace/projects', component: ProjectsRoute, ...pageData });

const projectRoute = createRoute({ getParentRoute: () => appRoute, path: '/workspace/projects/$key' });

/** A page in a project's menu, drawn from the head's path and the address's parts (the project's key among them). */
const projectPage = (path: string, view: unknown, draw: (crumbs: Crumb[], params: Params) => ReactNode) => {
  pageComponents.set('/workspace/projects/$key/' + path, view);
  return createRoute({
  getParentRoute: () => projectRoute, path, ...pageData,
  component: function ProjectPage() { return draw(useCrumbs(), useParams({ strict: false }) as Params); },
});
};

const projectPageRoutes = [
  // 프로젝트의 첫 화면은 개요다(2026-11-15, 전에는 업무로 넘겼다): 프로젝트 목록에서 프로젝트를 누르면 열린다.
  projectPage('/', ProjectOverviewPage, (crumbs, { key }) => <ProjectOverviewPage crumbs={crumbs} projectKey={key ?? ''} />),
  projectPage('work-items', ProjectWorkItemsPage, crumbs => <ProjectWorkItemsPage crumbs={crumbs} />),
  projectPage('work-items/new', NewWorkItemPage, (crumbs, { key }) => <NewWorkItemPage crumbs={crumbs} projectKey={key} />),
  projectPage('work-items/$number', WorkItemPage, (crumbs, { key, number }) => <WorkItemPage crumbs={crumbs} projectKey={key} number={Number(number)} />),
  projectPage('work-items/$number/edit', WorkItemEditPage, (crumbs, { key, number }) => <WorkItemEditPage crumbs={crumbs} projectKey={key} number={Number(number)} />),
  projectPage('schedule', ProjectSchedulePage, (crumbs, { key }) => <ProjectSchedulePage crumbs={crumbs} projectKey={key} />),
  projectPage('documents', DocumentBoxPage, (crumbs, { key }) => <DocumentBoxPage crumbs={crumbs} projectKey={key} />),
  projectPage('documents/$documentId', DocumentBoxPage, (crumbs, { key, documentId }) => <DocumentBoxPage crumbs={crumbs} projectKey={key} documentId={documentId} />),
  projectPage('documents/$documentId/edit', DocumentEditPage, (crumbs, { key, documentId }) => <DocumentEditPage crumbs={crumbs} projectKey={key ?? ''} documentId={documentId ?? ''} />),
  projectPage('documents/$documentId/history', BodyHistoryPage, (crumbs, { key, documentId }) => <BodyHistoryPage crumbs={crumbs} target={{ kind: 'document', projectKey: key ?? '', documentId: documentId ?? '' }} />),
  projectPage('documents/$documentId/history/$versionId', BodyHistoryPage, (crumbs, { key, documentId, versionId }) => <BodyHistoryPage crumbs={crumbs} target={{ kind: 'document', projectKey: key ?? '', documentId: documentId ?? '' }} versionId={versionId} />),
  projectPage('work-items/$number/history', BodyHistoryPage, (crumbs, { key, number }) => <BodyHistoryPage crumbs={crumbs} target={{ kind: 'work-item', projectKey: key ?? '', number: Number(number) }} />),
  projectPage('work-items/$number/history/$versionId', BodyHistoryPage, (crumbs, { key, number, versionId }) => <BodyHistoryPage crumbs={crumbs} target={{ kind: 'work-item', projectKey: key ?? '', number: Number(number) }} versionId={versionId} />),
  projectPage('documents/$documentId/pages', DocumentPagesManager, (crumbs, { key, documentId }) => <DocumentPagesManager crumbs={crumbs} projectKey={key} documentId={documentId} />),
  projectPage('members', ProjectMembersPage, crumbs => <ProjectMembersPage crumbs={crumbs} />),
  projectPage('cycles', ProjectCyclesPage, crumbs => <ProjectCyclesPage crumbs={crumbs} />),
];

/** A project's old 업무 addresses (/projects/{key}/issues, /issues/{number}) moved to work-items, with the query. */
const projectMovedRoutes = ['issues', 'issues/$number'].map(path => createRoute({
  getParentRoute: () => projectRoute, path, ...pageData,
  beforeLoad: ({ params, location }) => {
    const { key, number } = params as Params;
    throw redirect({ href: `/workspace/projects/${key}/work-items${number ? `/${number}` : ''}${location.searchStr}`, replace: true });
  },
}));

/** A project's settings, with each section's component and reads prepared before entry. */
function ProjectSettingsRoute() {
  const crumbs = useCrumbs();
  const { key, section } = useParams({ strict: false }) as Params;
  if (section === 'general') return <ProjectGeneralPage crumbs={crumbs} projectKey={key ?? ''} />;
  if (section === 'workflow') return <ProjectWorkflowPage crumbs={crumbs} projectKey={key ?? ''} />;
  if (section === 'integrations') return <ProjectIntegrationsPage crumbs={crumbs} projectKey={key ?? ''} />;
  if (section === 'cycles') return <ProjectCycleSettingsPage crumbs={crumbs} projectKey={key ?? ''} />;
  // 프로젝트에 사람을 넣고 빼는 곳(Linear의 팀 설정 › Members). 프로젝트 메뉴의 멤버는 업무 › 워크스페이스 › 멤버로 모았다.
  if (section === 'members') return <ProjectMembersPage crumbs={crumbs} />;
  return <ComingSoonPage crumbs={crumbs} />;
}

const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute, path: 'settings/$section', component: ProjectSettingsRoute, ...pageData,
  // 프로젝트 설정은 그 프로젝트의 관리자(워크스페이스 관리자는 모든 프로젝트의 관리자)만 연다(2026-11-15 멤버 역할).
  beforeLoad: async ({ context, params }) => {
    const project = await context.queryClient.ensureQueryData(projectOptions(params.key)).catch(() => null);
    if (!project?.can.manage) throw redirect({ href: `/workspace/projects/${params.key}/work-items`, replace: true });
  },
});

const routeTree = rootRoute.addChildren([loginRoute, welcomeRoute, printRoute, appRoute.addChildren([
  ...redirectRoutes, ...spaceMovedRoutes, ...historyRoutes, ...inboxRoutes, ...splitRoutes, ...entryRoutes, ...pageRoutes, projectsRoute,
  projectRoute.addChildren([...projectPageRoutes, ...projectMovedRoutes, projectSettingsRoute]),
])]);

export const createAppRouter = (queryClient: QueryClient) => createRouter({
  routeTree, context: { queryClient }, defaultPreload: 'intent', defaultPreloadStaleTime: 0,
  // 다음 경로가 준비될 때까지 기존 화면을 유지하고, 오래 걸리면 RouteStage가 상단 진행 막대를 띄운다.
  defaultPendingMs: Infinity,
  defaultGcTime: 0,
  // 준비된 화면끼리 콘텐츠 영역만 200ms 교차 페이드한다(app/styles의 cowork-content). 가리는 판이 없으므로 모든 이동에 같은
  // 규칙을 쓴다. 라우터는 데이터 준비(loader)가 끝난 뒤에 전환을 시작하므로, 준비하는 동안은 진행 표시가 그대로 움직인다.
  // 로그인 오가기, 동작 줄이기 설정, 이미 진행 중인 전환(빠른 연속 이동), 열린 대화상자 위에서는 하지 않는다.
  defaultViewTransition: typeof CSS !== 'undefined' && CSS.supports('selector(:active-view-transition-type(cowork-content))') && {
    types: ({ fromLocation, toLocation, pathChanged }) => {
      if (!fromLocation || (!pathChanged && !isWorkItemViewChange(fromLocation, toLocation))
        || [fromLocation.pathname, toLocation.pathname].some(path => path === '/login' || path === '/welcome')
        || matchMedia('(prefers-reduced-motion: reduce)').matches
        || document.documentElement.matches(':active-view-transition')
        || document.querySelector('dialog[open], [role="dialog"][data-open], [role="alertdialog"][data-open]')) return false;
      return ['cowork-content'];
    },
  },
  // A panel's masked address (shared/lib/panel) opens as its own page on a reload.
  unmaskOnReload: true,
  defaultNotFoundComponent: () => <Navigate to="/" replace />,
});
