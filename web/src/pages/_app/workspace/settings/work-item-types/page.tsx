import { createFileRoute } from '@tanstack/react-router';
import { typesOptions } from '@/entities/work-item';
import { useCrumbs } from '@/widgets/app-shell';
import { WorkItemTypesPage } from './ui/WorkItemTypesPage';

/** /workspace/settings/work-item-types: 업무 유형. */
export const Route = createFileRoute('/_app/workspace/settings/work-item-types/')({
  loader: ({ context }) => context.queryClient.prefetchQuery(typesOptions()),
  component: function WorkItemTypesRoute() { return <WorkItemTypesPage crumbs={useCrumbs()} />; },
});
