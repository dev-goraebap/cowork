import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { approvalKeys } from '@/entities/approval';
import { leaveKeys } from '@/entities/leave';
import { overtimeKeys } from '@/entities/overtime';
import { sendCommand } from '@/shared/api';

export type Verdict = 'APPROVE' | 'REJECT';

/** After a request changes, every approval read (lists, counts, the request) and the leave and overtime it moves are read again. */
const settle = (client: QueryClient) => Promise.all([
  client.invalidateQueries({ queryKey: approvalKeys.all }),
  client.invalidateQueries({ queryKey: leaveKeys.all }),
  client.invalidateQueries({ queryKey: overtimeKeys.all }),
]);

/** Approving or rejecting (with the reason the requester will read) a request whose decision is the member's now. */
export function useDecide(onDecided?: (verdict: Verdict) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verdict, reason }: { id: string; verdict: Verdict; reason?: string }) =>
      sendCommand(`/api/v1/office/approval/requests/${id}/decision`, 'POST', { verdict, reason: reason ?? null }),
    onSuccess: (_, { verdict }) => onDecided?.(verdict),
    // A conflict (decided elsewhere meanwhile) brings the request up to date too.
    onSettled: () => settle(client),
  });
}

/** Withdrawing a request in review, or cancelling an approved one, returns pending or taken days. */
export function useCancelRequest(onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCommand(`/api/v1/office/approval/requests/${id}/cancellation`, 'POST'),
    onSuccess: () => onDone?.(),
    onSettled: () => settle(client),
  });
}
