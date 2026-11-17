import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { sessionOptions } from '@/shared/auth';

type Opened = Record<string, number>;
const empty: Opened = {};

function readOpened(storageKey: string): Opened {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Opened : empty;
  } catch { return empty; }
}

/** 이 브라우저에서 계정별로 어떤 결재 차례의 상세를 열었는지 기억한다. */
export function useApprovalReads() {
  const client = useQueryClient();
  const userId = useQuery(sessionOptions()).data?.id;
  const storageKey = `cowork-approval-reads:${userId}`;
  const { data } = useQuery({
    queryKey: [storageKey], queryFn: () => readOpened(storageKey),
    enabled: !!userId, staleTime: Infinity,
  });
  const markOpened = useCallback((id: string, step: number) => {
    if (!userId) return;
    const previous = client.getQueryData<Opened>([storageKey]) ?? readOpened(storageKey);
    if (previous[id] === step) return;
    const opened = Object.fromEntries([...Object.entries(previous).filter(([key]) => key !== id), [id, step]].slice(-500));
    client.setQueryData([storageKey], opened);
    try { localStorage.setItem(storageKey, JSON.stringify(opened)); } catch { /* 이 탭에서는 계속 읽음으로 표시한다. */ }
  }, [client, storageKey, userId]);
  return { opened: data ?? empty, markOpened };
}
