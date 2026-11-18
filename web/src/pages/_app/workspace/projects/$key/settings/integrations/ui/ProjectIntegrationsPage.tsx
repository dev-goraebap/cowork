import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { projectOptions } from '@/entities/project';
import {
  CODE_PROVIDERS, columnsOptions, connectRepository, disconnectRepository, integrationRulesOptions, integrationsOptions, providerName,
  refreshCode, reviseIntegration, RULE_EVENTS, setIntegrationRule,
  type BoardColumn, type CodeIntegration, type CodeProvider, type CodeRule,
} from '@/entities/work-item';
import { AdaptivePopover } from '@/shared/ui/adaptive-popover';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormDialog } from '@/shared/ui/form-dialog';
import { ChevronDownIcon, CopyIcon, EyeClosedIcon, EyeIcon, SquareArrowOutUpRightIcon } from '@/shared/ui/icon';
import { OptionList } from '@/shared/ui/option-list';
import { PageState } from '@/shared/ui/page-state';
import { SettingsPage, SettingsRow, SettingsSection } from '@/shared/ui/settings';
import { toast } from '@/shared/ui/toast';
import { pageCrumbs } from '@/shared/ui/nav-icon';
import { IconAction, TextField } from '@/shared/ui/settings';

type Crumb = { label: string; href?: string; icon?: string };

const when = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * A project's 설정 · 저장소 연동, for Workspace administrators (BIT's IntegrationSettings, D-087; 결정기록 2026-11-04 저장소
 * 연동): several repositories on GitLab, GitHub or Gitea, connected with a token (the server checks it and registers the
 * webhook itself where the token may) or without one (the webhook's address and secret shown to register by hand),
 * when a delivery last came and what went wrong, and the rules by which a pushed branch, an opened and a merged
 * request move the work items they name (DEMO-6). Work items show what was linked on their 활동.
 */
export function ProjectIntegrationsPage({ crumbs, projectKey }: { crumbs: Crumb[]; projectKey: string }) {
  const project = useQuery(projectOptions(projectKey));
  const integrations = useQuery(integrationsOptions(projectKey));
  const [connecting, setConnecting] = useState<CodeProvider | null>(null);
  const failure = project.error ?? integrations.error;
  const page = { crumbs: pageCrumbs(crumbs), title: '저장소 연동' };
  if (failure) return <SettingsPage {...page}>
    <PageState kind="error" isCompact title="저장소 연동을 불러오지 못했습니다" description={failure.message} />
  </SettingsPage>;
  if (!project.data || !integrations.data) return <SettingsPage {...page}>{null}</SettingsPage>;
  const connected = integrations.data;
  return <SettingsPage {...page}
    description={`저장소의 브랜치 · PR(MR) · 커밋에 업무 번호(예: ${projectKey}-1)를 적으면 그 업무의 활동에 이어지고, 아래 규칙대로 상태가 옮겨집니다.`}>
    {connected.map(integration => <Connected key={integration.id} projectKey={projectKey} integration={integration} />)}
    <SettingsSection title={connected.length ? '저장소 추가 연결' : '저장소 연결'}>
      {CODE_PROVIDERS.map(provider => <SettingsRow key={provider.value} label={provider.label} description={provider.hint}>
        <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setConnecting(provider.value)}>연결</Button>
      </SettingsRow>)}
    </SettingsSection>
    <Rules projectKey={projectKey} />
    {connecting ? <ConnectDialog projectKey={projectKey} provider={connecting} onClose={() => setConnecting(null)} /> : null}
  </SettingsPage>;
}

/** 웹훅 주소 · 비밀값: 줄에 맞춰 자른 고정폭 글자. */
function Code({ children }: { children: ReactNode }) {
  return <code className="min-w-0 truncate font-mono text-xs text-muted-foreground md:max-w-64 max-md:flex-1 max-md:text-sm">{children}</code>;
}

/** One connected repository: where, whose token, the webhook (registered, or its address and secret), and the way off. */
function Connected({ projectKey, integration }: { projectKey: string; integration: CodeIntegration }) {
  const client = useQueryClient();
  const [isToken, setToken] = useState(false);
  const [isAsking, setAsking] = useState(false);
  const [isShown, setShown] = useState(false);
  const remove = useMutation({
    mutationFn: () => disconnectRepository(projectKey, integration),
    onSuccess: () => setAsking(false), onSettled: () => refreshCode(client),
  });
  const name = providerName(integration.provider);
  const isGitLab = integration.provider === 'gitlab';
  const copy = (value: string, what: string) => void navigator.clipboard?.writeText(value)
    .then(() => toast.add({ title: `${what}을 복사했습니다.` }), () => toast.add({ type: 'error', title: '복사하지 못했습니다.' }));
  const heard = integration.lastEventAt ? `마지막으로 받은 웹훅 ${when.format(new Date(integration.lastEventAt))}` : '아직 받은 웹훅이 없습니다';
  return <SettingsSection title={`${name} · ${integration.repository}`}>
    <SettingsRow wide
      label={<a href={integration.webUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
        {integration.repository}<SquareArrowOutUpRightIcon className="size-3.5 text-icon-muted" />
      </a>}
      description={integration.hasToken
        ? integration.accountLogin ? `${integration.accountLogin} 계정의 토큰으로 연결했습니다.` : '토큰으로 연결했습니다.'
        : '토큰 없이 연결했습니다. 웹훅은 저장소에 직접 등록합니다.'}>
      <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setToken(true)}>{integration.hasToken ? '토큰 바꾸기' : '토큰 넣기'}</Button>
    </SettingsRow>
    {integration.webhookRegistered
      ? <SettingsRow hasValue={false} label="웹훅" description={`서버가 저장소에 직접 등록했습니다. ${heard}.`} />
      : <>
        <SettingsRow wide label="웹훅 주소"
          description={`${name} 저장소 설정의 Webhooks에 이 주소와 아래 비밀값을 넣고, Push와 ${isGitLab ? 'Merge request' : 'Pull request'} 이벤트를 고릅니다(JSON). ${heard}.`}>
          <div className="flex min-w-0 items-center gap-1">
            <Code>{integration.webhookUrl}</Code>
            <IconAction label="웹훅 주소 복사" tooltip="복사" onClick={() => copy(integration.webhookUrl, '웹훅 주소')}><CopyIcon /></IconAction>
          </div>
        </SettingsRow>
        <SettingsRow wide label={isGitLab ? 'Secret token' : 'Secret'}>
          <div className="flex min-w-0 items-center gap-1">
            <Code>{isShown ? integration.webhookSecret ?? '' : '••••••••••••'}</Code>
            <IconAction label={isShown ? '비밀값 숨기기' : '비밀값 보기'} tooltip={isShown ? '숨기기' : '보기'} onClick={() => setShown(!isShown)}>
              {isShown ? <EyeClosedIcon /> : <EyeIcon />}
            </IconAction>
            <IconAction label="비밀값 복사" tooltip="복사" onClick={() => copy(integration.webhookSecret ?? '', '비밀값')}><CopyIcon /></IconAction>
          </div>
        </SettingsRow>
      </>}
    {integration.lastError ? <SettingsRow hasValue={false} label="최근 오류" description={integration.lastError} /> : null}
    <SettingsRow label="연결 끊기">
      <Button variant="destructive" size="sm" className="max-md:h-11" onClick={() => { remove.reset(); setAsking(true); }}>연결 끊기</Button>
    </SettingsRow>
    {isToken ? <TokenDialog projectKey={projectKey} integration={integration} onClose={() => setToken(false)} /> : null}
    <ConfirmDialog open={isAsking} onOpenChange={setAsking} title={`${name} 연결을 끊을까요?`}
      description={remove.error?.message ?? `${integration.repository}와의 연결과 업무에 이어진 코드 기록이 지워집니다. 다시 연결하면 새로 쌓입니다.`}
      action={{ label: '연결 끊기', isPending: remove.isPending, onAction: () => remove.mutate() }} />
  </SettingsSection>;
}

/** 연결: the host's address (GitLab, GitHub by default; Gitea always), the repository, and a token or none. */
function ConnectDialog({ projectKey, provider, onClose }: { projectKey: string; provider: CodeProvider; onClose: () => void }) {
  const client = useQueryClient();
  const host = CODE_PROVIDERS.find(each => each.value === provider)!;
  const [baseUrl, setBaseUrl] = useState(provider === 'gitlab' ? 'https://gitlab.com' : '');
  const [repository, setRepository] = useState('');
  const [token, setToken] = useState('');
  const connect = useMutation({
    mutationFn: () => connectRepository(projectKey, {
      provider, baseUrl: baseUrl.trim() || undefined, repository: repository.trim(), token: token.trim() || undefined,
    }),
    onSuccess: onClose, onSettled: () => refreshCode(client),
  });
  return <FormDialog open onOpenChange={open => { if (!open) onClose(); }} title={`${host.label} 저장소 연결`} description={host.hint} submitLabel="연결하기"
    isPending={connect.isPending} isSubmitDisabled={!repository.trim() || (provider === 'gitea' && !baseUrl.trim())} onSubmit={() => connect.mutate()}>
    <TextField label="주소" value={baseUrl} onChange={setBaseUrl} isRequired={provider === 'gitea'}
      placeholder={host.defaultUrl ?? 'https://git.example.com'} />
    <TextField label="저장소" value={repository} onChange={setRepository} isRequired autoFocus
      placeholder={provider === 'gitlab' ? 'group/project' : 'owner/repository'} />
    <TextField label="토큰" type="password" placeholder="비워 두어도 됩니다" value={token} onChange={setToken} isOptional
      description="비우면 연결한 뒤 웹훅을 저장소에 직접 등록합니다." />
    {connect.error ? <p role="alert" className="text-sm text-destructive">{connect.error.message}</p> : null}
  </FormDialog>;
}

/** A new token for a connection, checked with the host before it is kept. */
function TokenDialog({ projectKey, integration, onClose }: { projectKey: string; integration: CodeIntegration; onClose: () => void }) {
  const client = useQueryClient();
  const [token, setToken] = useState('');
  const save = useMutation({
    mutationFn: () => reviseIntegration(projectKey, integration, token.trim()),
    onSuccess: onClose, onSettled: () => refreshCode(client),
  });
  return <FormDialog open onOpenChange={open => { if (!open) onClose(); }} title={integration.hasToken ? '토큰 바꾸기' : '토큰 넣기'}
    description={integration.repository} submitLabel="저장" isPending={save.isPending} isSubmitDisabled={!token.trim()} onSubmit={() => save.mutate()}>
    <TextField label="토큰" type="password" placeholder="새 토큰 붙여 넣기" value={token} onChange={setToken} isRequired autoFocus />
    {save.error ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
  </FormDialog>;
}

/** 규칙 하나의 고르기: 보드 기본값 · 칸들 · 옮기지 않음. 데스크톱 팝오버, 휴대폰 바텀시트. 일곱 개를 넘으면 찾기 칸이 붙는다. */
function RulePicker({ label, value, options, isDisabled, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; isDisabled: boolean; onChange: (value: string) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  const current = options.find(option => option.value === value) ?? options[0];
  return <AdaptivePopover title={label} open={isOpen} onOpenChange={setOpen} align="end" className="w-60 p-1.5"
    trigger={<Button variant="outline" disabled={isDisabled} aria-label={`${label}: ${current?.label ?? ''}`}
      className="w-full justify-between @md/field-group:w-52 max-md:h-11">
      <span className="truncate">{current?.label}</span>
      <ChevronDownIcon data-icon="inline-end" className="text-icon-muted" />
    </Button>}>
    <OptionList label={`${label} 고르기`} options={options} chosen={[value]} isSearchable={options.length > 7}
      onPick={next => { onChange(next); setOpen(false); }} />
  </AdaptivePopover>;
}

/**
 * 자동 이동 규칙: for each event, the status it moves the work items it names to: the board's own choice (the first
 * status under way, the last under way, the first done), another status, or none. 휴대폰은 이름 아래로 고르기를 내린다(SettingsRow wide).
 */
function Rules({ projectKey }: { projectKey: string }) {
  const client = useQueryClient();
  const rules = useQuery(integrationRulesOptions(projectKey));
  const columns = useQuery(columnsOptions(projectKey));
  const change = useMutation({
    mutationFn: (rule: { event: CodeRule['event']; set: boolean; columnId?: string | null }) =>
      setIntegrationRule(projectKey, rule as Parameters<typeof setIntegrationRule>[1]),
    onSettled: () => refreshCode(client),
  });
  if (!rules.data || !columns.data) return null;
  const nameOf = (id?: string | null) => columns.data.find((column: BoardColumn) => column.id === id)?.name;
  return <SettingsSection title="자동 이동 규칙" note={change.error?.message}>
    {RULE_EVENTS.map(event => {
      const rule = rules.data.find(each => each.event === event.value);
      const value = !rule?.set ? 'default' : rule.columnId ?? 'stay';
      const options = [
        { value: 'default', label: `보드 기본값${nameOf(rule?.defaultColumnId) ? ` (${nameOf(rule?.defaultColumnId)})` : ' (옮기지 않음)'}` },
        ...columns.data.map((column: BoardColumn) => ({ value: column.id, label: column.name })),
        { value: 'stay', label: '옮기지 않음' },
      ];
      return <SettingsRow key={event.value} wide label={event.label} description={event.hint}>
        <RulePicker label={event.label} value={value} options={options} isDisabled={change.isPending}
          onChange={next => change.mutate(next === 'default' ? { event: event.value, set: false }
            : { event: event.value, set: true, columnId: next === 'stay' ? null : next })} />
      </SettingsRow>;
    })}
  </SettingsSection>;
}
