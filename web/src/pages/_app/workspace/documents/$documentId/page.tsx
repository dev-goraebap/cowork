import { createFileRoute } from '@tanstack/react-router';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { DocumentBoxPage, prepareDocuments } from '@/widgets/document-library';

/** /workspace/documents/{id}: 문서함에서 연 문서 하나. */
export const Route = createFileRoute('/_app/workspace/documents/$documentId/')({
  loader: ({ context, location, params }) => prepare(context.queryClient, location.href,
    prep => prepareDocuments(prep, { documentId: new URLSearchParams(location.searchStr).get('chapter') ?? params.documentId })),
  component: function DocumentRoute() {
    const { documentId } = Route.useParams();
    return <DocumentBoxPage crumbs={useCrumbs()} documentId={documentId} />;
  },
});
