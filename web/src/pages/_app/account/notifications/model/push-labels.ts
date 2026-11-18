import type { PushTopic } from '@/features/push-device';

/** Each group of notices a member may take as a push, named and explained as the member meets it. */
export const topicLabels: Record<PushTopic, { label: string; description: string }> = {
  APPROVAL_REQUEST: { label: '결재 요청', description: '내가 결재할 차례인 신청이 오면 알려 줍니다.' },
  APPROVAL_RESULT: { label: '결재 결과', description: '내 신청이 승인·반려되거나, 결재한 신청이 취소되면 알려 줍니다.' },
  COPY: { label: '수신참조', description: '나를 참조로 둔 신청이 올라오면 알려 줍니다.' },
  ANNOUNCEMENT: { label: '공지', description: '새 공지가 게시되면 알려 줍니다.' },
  CALENDAR: { label: '일정', description: '일정에 초대되거나 일정이 바뀌거나 빠지면, 그리고 일정이 시작하기 전에 알려 줍니다.' },
};

/** How the last push to a device went. */
export const pushStatusLabels: Record<string, string> = {
  SENT: '전달됨', PENDING: '보내는 중', FAILED: '실패', GONE: '구독 끝남', NO_DEVICE: '기기 없음', MUTED: '꺼 둔 알림',
};

const moment = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const momentText = (iso?: string | null) => (iso ? moment.format(new Date(iso)) : '');
