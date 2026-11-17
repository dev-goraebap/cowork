import { monthTitle } from '@/entities/event';
import { Button } from '@/shared/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icon';

/**
 * Where the calendar stands and how to move it, in the toolbar's tools: the month (2026년 11월), then 오늘 and the pair
 * of chevrons to the month before and after (← → and T on a desktop). 보기 탭이 없어 데스크톱은 페이지 머리 줄(새로 만들기 왼쪽)에 선다.
 */
export function CalendarNav({ day, onToday, onStep }: { day: string; onToday: () => void; onStep: (by: number) => void }) {
  const unit = '달';
  return <div className="flex items-center gap-1">
    <p aria-live="polite" className="pr-1.5 text-sm font-semibold whitespace-nowrap tabular-nums max-md:sr-only md:w-[7em]">{monthTitle(day)}</p>
    <Button variant="view" title="오늘 (T)" onClick={onToday} className="px-3 max-md:h-8">오늘</Button>
    <Button variant="view" size="icon" aria-label={`이전 ${unit}`} title={`이전 ${unit} (←)`} onClick={() => onStep(-1)} className="max-md:size-8">
      <ChevronLeftIcon />
    </Button>
    <Button variant="view" size="icon" aria-label={`다음 ${unit}`} title={`다음 ${unit} (→)`} onClick={() => onStep(1)} className="max-md:size-8">
      <ChevronRightIcon />
    </Button>
  </div>;
}
