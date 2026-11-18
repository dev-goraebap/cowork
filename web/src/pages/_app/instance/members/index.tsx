import { createFileRoute, redirect } from '@tanstack/react-router';
import { HOME_PATH } from '@/shared/config';
import { usePageLocation } from '@/shared/lib/route-location';
import { crumbsOf } from '@/widgets/app-shell';
import { rolesOptions } from './api/roles';
import { RolesPage } from './ui/RolesPage';

/** /instance/members: 구성원 · 권한. 인스턴스 관리자만 연다. */
export const Route = createFileRoute('/_app/instance/members/')({
  beforeLoad: ({ context }) => {
    if (!(context.session.roles ?? []).includes('INSTANCE_ADMIN')) throw redirect({ href: HOME_PATH, replace: true });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(rolesOptions()),
  component: function MembersRoute() {
    const { pathname } = usePageLocation();
    return <RolesPage crumbs={crumbsOf(pathname)} />;
  },
});
