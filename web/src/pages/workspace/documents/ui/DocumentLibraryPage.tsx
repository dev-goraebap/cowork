import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { documentOptions } from '@/entities/document';
import { Page } from '@/shared/ui/layout/page';
import { PageState } from '@/shared/ui/page-state';
import { pageCrumbs } from '@/widgets/app-shell';
import type { Crumb } from '../model/page-tools';
import { ProjectLibrary, type DetailSurfaceOptions } from './ProjectLibrary';

export function DocumentLibraryPage({
  crumbs,
  projectKey,
  documentId,
  ...surface
}: {
  crumbs: Crumb[];
  projectKey?: string;
  documentId?: string;
} & DetailSurfaceOptions) {
  const legacy = useQuery({
    ...documentOptions(documentId ?? ''),
    enabled: !projectKey && !!documentId,
  });
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  useEffect(() => {
    if (projectKey) return;
    if (!documentId) void navigate({ href: '/workspace/projects', replace: true });
    else if (legacy.data?.document.projectKey)
      void navigate({
        href: `/workspace/projects/${legacy.data.document.projectKey}/documents/${typeof search.chapter === 'string' ? search.chapter : documentId}${typeof search.chapter === 'string' ? `?collection=${documentId}` : ''}`,
        replace: true,
      });
  }, [projectKey, documentId, legacy.data, search.chapter, navigate]);
  if (!projectKey)
    return (
      <Page crumbs={pageCrumbs(crumbs)}>
        {legacy.isError ? <PageState kind="not-found" title="문서를 찾을 수 없습니다" /> : null}
      </Page>
    );
  return <ProjectLibrary key={projectKey} crumbs={crumbs} projectKey={projectKey} documentId={documentId} {...surface} />;
}
