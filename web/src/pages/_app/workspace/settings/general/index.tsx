import { createFileRoute } from '@tanstack/react-router';
import { projectsOptions } from '@/entities/project';
import { labelsOptions, typesOptions } from '@/entities/work-item';
import { useCrumbs } from '@/widgets/app-shell';
import { WorkspaceGeneralPage } from './ui/WorkspaceGeneralPage';

/** /workspace/settings/general: 프로젝트 목록(진행 · 보관 · 삭제)과 업무 유형 · 라벨의 요약. */
export const Route = createFileRoute('/_app/workspace/settings/general/')({
  loader: ({ context: { queryClient } }) => Promise.all([
    queryClient.prefetchQuery(projectsOptions('ACTIVE')), queryClient.prefetchQuery(projectsOptions('ARCHIVED')),
    queryClient.prefetchQuery(projectsOptions('DELETED')), queryClient.prefetchQuery(typesOptions()), queryClient.prefetchQuery(labelsOptions()),
  ]),
  component: function WorkspaceGeneralRoute() { return <WorkspaceGeneralPage crumbs={useCrumbs()} />; },
});
