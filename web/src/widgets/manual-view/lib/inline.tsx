import type { ReactNode } from 'react';

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

/**
 * 안내서 글의 인라인 Markdown: `코드`, **굵게**, [링크](주소)만 그린다. 글 속 코드는 바탕 없이 옅은 밑줄과 고정폭 글자(읽기 본문과 같다).
 */
export function inline(text: string): ReactNode[] {
  return text.split(TOKEN).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={index} className="font-mono text-[0.9em] text-foreground/80 underline decoration-foreground/40 decoration-1 underline-offset-[0.32em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]} className="text-primary underline underline-offset-4">{link[1]}</a>;
    return part;
  });
}
