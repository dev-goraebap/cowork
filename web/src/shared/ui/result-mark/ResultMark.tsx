import { useEffect, useRef } from 'react';
import { cn } from 'cn';
import { celebrate } from '@/shared/lib/celebrate';

const EASE = 'cubic-bezier(0.65, 0, 0.45, 1)';

/**
 * 완료 표시가 그려지고, 축하가 필요한 동작에만 종이 조각이 퍼진다. 원이 그려진 뒤 살짝 부풀고 그 위에 체크가 그어진다.
 * 그리는 움직임은 Web Animations로 둔다(CSS 파일 없이). 움직임을 줄이는 설정에서는 다 그린 모양만 보인다.
 */
export function ResultMark({ size = 'lg', tone = 'success', celebrates = false, glyphs }: {
  size?: 'sm' | 'lg'; tone?: 'success' | 'neutral'; celebrates?: boolean; glyphs?: readonly string[];
}) {
  const mark = useRef<SVGSVGElement>(null);
  const circle = useRef<SVGCircleElement>(null);
  const check = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof Element.prototype.animate !== 'function') return undefined;
    const animations = [
      circle.current?.animate([{ strokeDashoffset: 151 }, { strokeDashoffset: 0 }], { duration: 560, easing: EASE, fill: 'backwards' }),
      circle.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.45 }, { transform: 'scale(1)' }],
        { duration: 420, delay: 480, easing: 'cubic-bezier(0.3, 1.6, 0.5, 1)' }),
      check.current?.animate([{ strokeDashoffset: 34 }, { strokeDashoffset: 0 }], { duration: 320, delay: 460, easing: EASE, fill: 'backwards' }),
    ];
    return () => animations.forEach(animation => animation?.cancel());
  }, []);
  useEffect(() => {
    if (celebrates) return celebrate(mark.current, { glyphs });
  }, [celebrates, glyphs]);
  return <svg ref={mark} viewBox="0 0 52 52" aria-hidden="true" focusable="false"
    className={cn('shrink-0 overflow-visible', size === 'lg' ? 'size-18' : 'size-6',
      tone === 'success' ? 'fill-event-green stroke-mark-done' : 'fill-muted stroke-muted-foreground')}>
    <circle ref={circle} cx="26" cy="26" r="24" strokeWidth="2.5" strokeDasharray="151" className="origin-center" />
    <path ref={check} d="M15 27.5l7.2 7.2L37.5 19" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="34" />
  </svg>;
}
