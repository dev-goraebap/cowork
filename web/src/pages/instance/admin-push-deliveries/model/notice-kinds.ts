/**
 * What each kind of notice is, as the server sends it (ApprovalNotices, ApprovalReminderService, AnnouncementService,
 * CalendarEventService, CalendarReminderService: when it goes, to whom,
 * whose avatar it shows, where it opens and which push group a member may turn off it under. The words and the
 * links are the server's; this only describes them, so a change there is written here too.
 */
export type NoticeKind = {
  kind: string;
  when: string;
  to: string;
  from: string;
  opens: string;
  pushGroup: string;
};

export const NOTICE_KINDS: readonly NoticeKind[] = [
  {
    kind: 'LEAVE_SUBMITTED',
    when: '휴가를 신청했을 때, 앞 결재자가 승인해 다음 결재자 차례가 됐을 때',
    to: '지금 결재할 차례인 결재자 (결재하거나 신청이 회수되면 읽음이 됨)',
    from: '신청자',
    opens: '신청 상세 (돌아가면 결재함 받은 결재)',
    pushGroup: '결재 요청',
  },
  {
    kind: 'APPROVAL_PENDING',
    when: '매일 오전 9시·오후 1시·오후 4시(휴일 포함), 차례가 된 지 1시간 넘은 결재가 있을 때',
    to: '결재를 기다리는 결재자마다 한 건 (다음 알림 때나 기다리는 결재가 없어지면 읽음이 됨)',
    from: '없음',
    opens: '결재함 받은 결재',
    pushGroup: '결재 요청',
  },
  {
    kind: 'LEAVE_CC',
    when: '휴가를 신청했을 때',
    to: '수신참조자 전원 (신청자 본인 제외)',
    from: '신청자',
    opens: '신청 상세 (돌아가면 결재함 수신참조)',
    pushGroup: '수신참조',
  },
  {
    kind: 'LEAVE_APPROVED',
    when: '마지막 결재자가 승인했을 때',
    to: '신청자',
    from: '마지막 결재자',
    opens: '신청 상세 (돌아가면 결재함 올린 결재)',
    pushGroup: '결재 결과',
  },
  {
    kind: 'LEAVE_REJECTED',
    when: '결재자가 반려했을 때 (어떤 신청인지, 몇 차 결재인지와 사유)',
    to: '신청자',
    from: '반려한 결재자',
    opens: '신청 상세 (돌아가면 결재함 올린 결재)',
    pushGroup: '결재 결과',
  },
  {
    kind: 'LEAVE_CANCELLED',
    when: '신청자가 회수·취소했을 때, 관리자가 취소했을 때',
    to: '신청자가 취소하면 이미 결재한 결재자 (승인된 신청이면 결재선 전원), 관리자가 취소하면 신청자',
    from: '신청자 또는 취소한 관리자',
    opens: '신청 상세',
    pushGroup: '결재 결과',
  },
  {
    kind: 'EVENT_INVITED',
    when: '회사 일정을 만들거나 고치면서 참석자로 넣었을 때',
    to: '새로 들어간 참석자 (넣은 사람 제외)',
    from: '일정을 만들거나 고친 사람',
    opens: '그 날짜의 팀 캘린더와 일정 상세',
    pushGroup: '일정',
  },
  {
    kind: 'EVENT_CHANGED',
    when: '일정을 고쳤을 때 (옮겼으면 원래 일시도 함께)',
    to: '남아 있는 참석자, 관리자가 고쳤으면 만든 사람도 (고친 사람 제외)',
    from: '고친 사람',
    opens: '바뀐 날짜의 팀 캘린더와 일정 상세',
    pushGroup: '일정',
  },
  {
    kind: 'EVENT_REMOVED',
    when: '일정이나 그 회차를 지웠을 때, 참석자에서 뺐을 때',
    to: '참석자 또는 빠진 사람, 관리자가 지웠으면 만든 사람도 (지운 사람 제외)',
    from: '지우거나 고친 사람',
    opens: '그 날짜의 팀 캘린더',
    pushGroup: '일정',
  },
  {
    kind: 'EVENT_REMINDER',
    when: '참석자가 정한 알림 시각이 되었을 때',
    to: '알림을 정한 참석자',
    from: '없음',
    opens: '그 날짜의 팀 캘린더와 일정 상세',
    pushGroup: '일정',
  },
  {
    kind: 'ANNOUNCEMENT_PUBLISHED',
    when: '공지를 게시했을 때',
    to: '재직자 전원 (게시한 사람 제외)',
    from: '작성자',
    opens: '공지 상세',
    pushGroup: '공지',
  },
];
