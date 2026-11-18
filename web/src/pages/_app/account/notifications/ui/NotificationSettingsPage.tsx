import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  claimThisDevice, deviceName, pushDevicesOptions, pushKeys, pushPreferencesOptions, removeDevice, savePreferences, sendTestPush, stateTexts,
  thisDeviceId, useThisDevice, type PushDevice, type PushTopic,
} from '@/features/push-device';
import { Badge } from '@/shared/ui/kit/badge';
import { Button } from '@/shared/ui/kit/button';
import { ConfirmDialog } from '@/shared/ui/kit/confirm-dialog';
import { BellIcon, MonitorIcon, SentIcon, Trash2Icon } from '@/shared/ui/kit/icon';
import { SettingsPage, SettingsRow, SettingsSection } from '@/shared/ui/kit/settings';
import { Spinner } from '@/shared/ui/kit/spinner';
import { Switch } from '@/shared/ui/kit/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/kit/tooltip';
import { pageCrumbs } from '@/shared/ui/nav-icon';
import { momentText, pushStatusLabels, topicLabels } from '../model/push-labels';

type Crumb = { label: string; href?: string; icon?: string };

/** A row with its icon at the start: the name and lines in the middle, its control at the end. */
function IconRow({ icon, label, description, children }: { icon: ReactNode; label: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 p-3 [&>svg]:shrink-0 [&>svg]:text-icon-muted">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {description ? <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-1">{children}</div> : null}
    </div>
  );
}

/**
 * This browser's push: its name and state with one switch to turn it on or off and what to do when it cannot be on,
 * then a test push once it is. The test's outcome shows on the device list as soon as it is known.
 */
function ThisDevice() {
  const client = useQueryClient();
  const { state, turnOn, turnOff, deviceId } = useThisDevice();
  const [tested, setTested] = useState(false);
  const test = useMutation({
    // This browser may still be listed under the account that turned it on; it becomes this member's first.
    mutationFn: async () => sendTestPush(await claimThisDevice(client).catch(() => null) ?? deviceId ?? undefined),
    onSuccess: async () => { setTested(true); await client.invalidateQueries({ queryKey: pushKeys.all }); },
  });
  const text = stateTexts[state];
  const isOn = state === 'on';
  const canSwitch = state === 'on' || state === 'off';
  const isBusy = turnOn.isPending || turnOff.isPending;
  const error = turnOn.error ?? turnOff.error ?? test.error;
  return (
    <SettingsSection title="이 기기" note={error?.message}>
      <IconRow icon={<BellIcon />} label="이 기기에서 알림 받기" description={<>
        <span>{deviceName()} · {text.summary}</span>
        {text.help ? <span>{text.help}</span> : null}
      </>}>
        {isBusy ? <Spinner aria-label="바꾸는 중" /> : null}
        <Switch aria-label="이 기기에서 알림 받기" checked={isOn} disabled={!canSwitch || isBusy}
          onCheckedChange={next => { setTested(false); if (next) turnOn.mutate(); else turnOff.mutate(); }} />
      </IconRow>
      {isOn ? (
        <IconRow icon={<SentIcon />} label="테스트 알림" description={tested ? '보냈습니다.' : undefined}>
          <Button variant="secondary" size="sm" disabled={test.isPending} onClick={() => test.mutate()}>
            {test.isPending ? <Spinner data-icon="inline-start" /> : null}보내기
          </Button>
        </IconRow>
      ) : null}
    </SettingsSection>
  );
}

/**
 * Which groups of notices come as a push, one switch each, saved as it is flipped. They apply to every device of the
 * member's; notices turned off here still arrive in 받은 알림.
 */
function Topics() {
  const client = useQueryClient();
  const preferences = useQuery(pushPreferencesOptions());
  const save = useMutation({
    mutationFn: (muted: PushTopic[]) => savePreferences(muted),
    onMutate: muted => client.setQueryData(pushPreferencesOptions().queryKey, previous =>
      previous && { topics: previous.topics.map(item => ({ ...item, enabled: !muted.includes(item.topic) })) }),
    onSettled: () => client.invalidateQueries({ queryKey: [...pushKeys.all, 'preferences'] }),
  });
  const topics = preferences.data?.topics ?? [];
  const toggle = (topic: PushTopic, enabled: boolean) =>
    save.mutate(topics.filter(item => (item.topic === topic ? !enabled : !item.enabled)).map(item => item.topic));
  return (
    <SettingsSection title="받을 알림" note={save.error?.message}>
      {preferences.isError ? <SettingsRow label="받을 알림을 불러오지 못했습니다" description={preferences.error.message} hasValue={false} />
        : !preferences.data ? <SettingsRow label="불러오는 중…" hasValue={false} />
          : topics.map(item => (
            <SettingsRow key={item.topic} label={topicLabels[item.topic].label} description={topicLabels[item.topic].description}>
              <Switch aria-label={topicLabels[item.topic].label} checked={item.enabled} onCheckedChange={enabled => toggle(item.topic, enabled)} />
            </SettingsRow>
          ))}
    </SettingsSection>
  );
}

/** A device's line: when it was added, and how its last push went (a failure with its reason). */
function describe(device: PushDevice) {
  const last = device.lastPush;
  const pushed = last ? `마지막 알림 ${momentText(last.at)} ${pushStatusLabels[last.status] ?? last.status}` : '아직 받은 알림 없음';
  const failed = last && (last.status === 'FAILED' || last.status === 'GONE') && last.error ? ` · ${last.error}` : '';
  return `${momentText(device.createdAt)} 추가 · ${pushed}${failed}`;
}

/** The member's devices taking pushes, this one marked; one no longer used is removed after asking. */
function Devices() {
  const client = useQueryClient();
  const devices = useQuery(pushDevicesOptions());
  const [removing, setRemoving] = useState<PushDevice | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => removeDevice(id),
    onSuccess: () => setRemoving(null),
    onSettled: () => client.invalidateQueries({ queryKey: pushKeys.all }),
  });
  const mine = thisDeviceId();
  const list = devices.data ?? [];
  return <>
    <SettingsSection title={devices.data ? `알림 받는 기기 ${list.length}대` : '알림 받는 기기'}>
      {devices.isError ? <SettingsRow label="기기를 불러오지 못했습니다" description={devices.error.message} hasValue={false} />
        : !devices.data ? <SettingsRow label="불러오는 중…" hasValue={false} />
          : list.length === 0 ? <SettingsRow label="아직 알림을 받는 기기가 없습니다" hasValue={false} />
            : list.map(device => (
              <IconRow key={device.id} icon={<MonitorIcon />} label={device.deviceName ?? '이름 없는 기기'} description={describe(device)}>
                {device.id === mine ? <Badge variant="secondary">이 기기</Badge> : null}
                <Tooltip>
                  <TooltipTrigger render={
                    <Button variant="ghost" size="icon-sm" aria-label={`${device.deviceName ?? '기기'} 삭제`} className="max-md:size-11"
                      onClick={() => { remove.reset(); setRemoving(device); }}>
                      <Trash2Icon />
                    </Button>
                  } />
                  <TooltipContent>삭제</TooltipContent>
                </Tooltip>
              </IconRow>
            ))}
    </SettingsSection>
    <ConfirmDialog open={!!removing} onOpenChange={open => { if (!open) { setRemoving(null); remove.reset(); } }}
      title={`${removing?.deviceName ?? '이 기기'}를 삭제할까요?`}
      description={remove.error?.message ?? '이 기기에는 더 이상 푸시 알림이 가지 않습니다. 그 기기에서 다시 켜면 돌아옵니다.'}
      action={{ label: '삭제', isPending: remove.isPending, onAction: () => { if (removing) remove.mutate(removing.id); } }} />
  </>;
}

/**
 * 알림 설정: this browser's push (one switch, and a test once it is on), which groups of notices come as a push on every
 * device, and the devices taking them.
 */
export function NotificationSettingsPage({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <SettingsPage crumbs={pageCrumbs(crumbs)} title="알림 설정">
      <ThisDevice />
      <Topics />
      <Devices />
    </SettingsPage>
  );
}
