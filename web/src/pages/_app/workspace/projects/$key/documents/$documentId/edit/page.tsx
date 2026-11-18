import { createFileRoute } from '@tanstack/react-router';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { DocumentEditPage, prepareDocuments } from '@/widgets/document-library';

/** /workspace/projects/{key}/documents/{id}/edit: 문서 고치기. */
export const Route = createFileRoute('/_app/workspace/projects/$key/documents/$documentId/edit/')({
  loader: ({ context, params, location }) => prepare(context.queryClient, location.href,
    prep => prepareDocuments(prep, { projectKey: params.key, documentId: params.documentId })),
  component: function DocumentEditPageRoute() {
    const { key, documentId } = Route.useParams();
    return <DocumentEditPage crumbs={useCrumbs()} projectKey={key} documentId={documentId} />;
  },
});
