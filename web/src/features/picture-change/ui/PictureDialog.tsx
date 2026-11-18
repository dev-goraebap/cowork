import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { avatarKeys, derivedAvatar, DRAWN_AVATARS, drawnAvatarSource, useMemberPicture } from '@/shared/lib/avatar';
import { Button } from '@/shared/ui/kit/button';
import { FileDropzone } from '@/shared/ui/kit/compose';
import { FormDialog } from '@/shared/ui/kit/form-dialog';
import { CheckIcon, UploadIcon } from '@/shared/ui/kit/icon';
import { PersonAvatar } from '@/shared/ui/kit/person-avatar';
import { Spinner } from '@/shared/ui/kit/spinner';
import { cropPicture, type CropArea } from '../model/crop-picture';
import { openPhoto, PHOTO_ACCEPT, PHOTO_MAX_BYTES } from '../model/photo';
import { savePreset, uploadPicture } from '../api/picture';

// The cropper (react-easy-crop) is only needed once a photo is chosen.
const PictureCropper = lazy(() => import('./PictureCropper').then(module => ({ default: module.PictureCropper })));

const NUMBERS = Array.from({ length: DRAWN_AVATARS }, (_, number) => number);
const CROP_HEIGHT = 'h-[min(70vw,18rem)]';

/**
 * 프로필 이미지: a photo cropped to the circle, or one of the drawn pictures; whichever was chosen last is saved.
 * 기본값으로 drops the choice at once and returns to the drawn picture the id picks.
 */
export function PictureDialog({ employeeId, name, onClose }: { employeeId: string; name: string; onClose: () => void }) {
  const client = useQueryClient();
  const source = useMemberPicture(employeeId);
  const fallback = derivedAvatar(employeeId);
  const [preset, setPreset] = useState<number>();
  /** The chosen original's object URL, which the cropper reads; let go when another is chosen or the dialog closes. */
  const [photo, setPhoto] = useState<string>();
  const [area, setArea] = useState<CropArea>();
  const [problem, setProblem] = useState<string>();
  // A photo still opening when another is chosen must not land over it.
  const selection = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const presetsId = useId();
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const save = useMutation({
    mutationFn: async (isReset: boolean) => {
      if (isReset) return savePreset();
      if (photo && area) return uploadPicture(await cropPicture(photo, area));
      if (preset != null) return savePreset(preset);
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: avatarKeys }); onClose(); },
  });

  const choose = async (file?: File) => {
    if (!file) return;
    const version = ++selection.current;
    try {
      const url = await openPhoto(file);
      if (version !== selection.current) { URL.revokeObjectURL(url); return; }
      setProblem(undefined); save.reset(); setPreset(undefined); setArea(undefined); setPhoto(url);
    } catch (error) {
      if (version === selection.current) setProblem(error instanceof Error ? error.message : String(error));
    }
  };
  const pick = (number: number) => {
    selection.current++;
    setProblem(undefined); save.reset(); setPhoto(undefined); setArea(undefined); setPreset(number);
  };

  const shown = preset == null ? source : drawnAvatarSource(preset);
  const alert = problem ?? save.error?.message;
  return <FormDialog open onOpenChange={isOpen => { if (!isOpen) onClose(); }} title="프로필 이미지"
    isPending={save.isPending} isSubmitDisabled={photo ? !area : preset == null} onSubmit={() => save.mutate(false)}>
    {photo ? <div className="flex flex-col gap-2">
      <Suspense fallback={<div className={cn('flex items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground', CROP_HEIGHT)}>
        <Spinner />사진 편집기를 불러오는 중
      </div>}>
        {/* A new photo starts its place and zoom afresh. */}
        <PictureCropper key={photo} source={photo} isBusy={save.isPending} onArea={setArea} />
      </Suspense>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={save.isPending} onClick={() => input.current?.click()} className="shrink-0 max-md:h-9">
          <UploadIcon data-icon="inline-start" />다른 사진 고르기
        </Button>
      </div>
      <input ref={input} type="file" hidden aria-hidden tabIndex={-1} accept={PHOTO_ACCEPT}
        onChange={event => { void choose(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    </div> : <div className="flex items-center gap-4">
      <PersonAvatar name={name} picture={shown} className="size-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <FileDropzone label="사진 고르기" hint="JPEG, PNG, WebP, GIF · 최대 20MB" accept={PHOTO_ACCEPT} maxBytes={PHOTO_MAX_BYTES}
          isDisabled={save.isPending} onPick={files => void choose(files[0])} />
      </div>
    </div>}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={presetsId} className="text-sm font-medium">기본 이미지</span>
        {/* FormDialog's footer holds only 취소 and 저장, so 기본값으로 sits over the pictures. */}
        <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={() => save.mutate(true)} className="max-md:h-9">
          기본값으로
        </Button>
      </div>
      <div role="radiogroup" aria-labelledby={presetsId} className="grid grid-cols-6 gap-2 max-md:gap-3">
        {NUMBERS.map(number => {
          const isChosen = !photo && number === preset;
          return <button key={number} type="button" role="radio" aria-checked={isChosen}
            aria-label={`기본 이미지 ${number + 1}${number === fallback ? ' (기본)' : ''}`} disabled={save.isPending} onClick={() => pick(number)}
            className={cn('relative aspect-square rounded-full ring-offset-2 ring-offset-popover outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
              isChosen && 'ring-2 ring-foreground focus-visible:ring-foreground')}>
            <img src={drawnAvatarSource(number)} alt="" className="size-full rounded-full" />
            {isChosen ? <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
              <CheckIcon className="size-3.5" />
            </span> : null}
          </button>;
        })}
      </div>
    </div>
    {alert ? <p role="alert" className="text-sm text-destructive">{alert}</p> : null}
  </FormDialog>;
}
