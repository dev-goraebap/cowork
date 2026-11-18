import { createFileRoute } from '@tanstack/react-router';
import { projectMembersOptions } from '@/entities/project';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { ProjectMembersPage } from '@/widgets/project-members';

/** /workspace/projects/{key}/settings/members: 프로젝트에 사람을 넣고 빼는 곳(Linear의 팀 설정 › Members). */
export const Route = createFileRoute('/_app/workspace/projects/$key/settings/members/')({
  loader: ({ context, params }) => prepare(context.queryClient, `project-members:${params.key}`, ({ prime }) => prime(projectMembersOptions(params.key))),
  component: function ProjectMembersPageRoute() {
    return <ProjectMembersPage crumbs={useCrumbs()} />;
  },
});
