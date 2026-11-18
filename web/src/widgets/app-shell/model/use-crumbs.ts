import { useQuery } from '@tanstack/react-query';
import { projectOptions } from '@/entities/project';
import { usePageLocation } from '@/shared/lib/route-location';
import { crumbsOf, projectKeyOf } from './nav';

/** 지금 주소의 페이지 머리 경로. 프로젝트 안이면 첫 단계에 프로젝트 이름을 단다. */
export function useCrumbs() {
  const { pathname } = usePageLocation();
  const key = projectKeyOf(pathname);
  const project = useQuery({ ...projectOptions(key ?? ''), enabled: !!key });
  return crumbsOf(pathname, project.data?.name);
}
