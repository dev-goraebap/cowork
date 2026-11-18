import { createFileRoute, redirect } from '@tanstack/react-router';

/** /workspace/settings: 워크스페이스 관리의 첫 화면(일반)으로 보낸다. */
export const Route = createFileRoute('/_app/workspace/settings/')({
  beforeLoad: ({ location }) => { throw redirect({ href: '/workspace/settings/general' + location.searchStr, replace: true }); },
});
