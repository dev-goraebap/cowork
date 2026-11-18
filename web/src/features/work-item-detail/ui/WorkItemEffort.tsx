import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import {
  deleteTimeEntry, formatHours, logTime, refreshWorkItems, STORY_POINTS, timeEntriesOptions, type WorkItemDraft, type WorkItemRow,
} from '@/entities/work-item';
import { Button } from '@/shared/ui/kit/button';
import { DatePicker } from '@/shared/ui/kit/date-picker';
import { Field, FieldLabel } from '@/shared/ui/kit/field';
import { ChartNoAxesColumnIcon, ClockIcon, Trash2Icon } from '@/shared/ui/kit/icon';
import { InfoPill } from '@/shared/ui/kit/info-pill';
import { Input } from '@/shared/ui/kit/input';
import { OptionPill, PropertyPill } from '@/shared/ui/kit/property-pill';
import { Spinner } from '@/shared/ui/kit/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/kit/tooltip';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
/** 숫자 칸의 값: 0보다 큰 수만 값이고, 비우거나 0 이하면 없음이다. */
const hoursOf = (text: string) => {
  const value = Number(text);
  return text.trim() && Number.isFinite(value) && value > 0 ? value : undefined;
};

/**
 * A work item's effort (레드마인의 추정시간·스토리 포인트·소요시간): story points from the scale, the estimate in hours,
 * and the time spent, logged here (hours, the day, a short note) and set against the estimate. 읽기만 하면 포인트와
 * 추정시간은 읽는 알약이고, 소요시간은 기록을 볼 수 있게 열린다.
 */
export function WorkItemEffort({ workItem, isDisabled, onChange }: {
  workItem: WorkItemRow; isDisabled: boolean; onChange: (patch: Partial<WorkItemDraft>) => void;
}) {
  const estimate = workItem.estimateHours ?? undefined;
  const spent = workItem.spentHours ?? 0;
  const points = workItem.storyPoints == null ? undefined : String(workItem.storyPoints);
  const estimateText = estimate === undefined ? undefined : `추정 ${formatHours(estimate)}`;
  return <>
    {isDisabled
      ? <InfoPill label="스토리 포인트" icon={<ChartNoAxesColumnIcon />}>{points === undefined ? '포인트 없음' : `${points}점`}</InfoPill>
      : <OptionPill label="스토리 포인트" icon={ChartNoAxesColumnIcon} emptyText="포인트 없음" value={points}
        options={[...STORY_POINTS.map(each => ({ value: String(each), label: `${each}점`, icon: <ChartNoAxesColumnIcon /> })), { value: '', label: '비우기' }]}
        onChange={value => onChange({ storyPoints: value ? Number(value) : undefined })} />}
    {isDisabled
      ? <InfoPill label="추정시간" icon={<ClockIcon />}>{estimateText ?? '추정시간'}</InfoPill>
      : <PropertyPill label="추정시간" icon={<ClockIcon />} text={estimateText}>
        {close => <EstimateForm value={estimate} onSave={hours => { onChange({ estimateHours: hours }); close(); }} />}
      </PropertyPill>}
    {spent === 0 && isDisabled
      ? <InfoPill label="소요시간" icon={<ClockIcon />}>소요시간</InfoPill>
      : <PropertyPill label="소요시간" icon={<ClockIcon />} width="w-80"
        text={estimate === undefined ? `소요 ${formatHours(spent)}` : `소요 ${formatHours(spent)} / ${formatHours(estimate)}`}>
        {() => <TimeLog workItem={workItem} canLog={!isDisabled} />}
      </PropertyPill>}
  </>;
}

function EstimateForm({ value, onSave }: { value?: number; onSave: (hours?: number) => void }) {
  const id = useId();
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const hours = hoursOf(text);
  return <form className="flex flex-col gap-3 p-1" onSubmit={event => { event.preventDefault(); if (hours !== value) onSave(hours); }}>
    <Field>
      <FieldLabel htmlFor={id}>추정시간 (시간)</FieldLabel>
      <Input id={id} type="number" inputMode="decimal" placeholder="예: 2.5" min={0} max={1000} step={0.5} value={text} autoFocus
        className="max-md:h-11" onChange={event => setText(event.target.value)} />
    </Field>
    <div className="flex justify-end gap-2 max-md:*:h-11">
      {value !== undefined ? <Button type="button" variant="ghost" size="sm" onClick={() => onSave(undefined)}>비우기</Button> : null}
      <Button type="submit" size="sm" disabled={hours === value}>저장</Button>
    </div>
  </form>;
}

function TimeLog({ workItem, canLog }: { workItem: WorkItemRow; canLog: boolean }) {
  const client = useQueryClient();
  const hoursId = useId();
  const dayId = useId();
  const noteId = useId();
  const key = workItem.projectKey, number = workItem.number;
  const entries = useQuery(timeEntriesOptions(key, number));
  const [hoursText, setHoursText] = useState('');
  const [day, setDay] = useState(today);
  const [note, setNote] = useState('');
  const hours = hoursOf(hoursText);
  const refresh = () => refreshWorkItems(client);
  const add = useMutation({
    mutationFn: () => logTime(key, number, { hours: hours!, spentOn: day, note: note.trim() || undefined }),
    onSuccess: async () => { setHoursText(''); setNote(''); await refresh(); },
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteTimeEntry(key, number, id), onSuccess: refresh });
  const list = entries.data?.entries ?? [];
  return <div className="flex flex-col gap-3 p-1">
    {canLog ? <form className="flex flex-col gap-2" onSubmit={event => { event.preventDefault(); if (hours && !add.isPending) add.mutate(); }}>
      <div className="flex items-end gap-2">
        <Field className="w-32 shrink-0">
          <FieldLabel htmlFor={hoursId}>쓴 시간 (시간)</FieldLabel>
          <Input id={hoursId} type="number" inputMode="decimal" placeholder="예: 1.5" min={0} max={24} step={0.25} value={hoursText}
            className="max-md:h-11" onChange={event => setHoursText(event.target.value)} />
        </Field>
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={dayId}>일한 날</FieldLabel>
          <DatePicker id={dayId} label="일한 날" value={day} onChange={setDay} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={noteId}>한 일</FieldLabel>
        <Input id={noteId} placeholder="무엇을 했는지 한 줄 (선택)" value={note} className="max-md:h-11" onChange={event => setNote(event.target.value.slice(0, 200))} />
      </Field>
      {add.error ? <p role="alert" className="text-xs text-destructive">{add.error.message}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="max-md:h-11" disabled={!hours || add.isPending}>
          {add.isPending ? <Spinner data-icon="inline-start" /> : null}기록
        </Button>
      </div>
    </form> : null}
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="font-medium">기록 {list.length}건</span>
      <span className="tabular-nums">
        {formatHours(entries.data?.spentHours ?? 0)}{entries.data?.estimateHours != null ? ` / 추정 ${formatHours(entries.data.estimateHours)}` : ''}
      </span>
    </div>
    {entries.isPending ? <p className="text-xs text-muted-foreground">불러오는 중…</p>
      : list.length === 0 ? <p className="text-xs text-muted-foreground">아직 기록이 없습니다.</p>
      // 테두리 안의 줄들(줄 사이에만 선), 최근 날부터.
      : <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-xl border">
        {list.map(entry => <li key={entry.id} className="flex items-center gap-2 py-2 ps-3 pe-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{formatHours(entry.hours ?? 0)} · {entry.memberName ?? '알 수 없는 사람'}</span>
            <span className="truncate text-xs text-muted-foreground">{entry.spentOn}{entry.note ? ` · ${entry.note}` : ''}</span>
          </div>
          {entry.canDelete ? <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="기록 지우기" className="max-md:size-11"
              disabled={remove.isPending} onClick={() => remove.mutate(entry.id!)}><Trash2Icon /></Button>} />
            <TooltipContent>지우기</TooltipContent>
          </Tooltip> : null}
        </li>)}
      </ul>}
  </div>;
}
