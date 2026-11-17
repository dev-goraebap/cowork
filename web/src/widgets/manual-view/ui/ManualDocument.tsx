import { monthDay } from '@/entities/event';
import { PersonAvatar } from '@/shared/ui/person-avatar';
import type { Manual } from '../model/types';
import { ManualBlockView } from './ManualBlockView';

/** A guide's body at a reading measure (45rem): its title, summary and who changed it when, then its sections in order. */
export function ManualDocument({ manual }: { manual: Manual }) {
  return <article className="mx-auto box-content flex max-w-180 flex-col gap-8 px-6 pt-10 pb-12 max-md:gap-6 max-md:px-4 max-md:pt-6 max-md:pb-10">
    <header className="flex flex-col gap-2 border-b pb-6">
      <h1 className="text-2xl font-bold">{manual.title}</h1>
      {manual.summary ? <p className="text-base text-muted-foreground">{manual.summary}</p> : null}
      <div className="flex items-center gap-2">
        <PersonAvatar name={manual.author} picture={manual.authorPicture} />
        <p className="text-xs text-muted-foreground">
          {manual.author} · <time dateTime={manual.updated}>{monthDay(manual.updated)}</time> 수정
        </p>
      </div>
    </header>
    {manual.sections.map(section => <section key={section.id} className="flex min-w-0 flex-col gap-3" aria-labelledby={section.id}>
      <h2 id={section.id} className="scroll-mt-6 text-2xl font-semibold">{section.title}</h2>
      {section.blocks.map((block, index) => <ManualBlockView key={index} block={block} />)}
    </section>)}
  </article>;
}
