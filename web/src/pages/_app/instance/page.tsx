import { createFileRoute, redirect } from '@tanstack/react-router';

/** /instance: 인스턴스 관리의 첫 화면(구성원 · 권한)으로 보낸다. */
export const Route = createFileRoute('/_app/instance/')({
  beforeLoad: ({ location }) => { throw redirect({ href: '/instance/members' + location.searchStr, replace: true }); },
});
