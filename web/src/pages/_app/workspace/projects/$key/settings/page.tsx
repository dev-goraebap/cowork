import { createFileRoute, redirect } from '@tanstack/react-router';

/** /workspace/projects/{key}/settings: 프로젝트 설정의 첫 화면(일반)으로 보낸다. */
export const Route = createFileRoute('/_app/workspace/projects/$key/settings/')({
  beforeLoad: ({ params }) => { throw redirect({ href: `/workspace/projects/${params.key}/settings/general`, replace: true }); },
});
