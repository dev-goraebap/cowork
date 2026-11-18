import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { MOBILE_QUERY } from '@/shared/config';
import { sessionOptions } from '@/shared/auth';
import { bodyStateOptions, RichBody } from '@/shared/ui/rich-body';

const preparations = new WeakMap<QueryClient, Map<string, QueryKey[]>>();
export function isPagePrepared(client: QueryClient, pathname: string, searchStr: string) {
  const keys = preparations.get(client)?.get(pathname + searchStr);
  return !!keys && keys.every(key => client.getQueryState(key)?.data !== undefined);
}

/** 실제 페이지와 같은 Query 옵션으로 첫 화면을 준비한다. 오류 표시는 각 페이지가 소유한다. */
export async function preparePage(client: QueryClient, pathname: string, searchStr: string) {
  const keys: QueryKey[] = [];
  try {
    await prepare(client, pathname, searchStr, key => keys.push(key));
    let entries = preparations.get(client);
    if (!entries) { entries = new Map(); preparations.set(client, entries); }
    entries.set(pathname + searchStr, keys);
  } catch { /* 페이지의 기존 오류 표시로 진행한다. */ }
}

async function prepare(client: QueryClient, pathname: string, searchStr: string, track: (key: QueryKey) => void) {
  const ensure: QueryClient['ensureQueryData'] = options => { track(options.queryKey); return client.ensureQueryData(options); };
  const ensureInfinite: QueryClient['ensureInfiniteQueryData'] = options => { track(options.queryKey); return client.ensureInfiniteQueryData(options); };
  const params = new URLSearchParams(searchStr);
  const projectPath = /^\/workspace\/projects\/([^/]+)\/(.*)$/.exec(pathname);
  const key = projectPath ? decodeURIComponent(projectPath[1]!) : undefined;
  // 워크스페이스 안의 자리: 프로젝트의 것은 그 아래 주소(/work-items …), 내 업무에서 연 업무 하나(/my-work/{REF})는
  // /work-items/{REF}, 옛 문서 주소는 /workspace를 뗀 것. 그 밖(오피스 · 인스턴스)은 주소 그대로다.
  const path = key ? `/${projectPath![2]}`
    : pathname.replace(/^\/my-work(?=\/)/, '/work-items').replace(/^\/workspace(?=\/documents(?:\/|$))/, '');
  // 캐시가 있으면 먼저 그린다. 오래된 데이터는 각 화면이 마운트할 때 갱신한다.
  const prime: QueryClient['prefetchQuery'] = async options => {
    await ensure(options).catch(() => undefined);
  };
  const primeInfinite: QueryClient['prefetchInfiniteQuery'] = async options => {
    await ensureInfinite(options).catch(() => undefined);
  };
  const me = client.getQueryData(sessionOptions().queryKey);
  // 본문은 첫 그림부터 완성돼 있어야 그 아래(활동 등)가 밀리지 않는다: 편집기 코드를 함께 받고 본문을 준비한다. 캐시가
  // 있으면 기다리지 않고 그것으로 그리며, 오래된 캐시는 본문이 뒤에서 확인한다(server-store, stale-while-revalidate).
  const body = (base: string) => Promise.all([RichBody.preload(), me?.id ? prime(bodyStateOptions(base, me.id)) : undefined]);
  if (key && path.startsWith('/settings/')) {
    const projects = await import('@/entities/project');
    const reads: Promise<unknown>[] = [prime(projects.projectOptions(key))];
    if (path === '/settings/workflow') reads.push(prime((await import('@/entities/work-item')).columnsOptions(key)));
    if (path === '/settings/integrations') {
      const api = await import('@/entities/work-item');
      reads.push(prime(api.integrationsOptions(key)), prime(api.integrationRulesOptions(key)), prime(api.columnsOptions(key)));
    }
    await Promise.all(reads);
    return;
  }
  if (path === '/work-items') {
    const [api, widget, project] = await Promise.all([import('@/entities/work-item'), import('@/widgets/work-item-list'), import('@/entities/project')]);
    // Independent metadata starts alongside the saved-view request, rather than after it.
    const metadata = Promise.all([prime(api.columnsOptions(key)), prime(api.typesOptions()), prime(api.workingPeopleOptions()),
      key ? prime(project.projectOptions(key)) : prime(project.projectsOptions('ACTIVE'))]);
    const views = api.viewsInOrder(await ensure(api.workItemViewsOptions(key)), !!key);
    const view = views.find(v => v.id === params.get('view')) ?? views[0]!;
    const query = widget.queryFromRoute(params, widget.queryOf(view));
    const layout = widget.storedLayoutOf(view);
    const listing = widget.listingOf(query, !!key, layout === 'kanban');
    await metadata;
    if (layout === 'kanban') {
      const grouping = query.display.group as import('@/entities/work-item').WorkItemViewGrouping;
      const groups = await ensure(api.boardGroupsOptions(key, listing, grouping));
      const columns = client.getQueryData(api.columnsOptions(key).queryKey) ?? [];
      const types = client.getQueryData(api.typesOptions().queryKey) ?? [];
      const ordered = widget.kanbanGroupsInOrder(groups, grouping, columns, types, !key,
        widget.isNarrowed(query), !!query.state.status?.includes('BACKLOG'));
      // 브라우저 폭을 상한으로 잡아 오른쪽에 일부만 보이는 칼럼도 준비한다.
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const visible = window.matchMedia(MOBILE_QUERY).matches ? 2 : Math.ceil(window.innerWidth / (18 * rem));
      await Promise.all(ordered.slice(0, visible).filter(group => group.total > 0)
        .map(group => primeInfinite(api.workItemsOptions(key, widget.listingForGroup(listing, grouping, group), 30))));
    } else if (layout === 'list' && widget.groupingOf(query.display) !== 'NONE') {
      const grouping = widget.groupingOf(query.display);
      const groups = await ensure(api.boardGroupsOptions(key, listing, grouping));
      const ordered = widget.listGroupsInOrder(groups, grouping, client.getQueryData(api.columnsOptions(key).queryKey) ?? [],
        client.getQueryData(api.typesOptions().queryKey) ?? [], !key);
      // 머리와 행을 각각 24px로 낮게 잡아 첫 화면에 걸칠 그룹까지 포함한다.
      let remaining = window.innerHeight;
      const visible = ordered.filter(group => {
        if (remaining <= 0) return false;
        remaining -= 24 * (1 + Math.min(30, group.total));
        return true;
      });
      await Promise.all(visible.map(group => primeInfinite(widget.listGroupPageOptions(key, listing, grouping, group))));
    } else await Promise.all([primeInfinite(api.workItemsOptions(key, listing)), prime(api.boardGroupsOptions(key, listing, 'NONE'))]);
    return;
  }
  const item = /^\/work-items\/([^/]+)$/.exec(path);
  if (item && item[1] !== 'new') {
    const api = await import('@/entities/work-item');
    const ref = key ? { key, number: Number(item[1]) } : api.parseWorkItemRef(item[1]!);
    if (ref && Number.isFinite(ref.number)) {
      const view = await ensure(api.workItemOptions(ref.key, ref.number));
      await Promise.all([body(`${api.workItemPath(view.issue.projectKey, view.issue.number)}/body`), prime(api.timelineOptions(ref.key, ref.number)),
        prime(api.columnsOptions(ref.key)), prime(api.typesOptions()), prime(api.workingPeopleOptions()), prime(api.labelsOptions()), prime(api.codeLinksOptions(ref.key, ref.number))]);
    }
    return;
  }
  if (key && /^\/documents\/[^/]+\/pages$/.test(path)) {
    await prime((await import('@/entities/document')).libraryOptions(key));
    return;
  }
  if (path === '/documents' || path.startsWith('/documents/')) {
    const api = await import('@/entities/document');
    const id = params.get('chapter') ?? path.split('/')[2];
    if (id) await Promise.all([prime(api.documentOptions(id)), body(`/api/v1/workspace/documents/${id}/body`), prime(api.bodyActivityOptions('documents', id))]);
    if (key) await Promise.all([prime((await import('@/entities/document')).libraryOptions(key)), primeInfinite(api.documentsOptions({ project: key }))]);
    return;
  }
  if (key && path === '/schedule') {
    const place = (await import('@/widgets/calendar-board')).calendarPlace(searchStr);
    await prime((await import('@/entities/calendar')).calendarFeedOptions(place.days[0] ?? place.day, place.days.at(-1) ?? place.day));
    return;
  }
  if (pathname === '/workspace/settings/general') {
    const projects = await import('@/entities/project'); const issues = await import('@/entities/work-item');
    await Promise.all([prime(projects.projectsOptions('ACTIVE')), prime(projects.projectsOptions('ARCHIVED')),
      prime(projects.projectsOptions('DELETED')), prime(issues.typesOptions()), prime(issues.labelsOptions())]); return;
  }
  if (pathname === '/workspace/settings/work-item-types' || pathname === '/workspace/settings/work-item-labels') {
    const issues = await import('@/entities/work-item'); if (pathname.endsWith('/types')) await prime(issues.typesOptions()); else await prime(issues.labelsOptions()); return;
  }
  if (pathname === '/workspace/projects' || key) {
    const api = await import('@/entities/project');
    if (key) await Promise.all([prime(api.projectOptions(key)), path === '/members' ? prime(api.projectMembersOptions(key)) : Promise.resolve()]);
    else await prime(api.projectsOptions(['ARCHIVED', 'DELETED'].includes(params.get('status') ?? '') ? params.get('status') as 'ARCHIVED' | 'DELETED' : 'ACTIVE'));
  }
}
