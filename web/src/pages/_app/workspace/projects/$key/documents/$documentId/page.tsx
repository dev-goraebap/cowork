import { createFileRoute } from '@tanstack/react-router';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { DocumentBoxPage, prepareDocuments } from '@/widgets/document-library';

/** /workspace/projects/{key}/documents/{id}: 프로젝트 문서 하나. 데스크톱에서 목록에서 열면 대화상자(PanelHost)로 뜬다. */
export const Route = createFileRoute('/_app/workspace/projects/$key/documents/$documentId/')({
  loader: ({ context, params, location }) => prepare(context.queryClient, location.href,
    prep => prepareDocuments(prep, { projectKey: params.key, documentId: new URLSearchParams(location.searchStr).get('chapter') ?? params.documentId })),
  component: function DocumentBoxPageRoute() {
    const { key, documentId } = Route.useParams();
    return <DocumentBoxPage crumbs={useCrumbs()} projectKey={key} documentId={documentId} />;
  },
});
