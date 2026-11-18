import { createFileRoute } from '@tanstack/react-router';
import { useCrumbs } from '@/widgets/app-shell';
import { DocumentLabelsPage } from './ui/DocumentLabelsPage';

/** /workspace/settings/document-labels: 문서 라벨. */
export const Route = createFileRoute('/_app/workspace/settings/document-labels/')({
  component: function DocumentLabelsRoute() { return <DocumentLabelsPage crumbs={useCrumbs()} />; },
});
