import { queryOptions } from '@tanstack/react-query';
import { getJson, type components } from '@/shared/api';
import { relationLabels } from '../model/text';
import { leaveKeys } from './leave';

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/*
 * 오피스 관리's leave settings (client/'s type-settings and bereavement policies): the leave types as administrators set
 * them, and the days a death in the family gives by relation. Both sit under leaveKeys, since members' catalogs, filters
 * and grants read them.
 */

export type TypeSetting = WithRequired<Schemas['TypeSetting'],
  'id' | 'code' | 'classification' | 'name' | 'absence' | 'paid' | 'defaultDays' | 'requiresReason' | 'requiresAttachment'
  | 'expiryBasis' | 'durationBasis' | 'renewalBasis' | 'active' | 'used'>;
export type TypeSettings = Schemas['TypeSettings'];
export type Classification = Schemas['NewType']['classification'];
export type ExpiryBasis = TypeSettings['expiryBasis'];
export type RenewalBasis = TypeSettings['renewalBasis'];
export type DurationBasis = TypeSettings['durationBasis'];
export type EventType = NonNullable<TypeSettings['eventType']>;

/** Every leave type as administrators set it, those in use in the order members see them first. */
export const typeSettingsOptions = () => queryOptions({
  queryKey: [...leaveKeys.all, 'type-settings'],
  queryFn: ({ signal }) => getJson<TypeSetting[]>('/api/v1/office/leave/type-settings', signal),
});

export const classificationLabels: Record<Classification, string> = { EVENT: '사건형', GRANT: '관리자 부여형', ACCRUAL_QUOTA: '정기 갱신형' };
export const expiryLabels: Record<ExpiryBasis, string> = { NONE: '만료 없음', GRANT_DATE: '부여일부터', EVENT_DATE: '사건일부터', PERIOD_END: '기간 끝' };
export const renewalLabels: Record<RenewalBasis, string> = { NONE: '갱신 없음', CALENDAR_YEAR: '매년 1월 1일', MONTHLY: '매월 1일' };
export const eventLabels: Record<EventType, string> = { BIRTH: '출산', DEATH: '사망(경조 정책)' };
export const durationLabels: Record<DurationBasis, string> = { WORKING_DAY: '근무일만', CALENDAR_DAY: '주말 · 공휴일 포함' };
export const genderLabels: Record<string, string> = { FEMALE: '여성', MALE: '남성' };

/** One line of what a type gives, such as "사망 · 사건일부터 90일 · 1회". */
export function typeSummary(type: TypeSetting): string {
  const parts: string[] = [];
  if (type.eventType) parts.push(eventLabels[type.eventType as EventType] ?? type.eventType);
  if (type.renewalBasis !== 'NONE') parts.push(`${renewalLabels[type.renewalBasis as RenewalBasis]} ${type.renewalAmount ?? 0}일`);
  if (type.maxDays != null) parts.push(`한 번에 ${type.maxDays}일까지`);
  if (type.maxSplits != null) parts.push(`${type.maxSplits}회`);
  const expiry = type.expiryBasis as ExpiryBasis;
  if (expiry === 'GRANT_DATE' || expiry === 'EVENT_DATE') parts.push(`${expiryLabels[expiry]} ${type.expiryDaysAfter}일`);
  else if (expiry === 'PERIOD_END') parts.push('기간 끝 만료');
  return parts.join(' · ') || '제한 없음';
}

/** Pay, who may ask and what a request needs, such as "유급 · 여성만 · 증빙". */
export function typeConditions(type: TypeSetting): string {
  const parts = [type.paid ? '유급' : '무급'];
  if (type.eligibleGender) parts.push(`${genderLabels[type.eligibleGender] ?? type.eligibleGender}만`);
  if (type.requiresReason) parts.push('사유');
  if (type.requiresAttachment) parts.push('증빙');
  return parts.join(' · ');
}

/** The days a death in the family gives for one relation, and whether they are paid. */
export type Policy = WithRequired<Schemas['PolicySetting'], 'id' | 'relation' | 'days' | 'paid' | 'active'>;
/** The most days one death may give, as the server checks. */
export const POLICY_DAYS_MAX = 30;
/** A relation's name, such as 부모 for PARENT. */
export const relationName = (relation: string) => relationLabels[relation] ?? relation;

/** Every relation a death gives days for, those in use in the order members pick them first. */
export const policiesOptions = () => queryOptions({
  queryKey: [...leaveKeys.all, 'bereavement-policies'],
  queryFn: ({ signal }) => getJson<Policy[]>('/api/v1/office/leave/bereavement-policies', signal),
});
