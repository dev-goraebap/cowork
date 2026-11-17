import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, type components } from '@/shared/api';
import { weeklyReportKeys } from './weekly-reports';

type Required<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/** Someone who sees every submitted weekly report whatever the chart says (주간보고 관리's 전체 열람자). */
export type ReportViewer = Required<components['schemas']['WeeklyReportPerson'], 'id'>;

const VIEWERS = '/api/v1/office/admin/weekly-reports/viewers';

/** Members who see every submitted report, in the order they were added. */
export const reportViewersOptions = () => queryOptions({
  queryKey: [...weeklyReportKeys.all, 'viewers'],
  queryFn: ({ signal }) => getJson<ReportViewer[]>(VIEWERS, signal),
});

/** Who sees all changes what every weekly report list shows, so all of them read again. */
function useViewerCommand(send: (employeeId: string) => Promise<unknown>, onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => onDone?.(),
    onSettled: () => client.invalidateQueries({ queryKey: weeklyReportKeys.all }),
  });
}

export const useAddReportViewer = () => useViewerCommand(employeeId => sendCommand(VIEWERS, 'POST', { employeeId }));
export const useRemoveReportViewer = (onDone: () => void) =>
  useViewerCommand(employeeId => sendCommand(`${VIEWERS}/${employeeId}`, 'DELETE'), onDone);
