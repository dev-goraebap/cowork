import { createFileRoute } from '@tanstack/react-router';
import { prepare } from '@/shared/lib/prepare';
import { useCrumbs } from '@/widgets/app-shell';
import { DocumentBoxPage, prepareDocuments } from '@/widgets/document-library';

/** /workspace/documents: 워크스페이스 문서함. 매뉴얼의 장은 ?chapter=로 연다. */
export const Route = createFileRoute('/_app/workspace/documents/')({
  loader: ({ context, location }) => prepare(context.queryClient, location.href,
    prep => prepareDocuments(prep, { documentId: new URLSearchParams(location.searchStr).get('chapter') ?? undefined })),
  component: function DocumentsRoute() { return <DocumentBoxPage crumbs={useCrumbs()} />; },
});
