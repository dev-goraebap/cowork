import { useQuery } from '@tanstack/react-query';
import { projectOptions } from '@/entities/project';
import { Page } from '@/shared/ui/layout/page';
import { PageState } from '@/shared/ui/page-state';
import { pageCrumbs } from '@/widgets/app-shell';
import { useCalendarBoard } from '@/widgets/calendar-board';

type Crumb = { label: string; href?: string; icon?: string };

/**
 * A project's 일정: the team calendar narrowed to the events tied to the project (an event keeps the project it is for)
 * and the holidays, with no leave; 새 일정 makes one for the project. key is the address's, a current key or an old one.
 */
export function ProjectSchedulePage({ crumbs, projectKey }: { crumbs: Crumb[]; projectKey: string }) {
  const project = useQuery(projectOptions(projectKey));
  // Events name their project by its current key, which an old key in the address resolves to.
  const key = project.data?.key ?? projectKey;
  const board = useCalendarBoard({ base: `/workspace/projects/${projectKey}/schedule`, project: key });
  if (project.isError) return <Page crumbs={pageCrumbs(crumbs)}>
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description={project.error.message} />
  </Page>;
  return <Page crumbs={pageCrumbs(crumbs)} tools={board.tools} create={{ label: '새 일정', onClick: board.createNew }}>
    {board.content}
  </Page>;
}
