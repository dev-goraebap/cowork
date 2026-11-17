import { infiniteQueryOptions, keepPreviousData, queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendJson, type components } from '@/shared/api';

/*
 * 오피스 관리's reads and writes of the company's organization (client/'s entities/organization): its employees, ranks
 * (직급), titles (직위) and departments, each employee's HR card. Every read sits under ['organization'] or the keys
 * client/ used, so a change reads its lists again.
 */

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type EmployeeStatus = NonNullable<Schemas['EmployeeItem']['status']>;
export type Gender = NonNullable<Schemas['EmployeeDetail']['gender']>;
export type EmployeeItem = WithRequired<Schemas['EmployeeItem'], 'id' | 'name' | 'workEmail' | 'status'>;
export type EmployeeDetail = WithRequired<Schemas['EmployeeDetail'], 'id' | 'name' | 'workEmail' | 'hireDate' | 'status' | 'leadOf'>;
export type Position = WithRequired<Schemas['PositionItem'], 'id' | 'name' | 'order' | 'memberCount'>;
export type Title = WithRequired<Schemas['TitleItem'], 'id' | 'name' | 'group' | 'order' | 'memberCount'>;
export type TitleGroup = Title['group'];
export type Department = WithRequired<Schemas['DepartmentItem'], 'id' | 'name' | 'depth' | 'displayOrder' | 'memberCount'>;
export type DepartmentMember = WithRequired<Schemas['DepartmentMember'], 'id' | 'name'>;
export type Pregnancy = Schemas['PregnancyInfo'];
export type HrCard = Schemas['Card'];
export type RegisterRequest = Schemas['Register'];

export const statusLabels: Record<EmployeeStatus, string> = { ACTIVE: '재직', INVITED: '입사대기', TERMINATED: '퇴사' };
export const genderLabels: Record<Gender, string> = { MALE: '남', FEMALE: '여' };
export const titleGroupLabels: Record<TitleGroup, string> = { EXECUTIVE: '임원', ADVISOR: '고문' };
/** Rank and title as one: both as 직급/직위, or whichever the employee has. */
export const rankText = (employee: { positionName?: string | null; titleName?: string | null }) =>
  [employee.positionName, employee.titleName].filter(Boolean).join('/') || undefined;

export const positionsOptions = () => queryOptions({
  queryKey: ['positions'],
  queryFn: ({ signal }) => getJson<Position[]>('/api/v1/office/positions', signal),
});

export const titlesOptions = () => queryOptions({
  queryKey: ['titles'],
  queryFn: ({ signal }) => getJson<Title[]>('/api/v1/office/titles', signal),
});

export const departmentsOptions = () => queryOptions({
  queryKey: ['departments'],
  queryFn: ({ signal }) => getJson<Department[]>('/api/v1/office/departments', signal),
});

export const departmentMembersOptions = (departmentId: string) => queryOptions({
  queryKey: ['departments', departmentId, 'members'],
  queryFn: ({ signal }) => getJson<DepartmentMember[]>(`/api/v1/office/departments/${departmentId}/members`, signal),
});

/** What the employee list is narrowed and ordered by; nothing set means everyone by rank. */
export type EmployeeSort = 'POSITION' | 'NAME' | 'HIRE_DATE';
export type EmployeeListing = {
  q?: string; status?: EmployeeStatus; departmentId?: string; positionId?: string; sort?: EmployeeSort; direction?: 'ASC' | 'DESC';
};
export type EmployeeSlice = { items: EmployeeItem[]; total: number; nextCursor?: string };
const EMPLOYEES_SLICE = 30;

/** Employees matching the listing, one slice after another, with how many match in all. */
export const employeesOptions = (listing: EmployeeListing) => infiniteQueryOptions({
  queryKey: ['employees', 'list', listing],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams({ size: String(EMPLOYEES_SLICE) });
    for (const [key, value] of Object.entries(listing)) if (value) params.set(key, String(value));
    if (pageParam) params.set('cursor', pageParam);
    return getJson<EmployeeSlice>(`/api/v1/office/employees?${params}`, signal);
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});

export const employeeOptions = (id: string) => queryOptions({
  queryKey: ['employees', 'detail', id],
  queryFn: ({ signal }) => getJson<EmployeeDetail>(`/api/v1/office/employees/${id}`, signal),
});

export const pregnancyOptions = (employeeId: string) => queryOptions({
  queryKey: ['employees', 'pregnancy', employeeId],
  queryFn: ({ signal }) => getJson<Pregnancy | null>(`/api/v1/office/employees/${employeeId}/pregnancy`, signal).catch(() => null),
});

/** After a change to who works where: employees, departments, ranks and titles read again. */
export const refreshOrganization = (client: QueryClient) => Promise.all([
  client.invalidateQueries({ queryKey: ['employees'] }),
  client.invalidateQueries({ queryKey: ['departments'] }),
  client.invalidateQueries({ queryKey: ['positions'] }),
  client.invalidateQueries({ queryKey: ['titles'] }),
  client.invalidateQueries({ queryKey: ['organization'] }),
]);

/** Registers every row or none. */
export function useRegisterEmployees(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: RegisterRequest) => sendCommand('/api/v1/office/employees', 'POST', request),
    onSuccess: async () => { await refreshOrganization(client); onDone(); },
  });
}

/** One command on an employee (basics, department, position, title, activation, termination). */
export function useEmployeeCommand(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: 'PUT' | 'POST'; body?: unknown }) =>
      sendCommand(`/api/v1/office/employees/${id}/${path}`, method, body),
    onSuccess: async () => { onDone(); await refreshOrganization(client); },
  });
}

type MoveResult = { moved: number; skipped: { employeeId: string; reason: string }[] };
const MOVE_REASONS: Record<string, string> = { ALREADY_THERE: '이미 이 부서 소속입니다.', TERMINATED: '퇴사한 사원입니다.', NOT_FOUND: '사원을 찾을 수 없습니다.' };

/** Brings one person into the department; one who led another department stops leading it. */
export function useAddMember(departmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const result = await sendJson<MoveResult>('/api/v1/office/employees/department-moves', 'POST', { departmentId, employeeIds: [employeeId] });
      const skipped = result.skipped[0];
      if (skipped) throw new Error(MOVE_REASONS[skipped.reason] ?? '옮기지 못했습니다.');
    },
    onSettled: () => refreshOrganization(client),
  });
}

/** Takes one person out of their department, leaving them in none. */
export function useRemoveMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => sendCommand(`/api/v1/office/employees/${employeeId}/department`, 'PUT', { departmentId: null }),
    onSettled: () => refreshOrganization(client),
  });
}

/** Names the department's lead, or none. */
export function useSetLead(departmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string | null) => sendCommand(`/api/v1/office/departments/${departmentId}/lead`, 'PUT', { employeeId }),
    onSettled: () => refreshOrganization(client),
  });
}

/** A write to the organization (a department, rank or title), its lists read again once it is done. */
export function useOrganizationCommand(onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ url, method, body }: { url: string; method: 'POST' | 'PUT' | 'DELETE'; body?: unknown }) => sendCommand(url, method, body),
    onSuccess: () => onDone?.(),
    onSettled: () => refreshOrganization(client),
  });
}

const cardBase = (employeeId: string) => `/api/v1/office/employees/${employeeId}/hr-card`;

export const hrCardOptions = (employeeId: string) => queryOptions({
  queryKey: ['hr-card', employeeId],
  queryFn: ({ signal }) => getJson<HrCard>(cardBase(employeeId), signal),
});

export type HrCardSectionKey = 'educations' | 'careers' | 'families' | 'certifications' | 'trainings';
export type HrCardCommand =
  | { kind: 'add'; section: HrCardSectionKey; body: unknown }
  | { kind: 'replace'; section: HrCardSectionKey; id: string; body: unknown }
  | { kind: 'remove'; section: HrCardSectionKey; id: string }
  | { kind: 'reorder'; section: HrCardSectionKey; ids: string[] };

/** One HR card command at a time; the card is read again afterwards, also when the command fails. */
export function useHrCardCommand(employeeId: string, onDone?: () => void) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['hr-card', employeeId] });
  return useMutation({
    mutationFn: (command: HrCardCommand) => {
      const url = `${cardBase(employeeId)}/${command.section}`;
      switch (command.kind) {
        case 'add': return sendCommand(url, 'POST', command.body);
        case 'replace': return sendCommand(`${url}/${command.id}`, 'PUT', command.body);
        case 'remove': return sendCommand(`${url}/${command.id}`, 'DELETE');
        case 'reorder': return sendCommand(`${cardBase(employeeId)}/order/${command.section}`, 'PUT', { ids: command.ids });
      }
    },
    onSuccess: async () => { onDone?.(); await refresh(); },
    onError: () => refresh(),
  });
}

/** An ordered list's order with the item at index moved one place up (-1) or down (1). */
export function moved<T>(items: readonly T[], index: number, step: -1 | 1): T[] {
  const next = [...items];
  const to = index + step;
  if (to < 0 || to >= next.length) return next;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
