import type { Icon } from '@/shared/ui/icon';

/**
 * 신청 상세 카드의 행 앞 아이콘. 같은 카드에서 사람 행은 32px 아바타라, 아이콘도 같은 32px 원형 칸에 두어 글자 시작선을
 * 맞춘다(16px 아이콘을 그대로 두면 행마다 제목 위치가 들쭉날쭉했다).
 */
export function LeadIcon({ icon: Shown }: { icon: Icon }) {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-icon-muted"><Shown /></span>;
}
