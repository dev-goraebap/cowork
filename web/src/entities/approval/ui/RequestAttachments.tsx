import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ImageIcon, PaperclipIcon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { attachmentLink, type RequestAttachment } from '../api/approval';

/**
 * A request's evidence, one button a file: pressing it asks the server for a short-lived address (links last five
 * minutes) and opens the file in a new tab.
 */
export function RequestAttachments({ requestId, attachments }: { requestId: string; attachments: RequestAttachment[] }) {
  const [opening, setOpening] = useState<string>();
  const open = async (file: RequestAttachment) => {
    setOpening(file.id);
    // The tab opens inside the press, so a popup blocker lets it through; its address follows.
    const tab = window.open('', '_blank');
    try {
      const url = await attachmentLink(requestId, file.id);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
    } finally {
      setOpening(undefined);
    }
  };
  return <div className="flex flex-wrap gap-1">
    {attachments.map(file => {
      const FileIcon = file.contentType.startsWith('image/') ? ImageIcon : PaperclipIcon;
      return <Button key={file.id} variant="ghost" size="sm" disabled={opening === file.id} onClick={() => void open(file)}>
        {opening === file.id ? <Spinner data-icon="inline-start" /> : <FileIcon data-icon="inline-start" />}
        {file.filename}
      </Button>;
    })}
  </div>;
}
