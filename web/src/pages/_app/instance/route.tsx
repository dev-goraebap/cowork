import { createFileRoute, redirect } from '@tanstack/react-router';
import { HOME_PATH } from '@/shared/config';

/** /instance 아래 전부: 인스턴스 관리자만 연다. 그 밖의 사람은 홈으로 보낸다. */
export const Route = createFileRoute('/_app/instance')({
  beforeLoad: ({ context }) => {
    if (!(context.session.roles ?? []).includes('INSTANCE_ADMIN')) throw redirect({ href: HOME_PATH, replace: true });
  },
});
