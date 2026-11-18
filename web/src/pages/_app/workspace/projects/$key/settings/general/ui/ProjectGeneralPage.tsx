import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Suspense, useId, useState } from 'react';
import {
  PROJECT_KEY, PROJECT_NAME_MAX, changeProject, editProject, isProjectError, projectOptions, refreshProjects, useIsWorkspaceAdmin,
  type Project, type ProjectChange, type ProjectDraft,
} from '@/entities/project';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/shared/ui/field';
import { FormDialog } from '@/shared/ui/form-dialog';
import { InfoIcon, TriangleAlertIcon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { MarkNameField } from '@/shared/ui/mark-picker';
import { PageState } from '@/shared/ui/page-state';
import { MarkdownRead, RichDraft } from '@/shared/ui/rich-body';
import { useMarkdownDraft } from '@/shared/ui/rich-body/markdown-draft';
import { SettingsPage, SettingsRow, SettingsSection } from '@/shared/ui/settings';
import { Spinner } from '@/shared/ui/spinner';
import { pageCrumbs } from '@/shared/ui/nav-icon';

type Crumb = { label: string; href?: string; icon?: string };

const DESCRIPTION_MAX = 20_000;

const draftOf = (project: Project): ProjectDraft => ({
  key: project.key, name: project.name, description: project.description ?? '', icon: project.icon ?? null, color: project.color ?? null,
});

/**
 * A project's 설정 · 일반, for Workspace administrators (client/'s ProjectSettingsPage): its mark, name, key and description
 * saved together over the version the draft started from, and under them the danger zone. Read only while archived or
 * deleted.
 */
export function ProjectGeneralPage({ crumbs, projectKey }: { crumbs: Crumb[]; projectKey: string }) {
  const project = useQuery(projectOptions(projectKey));
  const isWorkspaceAdmin = useIsWorkspaceAdmin();
  const page = { crumbs: pageCrumbs(crumbs), title: '일반' };
  if (project.isError) return <SettingsPage {...page}>
    <PageState kind="error" isCompact title="프로젝트를 불러오지 못했습니다" description={project.error.message} />
  </SettingsPage>;
  if (!project.data) return <SettingsPage {...page}>{null}</SettingsPage>;
  return <SettingsPage {...page}>
    {/* The draft starts from the project once; a change heard from elsewhere does not overwrite what is being typed. */}
    <ProjectForm key={project.data.id} project={project.data} />
    {/* 보관 · 삭제 · 되살리기는 워크스페이스 관리자만(프로젝트 관리자는 이름 · 설명 · 표식까지). */}
    {isWorkspaceAdmin ? <DangerZone project={project.data} /> : null}
  </SettingsPage>;
}

/** 설명 칸: 프로젝트 설명(Markdown)을 본문 편집기로 쓴다. 불러오지 못하면 다시 불러오기를 둔다. */
function DescriptionEditor({ draft, draftId }: { draft: ReturnType<typeof useMarkdownDraft>; draftId: string }) {
  if (draft.error) return <div className="flex flex-col items-start gap-2">
    <p role="alert" className="text-sm">{draft.error.message}</p>
    <Button variant="secondary" size="sm" onClick={draft.retry}>본문 다시 불러오기</Button>
  </div>;
  if (draft.isPending) return <Spinner aria-label="본문을 불러오는 중" />;
  return <RichDraft isMarkdownDraft id={draftId} label="프로젝트 설명" value={draft.value} upload={draft.upload}
    onUploadPendingChange={draft.setUploadPending} onChange={draft.setValue} placeholder="프로젝트가 하는 일과 목표" />;
}

/**
 * The project's details as one form, saved over the version it started from, so a change someone made meanwhile is not
 * written over (the latest is offered to start again from); a key another project has or had is said under the key. A
 * changed key moves the page to the project's new address (the old one still opens the project).
 */
function ProjectForm({ project }: { project: Project }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const keyId = useId();
  const [base, setBase] = useState(project);
  const [draft, setDraft] = useState(() => draftOf(project));
  const [isChecked, setChecked] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const description = useMarkdownDraft(base.description ?? '');
  const resetEditor = () => { description.reset(); setEditorRevision(current => current + 1); };
  const save = useMutation({ mutationFn: async (next: ProjectDraft) => {
    const prepared = { ...next, description: await description.write(DESCRIPTION_MAX, '프로젝트 설명') };
    await editProject(base, prepared);
    return prepared;
  }, onSettled: () => refreshProjects(client) });
  const isReadOnly = !!project.archivedAt || !!project.deletedAt;
  const isConflict = isProjectError(save.error, 'PROJECT_VERSION_CONFLICT');
  const isKeyTaken = isProjectError(save.error, 'PROJECT_KEY_CONFLICT');
  const nameError = isChecked && !draft.name.trim() ? '프로젝트 이름을 입력해 주세요.' : undefined;
  const keyError = isChecked && !PROJECT_KEY.test(draft.key) ? '키는 영문 대문자 · 숫자 2~10자로 적어 주세요.'
    : isKeyTaken ? '다른 프로젝트가 쓰거나 썼던 키입니다. 다른 키를 적어 주세요.' : undefined;
  const isChanged = description.isChanged || JSON.stringify(draftOf(base)) !== JSON.stringify(draft);
  const change = (patch: Partial<ProjectDraft>) => { if (save.error && !isConflict) save.reset(); setDraft({ ...draft, ...patch }); };
  const submit = () => {
    setChecked(true);
    if (isReadOnly || description.isPending || description.error || !draft.name.trim() || !PROJECT_KEY.test(draft.key)) return;
    save.mutate(draft, {
      onSuccess: saved => {
        setChecked(false);
        setDraft(saved);
        setBase({ ...base, ...saved, icon: saved.icon ?? undefined, color: saved.color ?? undefined, version: base.version + 1 });
        resetEditor();
        if (draft.key !== base.key) void navigate({ href: `/workspace/projects/${draft.key}/settings/general`, replace: true });
      },
    });
  };
  const restart = () => { setBase(project); setDraft(draftOf(project)); resetEditor(); setChecked(false); save.reset(); };
  const other = save.error && !isConflict && !isKeyTaken ? save.error.message : undefined;
  return <div className="flex flex-col gap-4">
    {isReadOnly ? <Alert role="status">
      <InfoIcon />
      <AlertTitle>{project.deletedAt ? '삭제한 프로젝트입니다' : '보관한 프로젝트입니다'}</AlertTitle>
      <AlertDescription>{project.deletedAt ? '되살리면 설정을 다시 고칠 수 있습니다.' : '보관을 풀면 설정을 다시 고칠 수 있습니다.'}</AlertDescription>
    </Alert> : null}
    {isConflict ? <Alert>
      <TriangleAlertIcon className="text-mark-high" />
      <AlertTitle>다른 사람이 먼저 고쳤습니다</AlertTitle>
      <AlertDescription>저장하지 않았습니다. 최신 내용을 불러온 뒤 다시 고쳐 주세요.</AlertDescription>
      <div className="col-start-2 mt-1.5"><Button variant="secondary" size="sm" onClick={restart}>최신 내용 불러오기</Button></div>
    </Alert> : null}
    <SettingsSection title="프로젝트 정보">
      <SettingsRow wide label="프로젝트 기본정보">
        <div className="flex flex-col gap-1 @md/field-group:w-80">
          <MarkNameField
            mark={{ label: '프로젝트 표식', value: { icon: draft.icon ?? 'projects', color: draft.color ?? null },
              isDisabled: isReadOnly, onChange: mark => change({ icon: mark.icon, color: mark.color }) }}
            input={{ label: '프로젝트 이름', placeholder: '예: 고객 포털 개편', value: draft.name, isDisabled: isReadOnly, 'aria-invalid': !!nameError,
              onChange: name => change({ name: name.slice(0, PROJECT_NAME_MAX) }) }} />
          {nameError ? <p role="alert" className="text-sm text-destructive">{nameError}</p> : null}
        </div>
      </SettingsRow>
      <SettingsRow wide label="키">
        <div className="flex flex-col gap-1 @md/field-group:w-80">
          <Input id={keyId} aria-label="키" placeholder="APP" value={draft.key} disabled={isReadOnly} aria-invalid={!!keyError || undefined}
            className="font-mono max-md:h-11" onChange={event => change({ key: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })} />
          {keyError ? <p role="alert" className="text-sm text-destructive">{keyError}</p> : null}
        </div>
      </SettingsRow>
      <Field className="p-3">
        <FieldContent>
          <FieldLabel><FieldTitle>설명</FieldTitle></FieldLabel>
        </FieldContent>
        {isReadOnly ? (base.description?.trim() ? <MarkdownRead value={base.description} label="프로젝트 설명" /> : null) : <div className="min-h-32 rounded-lg border px-3 py-2">
          <Suspense fallback={null}>
            <DescriptionEditor draft={description} draftId={`project-description-${editorRevision}`} />
          </Suspense>
        </div>}
      </Field>
      {other ? <p role="alert" className="p-3 text-sm text-destructive">{other}</p> : null}
    </SettingsSection>
    {isReadOnly ? null : <div className="flex justify-end gap-2 max-md:*:h-11 max-md:*:flex-1">
      <Button variant="secondary" disabled={!isChanged || save.isPending} onClick={restart}>되돌리기</Button>
      <Button disabled={!isChanged || description.isPending || !!description.error || save.isPending} onClick={submit}>
        {save.isPending ? <Spinner data-icon="inline-start" /> : null}변경 저장
      </Button>
    </div>}
  </div>;
}

const ASK: Record<ProjectChange, { title: string; label: string; description: string }> = {
  archive: { title: '프로젝트를 보관할까요?', label: '보관', description: '진행 중 목록과 메뉴에서 빠지고 읽기만 됩니다. 보관함에서 되돌릴 수 있습니다.' },
  unarchive: { title: '보관을 풀까요?', label: '보관 해제', description: '진행 중 목록과 메뉴로 돌아오고 설정을 다시 고칠 수 있습니다.' },
  delete: { title: '프로젝트를 삭제할까요?', label: '프로젝트 삭제', description: '삭제한 프로젝트는 프로젝트 목록의 삭제됨 탭에서 되살릴 수 있습니다.' },
  restore: { title: '프로젝트를 되살릴까요?', label: '되살리기', description: '삭제하기 전의 자리로 돌아오고 목록과 메뉴에 다시 보입니다.' },
};

/**
 * The danger zone (client/'s DangerZone): 보관 or 보관 해제, and 삭제 with the project's key typed, each asked first; a
 * deleted project offers 되살리기 alone. Deleting leaves for the projects' list, where the project is gone.
 */
function DangerZone({ project }: { project: Project }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const keyId = useId();
  const [asking, setAsking] = useState<ProjectChange | null>(null);
  const [typed, setTyped] = useState('');
  const run = useMutation({
    mutationFn: (change: ProjectChange) => changeProject(project, change),
    onSuccess: (_, change) => { setAsking(null); if (change === 'delete') void navigate({ href: '/workspace/projects' }); },
    onSettled: () => refreshProjects(client),
  });
  const ask = (change: ProjectChange) => { run.reset(); setTyped(''); setAsking(change); };
  const close = (open: boolean) => { if (!open && !run.isPending) setAsking(null); };
  const row = (title: string, description: string, change: ProjectChange, isDestructive = false) =>
    <SettingsRow key={change} label={title} description={description}>
      <Button variant={isDestructive ? 'destructive' : 'secondary'} size="sm" className="max-md:h-11" onClick={() => ask(change)}>{ASK[change].label}</Button>
    </SettingsRow>;
  return <>
    <SettingsSection title="위험 구역">
      {project.deletedAt
        ? row('프로젝트 되살리기', ASK.restore.description, 'restore')
        : [
          project.archivedAt ? row('보관 해제', ASK.unarchive.description, 'unarchive') : row('프로젝트 보관', ASK.archive.description, 'archive'),
          row('프로젝트 삭제', '목록과 메뉴에서 사라집니다. 이 프로젝트를 가리키던 일정 · 회의록 · 연장근무에는 이름이 그대로 보입니다.', 'delete', true),
        ]}
    </SettingsSection>
    {asking === 'delete'
      ? <FormDialog open onOpenChange={close} title={ASK.delete.title} description={ASK.delete.description} submitLabel={ASK.delete.label} isDestructive
        isSubmitDisabled={typed !== project.key} isPending={run.isPending} onSubmit={() => run.mutate('delete')}>
        <Field>
          <FieldLabel htmlFor={keyId}>확인을 위해 키 {project.key}를 입력해 주세요</FieldLabel>
          <Input id={keyId} value={typed} placeholder={project.key} autoFocus className="font-mono max-md:h-11"
            onChange={event => setTyped(event.target.value.toUpperCase())} />
        </Field>
        {run.error ? <p role="alert" className="text-sm text-destructive">{run.error.message}</p> : null}
      </FormDialog>
      // 보관 · 보관 해제 · 되살리기는 되돌릴 수 있어 파괴하지 않는 확인(기본 색 단추)으로 묻는다.
      : <ConfirmDialog open={!!asking} onOpenChange={close} title={asking ? ASK[asking].title : ''}
        description={run.error?.message}
        action={asking ? { label: ASK[asking].label, variant: 'default', isPending: run.isPending, onAction: () => run.mutate(asking) } : undefined} />}
  </>;
}
