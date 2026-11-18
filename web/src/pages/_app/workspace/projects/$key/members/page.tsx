import { createFileRoute } from '@tanstack/react-router';
import { projectMembersOptions } from '@/entities/project';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { ProjectMembersPage } from '@/widgets/project-members';

/** /workspace/projects/{key}/members: 프로젝트 멤버(설정의 멤버와 같은 화면). */
export const Route = createFileRoute('/_app/workspace/projects/$key/members/')({
  loader: ({ context, params }) => prepare(context.queryClient, `project-members:${params.key}`, ({ prime }) => prime(projectMembersOptions(params.key))),
  component: function ProjectMembersPageRoute() {
    return <ProjectMembersPage crumbs={useCrumbs()} />;
  },
});
