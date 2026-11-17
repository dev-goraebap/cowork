import { useId, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

/** 라우터가 넘기는 경로 한 단계: 아이콘은 이름(글자)이다. 키트 Page에는 pageCrumbs로 바꿔 넘긴다. */
export type Crumb = { label: string; href?: string; icon?: string };

type Choice = { value: string; label: string };

/** 설정 줄의 고르기(사이클 기간 · 분류): 몇 개 안 되는 값에서 하나. */
export function ChoiceSelect({ label, options, value, disabled, onChange, className = 'min-w-40' }: {
  label: string; options: Choice[]; value: string; disabled?: boolean; onChange: (value: string) => void; className?: string;
}) {
  return <Select items={options} value={value} disabled={disabled} onValueChange={next => { if (next !== null) onChange(next); }}>
    <SelectTrigger aria-label={label} className={className}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectGroup>
    </SelectContent>
  </Select>;
}

/** 양식 대화상자의 입력 칸 하나: 이름, 칸, 설명. 필수가 아니면 이름 뒤에 (선택). */
export function TextField({ label, description, isRequired, isOptional, ...input }: {
  label: string; description?: string; isRequired?: boolean; isOptional?: boolean; value: string; onChange: (value: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  const id = useId();
  return <Field>
    <FieldLabel htmlFor={id}>{label}{isOptional ? <span className="font-normal text-muted-foreground">(선택)</span> : null}</FieldLabel>
    <Input id={id} required={isRequired} value={input.value} placeholder={input.placeholder} type={input.type} autoFocus={input.autoFocus}
      className="max-md:h-11" onChange={event => input.onChange(event.target.value)} />
    {description ? <FieldDescription>{description}</FieldDescription> : null}
  </Field>;
}

/** 줄 끝의 작은 아이콘 버튼(복사 · 보기). 휴대폰은 44px. */
export function IconAction({ label, tooltip, onClick, children }: { label: string; tooltip: string; onClick: () => void; children: ReactNode }) {
  return <Tooltip>
    <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} className="max-md:size-11" onClick={onClick}>{children}</Button>} />
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>;
}
