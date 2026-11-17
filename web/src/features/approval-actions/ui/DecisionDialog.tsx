import { Fragment, useState } from 'react';
import type { ApprovalRequest } from '@/entities/approval';
import { Field, FieldLabel } from '@/shared/ui/field';
import { FormDialog } from '@/shared/ui/form-dialog';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Textarea } from '@/shared/ui/textarea';
import { useDecide, type Verdict } from '../api/actions';
import { decisionFacts, requestKindName, requestSummary } from '../model/summary';

const VERDICTS: { value: Verdict; label: string }[] = [{ value: 'APPROVE', label: '승인' }, { value: 'REJECT', label: '반려' }];

/**
 * Approving or rejecting a request, one dialog for both answers: what is asked laid out, then 승인 (with who it goes to
 * next) or 반려 (with the reason the requester will read, required). Opened at the answer pressed (verdict); decided,
 * it closes and onDecided hears the answer.
 */
export function DecisionDialog({ request, verdict: initial, onClose, onDecided }: {
  request: ApprovalRequest | null; verdict: Verdict; onClose: () => void; onDecided?: (verdict: Verdict) => void;
}) {
  return request ? <DecisionForm key={`${request.id}-${initial}`} request={request} initial={initial} onClose={onClose} onDecided={onDecided} /> : null;
}

function DecisionForm({ request, initial, onClose, onDecided }: {
  request: ApprovalRequest; initial: Verdict; onClose: () => void; onDecided?: (verdict: Verdict) => void;
}) {
  const [verdict, setVerdict] = useState<Verdict>(initial);
  const [reason, setReason] = useState('');
  const decide = useDecide(made => { onDecided?.(made); onClose(); });
  const isReject = verdict === 'REJECT';
  const ready = (!isReject || !!reason.trim()) && !!request.decidable;
  const next = request.approvers[request.currentStep ?? 0];
  const name = request.requester?.name ?? '신청자';
  const submit = () => { if (ready && !decide.isPending) decide.mutate({ id: request.id, verdict, reason: isReject ? reason.trim() : undefined }); };
  return <FormDialog open onOpenChange={open => { if (!open) onClose(); }} title={`${name} 님의 ${requestKindName(request)} 신청`}
    description={requestSummary(request)} submitLabel={isReject ? '반려' : '승인'} isDestructive={isReject} isPending={decide.isPending}
    isSubmitDisabled={!ready} onSubmit={submit}>
    <SegmentedControl label="결정" options={VERDICTS} value={verdict} onChange={setVerdict} className="w-full" />
    <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      {decisionFacts(request).map(fact => <Fragment key={fact.label}>
        <dt className="text-muted-foreground">{fact.label}</dt>
        <dd className="m-0">{fact.value}</dd>
      </Fragment>)}
    </dl>
    {isReject
      ? <Field>
        <FieldLabel htmlFor="decision-reason">반려 사유</FieldLabel>
        <Textarea id="decision-reason" placeholder="반려 이유" value={reason} onChange={event => setReason(event.target.value)}
          maxLength={1000} rows={4} required disabled={decide.isPending} autoFocus />
      </Field>
      : <p className="text-sm text-muted-foreground">
        {next ? `승인하면 다음 결재자 ${next.name ?? ''} 님에게 넘어갑니다.` : '마지막 결재입니다. 승인하면 신청이 최종 승인됩니다.'}
      </p>}
    {!request.decidable ? <p role="alert" className="text-sm">이미 결정했거나 지금은 결정할 차례가 아닙니다.</p> : null}
    {decide.error ? <p role="alert" className="text-sm text-destructive">{decide.error.message}</p> : null}
  </FormDialog>;
}
