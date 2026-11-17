type Color = 'blue' | 'gray' | 'green' | 'red' | 'purple';

/** What a notice reports, as a short label and a token colour, read from the end of its kind (LEAVE_APPROVED and the like). */
const EVENTS: Record<string, { label: string; color: Color }> = {
  SUBMITTED: { label: '결재 요청', color: 'blue' },
  PENDING: { label: '결재 대기', color: 'blue' },
  CC: { label: '수신참조', color: 'gray' },
  APPROVED: { label: '승인', color: 'green' },
  REJECTED: { label: '반려', color: 'red' },
  CANCELLED: { label: '취소', color: 'gray' },
  INVITED: { label: '일정 초대', color: 'blue' },
  CHANGED: { label: '일정 변경', color: 'purple' },
  REMOVED: { label: '일정 취소', color: 'gray' },
  REMINDER: { label: '일정 알림', color: 'blue' },
};

/** A kind the screen does not know yet reads as a plain notice. */
export function kindOf(kind: string): { label: string; color: Color; isAnnouncement: boolean } {
  if (kind.startsWith('ANNOUNCEMENT_')) return { label: '공지', color: 'purple', isAnnouncement: true };
  if (kind === 'MEETING_READY') return { label: '회의록', color: 'blue', isAnnouncement: false };
  const event = Object.keys(EVENTS).find(name => kind.endsWith(`_${name}`));
  return { ...(event ? EVENTS[event] : { label: '알림', color: 'gray' as const }), isAnnouncement: false };
}

/** Only links into this app are followed, so a stored link cannot send the member elsewhere. */
export const inAppLink = (link?: string) => (link && link.startsWith('/') && !link.startsWith('//') ? link : undefined);
