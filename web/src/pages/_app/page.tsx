import { createFileRoute, redirect } from '@tanstack/react-router';
import { HOME_PATH } from '@/shared/config';

/** /: 홈(프로젝트 목록)으로 보낸다. */
export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ location }) => { throw redirect({ href: HOME_PATH + location.searchStr, replace: true }); },
});
