import { useEffect, useId, useRef, type ReactNode, type RefCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { XIcon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/shared/ui/input-group';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { DEFAULT_PAGE_SETUP, PAPERS, type Paper, type PageSetup } from './model';
import type { PageArea } from './PageCanvas';

export type SettingsTab = 'document' | 'headerFooter';
type Slot = { area: PageArea; side: 'left' | 'center' | 'right' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="flex flex-col gap-3 border-t p-4">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </section>;
}

/** 단위가 붙은 숫자 칸. 범위를 벗어난 값은 범위 끝으로 맞춘다(빈 칸은 바꾸지 않는다). placeholder는 기본값이다. */
function NumberField({ label, unit, min, max, value, placeholder, onChange }: {
  label: string; unit: string; min: number; max: number; value: number; placeholder: number; onChange: (value: number) => void;
}) {
  const id = useId();
  return <Field className="min-w-0 flex-1 gap-1.5">
    <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">{label}</FieldLabel>
    <InputGroup className="h-8 max-md:h-11">
      <InputGroupInput id={id} type="number" inputMode="decimal" min={min} max={max} step={1} value={value} placeholder={String(placeholder)} className="tabular-nums"
        onChange={event => { if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) onChange(Math.min(max, Math.max(min, event.target.valueAsNumber))); }} />
      <InputGroupAddon align="inline-end"><InputGroupText className="text-xs">{unit}</InputGroupText></InputGroupAddon>
    </InputGroup>
  </Field>;
}

function TextField({ label, value, inputRef, onFocus, onChange }: {
  label: string; value: string; inputRef: RefCallback<HTMLInputElement>; onFocus: () => void; onChange: (value: string) => void;
}) {
  const id = useId();
  return <Field className="min-w-0 flex-1 gap-1.5">
    <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">{label}</FieldLabel>
    <Input id={id} ref={inputRef} value={value} placeholder="비어 있음" className="h-8 max-md:h-11" onFocus={onFocus} onChange={event => onChange(event.target.value)} />
  </Field>;
}

/**
 * 페이지 설정 칸(PDF 미리보기 오른쪽). 문서 탭은 용지·방향·여백, 머리말·바닥글 탭은 첫 페이지 다르게, 머리말(왼쪽·오른쪽)·
 * 바닥글(왼쪽·가운데·오른쪽) 글과 가장자리 거리, 페이지 번호·전체 페이지 넣기다. 바꾸면 그 자리에서 다시 나눈다(저장은 호스트가 한다).
 * focus는 종이의 머리말·바닥글을 두 번 눌렀을 때 그 칸으로 커서를 옮긴다. 놓인 자리(오른쪽 칸)를 위아래 · 좌우 끝까지 채운다.
 * 모양은 키트의 문서 설정 칸(shared/ui/document)과 같다. 화면용 페이지 사이 간격은 PDF 미리보기가 정하므로 두지 않는다.
 */
export function DocumentSettings({ setup, onChange, tab, onTab, focus, onClose }: {
  setup: PageSetup; onChange: (setup: PageSetup) => void; tab: SettingsTab; onTab: (tab: SettingsTab) => void;
  focus?: PageArea | null; onClose: () => void;
}) {
  const last = useRef<Slot>({ area: 'footer', side: 'right' });
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const switchId = useId();
  const keyOf = (slot: Slot) => `${slot.area}-${slot.side}`;
  useEffect(() => {
    if (!focus || tab !== 'headerFooter') return;
    const slot: Slot = { area: focus, side: 'left' };
    last.current = slot;
    inputs.current.get(keyOf(slot))?.focus();
  }, [focus, tab]);
  const set = (patch: Partial<PageSetup>) => onChange({ ...setup, ...patch });
  const margin = (side: keyof PageSetup['margins']) => <NumberField label={{ top: '위', bottom: '아래', left: '왼쪽', right: '오른쪽' }[side]} unit="mm"
    min={0} max={60} placeholder={DEFAULT_PAGE_SETUP.margins[side]} value={setup.margins[side]} onChange={value => set({ margins: { ...setup.margins, [side]: value } })} />;
  const read = (slot: Slot) => slot.area === 'header' ? setup.header[slot.side as 'left' | 'right'] : setup.footer[slot.side];
  const write = (slot: Slot, next: string) => slot.area === 'header' ? set({ header: { ...setup.header, [slot.side]: next } }) : set({ footer: { ...setup.footer, [slot.side]: next } });
  const text = (slot: Slot, label: string) => <TextField label={label} value={read(slot)} onFocus={() => { last.current = slot; }} onChange={next => write(slot, next)}
    inputRef={element => { if (element) inputs.current.set(keyOf(slot), element); else inputs.current.delete(keyOf(slot)); }} />;
  // 페이지 번호·전체 페이지는 마지막으로 고르던 칸의 끝에 넣는다.
  const insertToken = (token: string) => {
    const slot = last.current, current = read(slot);
    write(slot, `${current}${current && !current.endsWith(' ') ? ' ' : ''}${token}`);
    requestAnimationFrame(() => inputs.current.get(keyOf(slot))?.focus());
  };
  const papers = (Object.keys(PAPERS) as Paper[]).map(paper => ({ value: paper, label: `${paper} (${PAPERS[paper].width} × ${PAPERS[paper].height}mm)` }));
  return <aside aria-label="문서 설정" className="box-border flex min-h-0 min-w-0 flex-1 flex-col self-stretch border-l bg-background">
    <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
      <SegmentedControl label="설정 묶음" value={tab} onChange={onTab} options={[{ value: 'document', label: '문서' }, { value: 'headerFooter', label: '머리말 · 바닥글' }]} />
      <Button variant="ghost" size="icon-sm" aria-label="문서 설정 닫기" title="닫기" className="text-icon-muted" onClick={onClose}><XIcon /></Button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto pb-6 [scrollbar-width:thin]">
      {tab === 'document' ? <>
        <Section title="용지">
          <Select items={papers} value={setup.paper} onValueChange={value => { if (value) set({ paper: value as Paper }); }}>
            <SelectTrigger size="sm" aria-label="용지 크기" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{papers.map(paper => <SelectItem key={paper.value} value={paper.value}>{paper.label}</SelectItem>)}</SelectContent>
          </Select>
          <SegmentedControl label="방향" value={setup.orientation} onChange={orientation => set({ orientation })} className="w-full"
            options={[{ value: 'portrait', label: '세로' }, { value: 'landscape', label: '가로' }]} />
        </Section>
        <Section title="여백">
          <div className="flex gap-2">{margin('top')}{margin('bottom')}</div>
          <div className="flex gap-2">{margin('left')}{margin('right')}</div>
        </Section>
      </> : <>
        <Section title="배치">
          <Field orientation="horizontal" className="items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <FieldLabel htmlFor={switchId}>첫 페이지 다르게</FieldLabel>
              <FieldDescription className="text-xs">표지처럼 첫 페이지에는 머리말·바닥글을 두지 않습니다.</FieldDescription>
            </div>
            <Switch id={switchId} checked={setup.differentFirstPage} onCheckedChange={value => set({ differentFirstPage: value })} />
          </Field>
        </Section>
        <Section title="머리말">
          <div className="flex gap-2">{text({ area: 'header', side: 'left' }, '왼쪽')}{text({ area: 'header', side: 'right' }, '오른쪽')}</div>
          <NumberField label="위 가장자리에서" unit="mm" min={0} max={40} placeholder={DEFAULT_PAGE_SETUP.headerDistance} value={setup.headerDistance}
            onChange={value => set({ headerDistance: value })} />
        </Section>
        <Section title="바닥글">
          <div className="flex gap-2">{text({ area: 'footer', side: 'left' }, '왼쪽')}{text({ area: 'footer', side: 'center' }, '가운데')}{text({ area: 'footer', side: 'right' }, '오른쪽')}</div>
          <NumberField label="아래 가장자리에서" unit="mm" min={0} max={40} placeholder={DEFAULT_PAGE_SETUP.footerDistance} value={setup.footerDistance}
            onChange={value => set({ footerDistance: value })} />
        </Section>
        <Section title="페이지 번호">
          <p className="text-xs text-muted-foreground">마지막으로 고르던 칸의 끝에 넣습니다.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="px-4" onMouseDown={event => event.preventDefault()} onClick={() => insertToken('{page}')}>페이지 번호 넣기</Button>
            <Button variant="secondary" className="px-4" onMouseDown={event => event.preventDefault()} onClick={() => insertToken('{total}')}>전체 페이지 넣기</Button>
          </div>
        </Section>
      </>}
    </div>
  </aside>;
}
