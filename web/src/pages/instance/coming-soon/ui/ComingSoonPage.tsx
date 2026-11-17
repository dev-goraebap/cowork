import { Page } from '@/shared/ui/layout/page';
import { PageState } from '@/shared/ui/page-state';
import { pageCrumbs } from '@/widgets/app-shell';

type Crumb = { label: string; href?: string; icon?: string };

/** A page not yet brought over from client/ (or not built yet): its head, and a state saying it is on its way. */
export function ComingSoonPage({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Page crumbs={pageCrumbs(crumbs)}>
      <PageState kind="empty" title={`${crumbs.at(-1)?.label ?? ''} 화면을 준비하는 중입니다`} description="v2에서 곧 이 자리에 보입니다. 지금은 기존 화면을 써 주세요." />
    </Page>
  );
}
