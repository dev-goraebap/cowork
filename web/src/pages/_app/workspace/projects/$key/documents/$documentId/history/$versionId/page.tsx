import { createFileRoute } from '@tanstack/react-router';
import { useCrumbs } from '@/widgets/app-shell';
import { BodyHistoryPage } from '@/widgets/body-history';

/** 문서 본문의 버전 하나. */
export const Route = createFileRoute('/_app/workspace/projects/$key/documents/$documentId/history/$versionId/')({
  component: function BodyHistoryPageRoute() {
    const { key, documentId, versionId } = Route.useParams();
    return <BodyHistoryPage crumbs={useCrumbs()} target={{ kind: 'document', projectKey: key, documentId }} versionId={versionId} />;
  },
});
