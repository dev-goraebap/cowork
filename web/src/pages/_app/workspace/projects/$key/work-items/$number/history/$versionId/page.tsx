import { createFileRoute } from '@tanstack/react-router';
import { useCrumbs } from '@/widgets/app-shell';
import { BodyHistoryPage } from '@/widgets/body-history';

/** 업무 본문의 버전 하나. */
export const Route = createFileRoute('/_app/workspace/projects/$key/work-items/$number/history/$versionId/')({
  component: function BodyHistoryPageRoute() {
    const { key, number, versionId } = Route.useParams();
    return <BodyHistoryPage crumbs={useCrumbs()} target={{ kind: 'work-item', projectKey: key, number: Number(number) }} versionId={versionId} />;
  },
});
