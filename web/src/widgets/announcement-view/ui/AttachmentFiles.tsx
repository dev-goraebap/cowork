import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { AnnouncementFile } from '@/entities/announcement';
import { Button } from '@/shared/ui/button';
import { fileSizeText } from '@/shared/ui/compose';
import { DownloadIcon, FileIcon, ImageIcon, PdfIcon } from '@/shared/ui/icon';
import type { FileLink } from '@/shared/ui/rich-body/markdown-draft';

const iconOf = (file: AnnouncementFile) => (file.image ? ImageIcon : /\.pdf$/i.test(file.filename) ? PdfIcon : FileIcon);

/**
 * A notice's files under its body (첨부 N개): each its kind, name and size, saved from the button at its end through the
 * download address linkOf gives.
 */
export function AttachmentFiles({ files, linkOf }: { files: readonly AnnouncementFile[]; linkOf: FileLink }) {
  const client = useQueryClient();
  const titleId = useId();
  const [failure, setFailure] = useState('');
  const save = async (file: AnnouncementFile) => {
    setFailure('');
    try { window.location.assign((await client.fetchQuery(linkOf(file.id, true))).url); }
    catch { setFailure(`${file.filename}을(를) 내려받지 못했습니다. 다시 시도해 주세요.`); }
  };
  return <section aria-labelledby={titleId} className="flex flex-col gap-3 border-t pt-5">
    <h2 id={titleId} className="text-base font-semibold">첨부 {files.length}개</h2>
    <ul aria-label="공지 첨부" className="flex flex-col rounded-xl border bg-card">
      {files.map(file => {
        const Mark = iconOf(file);
        return <li key={file.id} className="flex min-h-12 items-center gap-3 border-b px-3 py-2 last:border-b-0">
          <Mark className="shrink-0 text-icon-muted" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{file.filename}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{fileSizeText(file.size)}</span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label={`${file.filename} 내려받기`} title="내려받기" className="max-md:size-11"
            onClick={() => void save(file)}>
            <DownloadIcon />
          </Button>
        </li>;
      })}
    </ul>
    {failure ? <p role="alert" className="text-sm text-destructive">{failure}</p> : null}
  </section>;
}
