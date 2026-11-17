import { useNavigate } from '@tanstack/react-router';
import { CalendarIcon, InboxIcon, InboxInIcon, MegaphoneIcon } from '@/shared/ui/icon';
import { PageViews, type PageView } from '@/shared/ui/layout/page';
import { InboxIllustration } from '@/shared/ui/page-state';

export type ActivityView = 'all' | 'approval' | 'announcement' | 'event';

/** 알림함 · 결재함이 함께 쓰는 분할 보기 설정: 탭을 넘나들어도 목록 너비가 같고, 빈 칸은 알림함 그림이다. */
export const activitySplit = {
  widthKey: 'cowork-activity-list',
  placeholder: { title: '항목을 선택해 주세요', illustration: <InboxIllustration /> },
};

export const activityViews: PageView<ActivityView>[] = [
  { value: 'all', label: '전체', icon: InboxIcon },
  { value: 'approval', label: '결재', icon: InboxInIcon },
  { value: 'announcement', label: '공지', icon: MegaphoneIcon },
  { value: 'event', label: '일정', icon: CalendarIcon },
];

/** The activity pages as views of one inbox: 받은 알림 (all, or narrowed to 공지 · 일정) and 결재함. */
export function ActivityViews({ value }: { value: ActivityView }) {
  const navigate = useNavigate();
  return <PageViews label="알림함 뷰" views={activityViews} value={value} onChange={id => {
    const href = id === 'approval' ? '/approvals' : id === 'all' ? '/notifications' : `/notifications?view=${id}`;
    void navigate({ href });
  }} />;
}
