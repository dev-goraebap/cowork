import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { accessOptions, useReplaceAccess, type AccessLevel, type Grant, type GrantSubject } from '@/entities/document';
import { orgChartOptions } from '@/entities/organization';
import { projectsOptions } from '@/entities/project';
import { AdaptivePopover } from '@/shared/ui/kit/adaptive-popover';
import { Alert, AlertTitle } from '@/shared/ui/kit/alert';
import { Button } from '@/shared/ui/kit/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/kit/dialog';
import { LockIcon, OctagonXIcon, PlusIcon, ProjectsIcon, RestoreIcon, UserIcon, XIcon, type Icon } from '@/shared/ui/kit/icon';
import { OptionList } from '@/shared/ui/kit/option-list';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/kit/select';
import { Spinner } from '@/shared/ui/kit/spinner';

const LEVELS: { value: Grant['level']; label: string }[] = [{ value: 'READ', label: '보기' }, { value: 'WRITE', label: '쓰기' }, { value: 'MANAGE', label: '관리' }];
const LEVEL_TEXT: Record<AccessLevel, string> = { NONE: '볼 수 없음', READ: '보기', WRITE: '쓰기', MANAGE: '관리' };
const SUBJECT_ICON: Record<GrantSubject, Icon> = { OWNER: UserIcon, USER: UserIcon, PROJECT: ProjectsIcon };
const SUBJECT_TEXT: Record<GrantSubject, string> = { OWNER: '만든 사람', USER: '사람', PROJECT: '프로젝트' };
const keyOf = (grant: Pick<Grant, 'subject' | 'subjectId'>) => `${grant.subject}:${grant.subjectId ?? ''}`;

/** One grant's line: who (and what kind of subject), and how far, changeable or not. */
function GrantLine({ grant, onLevel, onRemove }: { grant: Grant; onLevel?: (level: Grant['level']) => void; onRemove?: () => void }) {
  const SubjectIcon = SUBJECT_ICON[grant.subject];
  return <div className="flex min-h-10 items-center gap-2 border-b py-1">
    <SubjectIcon className="size-4 shrink-0 text-icon-muted" />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{grant.name ?? (grant.subject === 'OWNER' ? '만든 사람' : '이름 없음')}</span>
      {grant.name || grant.subject !== 'OWNER' ? <span className="text-xs text-muted-foreground">{SUBJECT_TEXT[grant.subject]}</span> : null}
    </div>
    {onLevel
      ? <Select items={LEVELS} value={grant.level} onValueChange={value => { if (value) onLevel(value as Grant['level']); }}>
        <SelectTrigger size="sm" aria-label={`${grant.name ?? ''} 권한`} className="min-w-20"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>
          {LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
        </SelectGroup></SelectContent>
      </Select>
      : <span className="text-xs text-muted-foreground">{LEVEL_TEXT[grant.level]}</span>}
    {onRemove ? <Button variant="ghost" size="icon-sm" aria-label={`${grant.name ?? ''} 빼기`} title="빼기" onClick={onRemove}><XIcon /></Button> : null}
  </div>;
}

/** 대상 더하기: 사람 · 프로젝트를 이름으로 찾아 고르면 보기 권한으로 더한다. */
function AddSubject({ choices, isDisabled, onPick }: { choices: { value: string; label: string }[]; isDisabled: boolean; onPick: (value: string) => void }) {
  const [isOpen, setOpen] = useState(false);
  return <AdaptivePopover title="대상 더하기" open={isOpen} onOpenChange={setOpen} className="w-80 p-1.5"
    trigger={<Button variant="outline" size="sm" disabled={isDisabled} className="self-start"><PlusIcon data-icon="inline-start" />대상 더하기</Button>}>
    <OptionList label="사람 · 프로젝트 찾기" isSearchable options={choices} onPick={value => { setOpen(false); onPick(value); }} />
  </AdaptivePopover>;
}

/**
 * 권한 (docs/pending-records.md, 문서함 ②): a folder's or document's permissions as a panel. The closed folders above it
 * come first, read only (what it takes before its own); then its own grants, none meaning open (it takes what is above).
 * Whoever manages it closes it (the maker managing to start with), adds a member, a department (with those under it)
 * or a project's members at 보기, changes how far each goes, takes one away, or opens it again; the rest read.
 */
export function AccessDialog({ target, id, name, onClose }: { target: 'documents' | 'document-folders'; id: string; name: string; onClose: () => void }) {
  const access = useQuery(accessOptions(target, id));
  const org = useQuery(orgChartOptions());
  const projects = useQuery(projectsOptions('ACTIVE'));
  const [draft, setDraft] = useState<Grant[] | null>(null);
  const replace = useReplaceAccess(onClose);
  const canManage = !!access.data?.canManage;
  const grants = draft ?? access.data?.grants ?? [];
  const change = (next: Grant[]) => { replace.reset(); setDraft(next); };
  const taken = new Set(grants.map(keyOf));
  const choices = [
    ...(org.data?.people ?? []).map(person => ({ value: `USER:${person.id}`, label: `${person.name} · 사람`, name: person.name })),
    ...(projects.data ?? []).map(project => ({ value: `PROJECT:${project.id}`, label: `${project.name} · 프로젝트`, name: project.name })),
  ].filter(choice => !taken.has(choice.value));
  const add = (value: string) => {
    const choice = choices.find(each => each.value === value);
    if (!choice) return;
    const [subject, subjectId] = value.split(':') as [GrantSubject, string];
    change([...grants, { subject, subjectId, name: choice.name, level: 'READ' }]);
  };
  const isClosed = grants.length > 0;
  const groupTitle = 'text-xs font-medium text-muted-foreground';
  return <Dialog open onOpenChange={open => { if (!open && !replace.isPending) onClose(); }}>
    <DialogContent className="overflow-y-auto">
      <DialogHeader>
        <DialogTitle>권한</DialogTitle>
        <DialogDescription>{name}</DialogDescription>
      </DialogHeader>
      {access.isPending ? <div className="grid place-items-center p-6"><Spinner aria-label="권한을 불러오는 중" /></div>
        : access.isError ? <p role="alert" className="text-muted-foreground">{access.error.message}</p>
          : <div className="flex flex-col gap-5">
            <p className="text-xs text-muted-foreground">지금 내 권한: {LEVEL_TEXT[access.data.level]}</p>
            {access.data.inherited.map(above => <section key={above.folderId} aria-label={`${above.folderName}에서 내려받음`} className="flex flex-col gap-1">
              <h3 className={groupTitle}>'{above.folderName}'에서 내려받음</h3>
              {above.grants.map(grant => <GrantLine key={keyOf(grant)} grant={grant} />)}
            </section>)}
            <section aria-label="이 항목의 규칙" className="flex flex-col gap-2">
              <h3 className={groupTitle}>이 항목의 규칙</h3>
              {isClosed
                ? grants.map((grant, index) => <GrantLine key={keyOf(grant)} grant={grant}
                  onLevel={canManage ? level => change(grants.map((each, at) => (at === index ? { ...each, level } : each))) : undefined}
                  onRemove={canManage ? () => change(grants.filter((_, at) => at !== index)) : undefined} />)
                : <p className="text-muted-foreground">{access.data.inherited.length ? '위 규칙을 그대로 따릅니다.' : '공간의 모두가 보고 씁니다.'}</p>}
              {canManage && isClosed ? <AddSubject choices={choices} isDisabled={org.isPending || projects.isPending} onPick={add} /> : null}
              {canManage ? <div className="flex gap-2">
                {isClosed
                  ? <Button variant="secondary" size="sm" onClick={() => change([])}><RestoreIcon data-icon="inline-start" />다시 열기 (규칙 없애기)</Button>
                  : <Button variant="secondary" size="sm" onClick={() => change([{ subject: 'OWNER', level: 'MANAGE' }])}><LockIcon data-icon="inline-start" />닫기 (대상만 보게)</Button>}
              </div> : null}
            </section>
            {replace.error ? <Alert variant="destructive"><OctagonXIcon /><AlertTitle className="whitespace-normal">{replace.error.message}</AlertTitle></Alert> : null}
          </div>}
      <DialogFooter>
        <Button variant="ghost" disabled={replace.isPending} onClick={onClose}>{canManage ? '취소' : '닫기'}</Button>
        {canManage ? <Button disabled={!draft || replace.isPending} onClick={() => replace.mutate({ target, id, grants })}>
          {replace.isPending ? <Spinner data-icon="inline-start" /> : null}저장
        </Button> : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
