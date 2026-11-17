import { cn } from 'cn';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { CircleCheckIcon, ImageIcon, InfoIcon, TriangleAlertIcon } from '@/shared/ui/icon';
import { inline } from '../lib/inline';
import type { ManualBlock } from '../model/types';

const CALLOUT = { info: InfoIcon, warning: TriangleAlertIcon, success: CircleCheckIcon } as const;

/**
 * One block of a guide: a paragraph (inline Markdown, so `코드` and **굵게** read), a third-level heading, numbered steps,
 * a callout (the kit's Alert, always open), a picture's place (a 16:9 frame with the picture icon until there is one) or
 * a code sample (the column's width).
 */
export function ManualBlockView({ block }: { block: ManualBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="leading-[1.7] wrap-anywhere">{inline(block.text)}</p>;
    case 'heading':
      // A heading reached from the table of contents lands with room above it.
      return <h3 id={block.id} className="mt-2 scroll-mt-6 text-base font-semibold">{block.text}</h3>;
    case 'steps':
      // Numbered steps: each its number in a small round mark, the text beside it.
      return <ol className="flex flex-col gap-2">
        {block.items.map((item, index) => <li key={index} className="relative min-h-6 pl-9 leading-[1.6]">
          <span aria-hidden className="absolute top-0 left-0 grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">{index + 1}</span>
          {inline(item)}
        </li>)}
      </ol>;
    case 'callout': {
      const Icon = CALLOUT[block.tone];
      return <Alert>
        <Icon className={cn(block.tone === 'warning' && 'text-mark-high', block.tone === 'success' && 'text-mark-done')} />
        <AlertTitle className="whitespace-normal">{block.title}</AlertTitle>
        {block.text ? <AlertDescription>{inline(block.text)}</AlertDescription> : null}
      </Alert>;
    }
    case 'image':
      // A picture's place: a muted frame on a hairline until the picture is there.
      return <figure className="flex flex-col gap-2">
        {/* check-ui: allow-style 그림 자리의 비율은 안내서 데이터(ratio)다. */}
        <div style={{ aspectRatio: block.ratio ?? 16 / 9 }} className="grid place-items-center rounded-xl border bg-muted">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="size-6 text-icon-muted" />
            <span className="text-xs text-muted-foreground">그림을 넣을 자리</span>
          </div>
        </div>
        <figcaption className="text-center text-xs text-muted-foreground">{block.caption}</figcaption>
      </figure>;
    case 'code':
      return <figure className="flex flex-col overflow-hidden rounded-lg border bg-muted">
        {block.title ? <figcaption className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">{block.title}</figcaption> : null}
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.8125rem] leading-relaxed" data-language={block.language ?? 'plaintext'}><code>{block.code}</code></pre>
      </figure>;
  }
}
