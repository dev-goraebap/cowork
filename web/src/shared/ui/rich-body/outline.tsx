import { createContext, useContext, useState, type ReactNode } from 'react';
import type { JSONNode } from '@/shared/lib/rich-document';
import { useMaskedDialog } from '@/shared/lib/panel';
import { useIsMobile } from '@/shared/lib/use-mobile';
import { AdaptivePopover } from '@/shared/ui/kit/adaptive-popover';
import { Button } from '@/shared/ui/kit/button';
import { GripIcon, HistoryIcon } from '@/shared/ui/kit/icon';
import { PropertyPill, pillVariants } from '@/shared/ui/kit/property-pill';

/** 본문의 제목 하나: 블록 id(화면의 data-block-id), 단계, 글. */
export type BodyHeading = { id: string; level: number; text: string };

/** 본문(JSON)에 든 제목들을 차례대로 꺼낸다. */
export function headingsOf(body: JSONNode | null | undefined): BodyHeading[] {
  const found: BodyHeading[] = [];
  const text = (node: JSONNode): string => node.text ?? node.content?.map(text).join('') ?? '';
  const walk = (node: JSONNode) => {
    if (node.type === 'heading' && node.attrs?.blockId) found.push({ id: String(node.attrs.blockId), level: Number(node.attrs.level) || 1, text: text(node).trim() });
    node.content?.forEach(walk);
  };
  if (body) walk(body);
  return found.filter(heading => heading.text);
}

/** 본문이 1단계 제목으로 시작하면 그 글(앞의 빈 문단은 건너뛴다). 인쇄가 문서 제목과 같은 제목을 두 번 쓰지 않는 데 쓴다. */
export function leadTitleOf(body: JSONNode | null | undefined): string | undefined {
  const text = (node: JSONNode): string => node.text ?? node.content?.map(text).join('') ?? '';
  const first = body?.content?.find(node => node.type !== 'paragraph' || text(node).trim());
  return first?.type === 'heading' && Number(first.attrs?.level) === 1 ? text(first).trim() || undefined : undefined;
}

/**
 * 상세 화면과 그 본문(RichBody)이 함께 쓰는 목차. 본문은 제목이 바뀔 때 알리고(publish), 화면은 그것으로 목차 버튼을
 * 그린다. 편집기 가장자리에 붙던 목차 표시(—)는 무엇인지 알기 어려워, 속성 칸이나 휴대폰 버튼으로 옮겼다.
 */
const OutlineContext = createContext<{ headings: BodyHeading[]; publish: (headings: BodyHeading[]) => void; versions: number; publishVersions: (count: number) => void } | null>(null);

export function BodyOutlineProvider({ children }: { children: ReactNode }) {
  const [headings, setHeadings] = useState<BodyHeading[]>([]);
  const publish = (next: BodyHeading[]) => setHeadings(current =>
    current.length === next.length && current.every((heading, index) => heading.id === next[index]!.id && heading.text === next[index]!.text) ? current : next);
  const [versions, publishVersions] = useState(0);
  return <OutlineContext value={{ headings, publish, versions, publishVersions }}>{children}</OutlineContext>;
}

/** 본문에 남은 버전 수(RichBody가 알린다). 상세의 정보 묶음이 '버전 N'으로 보이고 누르면 버전 기록을 연다. */
export const useBodyVersions = () => useContext(OutlineContext)?.versions ?? 0;
export const usePublishVersions = () => useContext(OutlineContext)?.publishVersions;

/** 정보 묶음의 버전 줄: 남은 버전 수, 누르면 버전 기록(주소 있는 대화상자 …/history). 버전이 없으면 그리지 않는다. */
export function BodyVersions() {
  const count = useBodyVersions();
  const history = useMaskedDialog('history');
  if (!count) return null;
  return <button type="button" data-slot="property-pill" aria-label="버전" className={pillVariants()} onClick={history.open}>
    <HistoryIcon /><span className="min-w-0 truncate">{`버전 ${count}개`}</span>
  </button>;
}

export const useBodyHeadings = () => useContext(OutlineContext)?.headings ?? [];
export const usePublishHeadings = () => useContext(OutlineContext)?.publish;

const go = (heading: BodyHeading) => {
  const target = document.querySelector(`[data-block-id="${CSS.escape(heading.id)}"]`);
  target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
};

/**
 * 목차 버튼. 데스크톱은 속성 칸의 한 항목(테두리 있는 팝오버로 제목 목록), 휴대폰은 오른쪽 아래 둥근 버튼(바텀시트).
 * 제목을 고르면 본문의 그 자리로 옮겨 간다. 제목이 없으면 그리지 않는다.
 */
export function BodyOutline() {
  const headings = useBodyHeadings();
  const isPhone = useIsMobile();
  const [isOpen, setOpen] = useState(false);
  if (!headings.length) return null;
  const base = Math.min(...headings.map(heading => heading.level));
  const list = (close: () => void) => <nav aria-label="이 본문의 목차" className="flex max-h-[60dvh] flex-col overflow-y-auto">
    {headings.map(heading => <Button key={heading.id} variant="ghost"
      className="h-auto min-h-8 justify-start py-1.5 text-left font-normal whitespace-normal max-md:min-h-12 max-md:text-[0.9375rem]"
      // check-ui: allow-style 제목 단계만큼 들여 쓴다(본문이 준 단계).
      style={{ paddingInlineStart: `${0.625 + Math.min(3, heading.level - base) * 0.75}rem` }}
      onClick={() => { close(); go(heading); }}>
      <span className="line-clamp-2">{heading.text}</span>
    </Button>)}
  </nav>;
  if (!isPhone) return <PropertyPill label="목차" icon={<GripIcon />} text={`목차 ${headings.length}`} width="w-72">{list}</PropertyPill>;
  return <AdaptivePopover title="목차" open={isOpen} onOpenChange={setOpen} className="w-72 p-1.5"
    trigger={<Button variant="secondary" size="icon-lg" aria-label="목차" title="목차"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-5 size-12 rounded-full border border-input bg-popover shadow-md">
      <GripIcon chosen={isOpen} />
    </Button>}>
    {list(() => setOpen(false))}
  </AdaptivePopover>;
}
