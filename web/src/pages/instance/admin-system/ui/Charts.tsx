import type { ReactNode } from 'react';
import { cn } from 'cn';

/**
 * A series' colour. The theme has no data palette of its own, so a series borrows the work item marks' hues (blue, orange,
 * red, green, yellow), which keep their contrast in the light and dark themes alike.
 */
export type Tone = 'blue' | 'orange' | 'red' | 'green' | 'yellow';
export type Series = { key: string; label: string; tone: Tone; values: (number | null)[] };

/** Fills (bars, swatches) and strokes (lines) in a tone. */
const FILL: Record<Tone, string> = {
  blue: 'fill-mark-low', orange: 'fill-mark-high', red: 'fill-mark-urgent', green: 'fill-mark-done', yellow: 'fill-mark-medium',
};
const STROKE: Record<Tone, string> = {
  blue: 'stroke-mark-low', orange: 'stroke-mark-high', red: 'stroke-mark-urgent', green: 'stroke-mark-done', yellow: 'stroke-mark-medium',
};

/** A raised surface: the tiles, the charts and the kinds of notice are each one (DESIGN.md 면 단계). */
export const SURFACE = 'min-w-0 rounded-xl border bg-card p-4';

/** The highest value the axis shows: the largest value rounded up to a readable step (1, 2 or 5 times a power of ten). */
function axisTop(largest: number): number {
  if (largest <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(largest));
  const step = [1, 2, 5, 10].find(factor => factor * power >= largest) ?? 10;
  return step * power;
}

/** Which bucket labels to show so they do not crowd: all of a week, every third hour of a day, every fifth of a month. */
const labelEvery = (count: number) => (count <= 8 ? 1 : count <= 24 ? 3 : 5);
/** A plot's height in its own units: values are drawn as shares of it. */
const FULL = 100;
/** The plot itself, 10rem high, with a rule at its half and its foot. */
const CANVAS = 'block h-40 w-full overflow-visible border-b bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:100%_50%]';
/** The pointed-at bucket lights up behind its bars. */
const BUCKET = 'group/bucket';
const HIT = 'fill-transparent group-hover/bucket:fill-foreground/6';
const TICK = 'text-xs leading-none text-muted-foreground tabular-nums';

/** A chart's frame, a raised surface: its title and total on one line, the legend under it (two series or more), the chart. */
export function ChartCard({ title, total, series, children }: {
  title: string; total?: string; series: Pick<Series, 'key' | 'label' | 'tone'>[]; children: ReactNode;
}) {
  return <section className={cn(SURFACE, 'flex flex-col gap-2')} aria-label={title}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold">{title}</h3>
      {total ? <span className="text-xs text-muted-foreground tabular-nums">{total}</span> : null}
    </div>
    {series.length > 1 ? <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
      {series.map(item => <li key={item.key} className="flex items-center gap-1">
        <svg className="size-2.5 shrink-0" viewBox="0 0 10 10" aria-hidden="true"><rect className={FILL[item.tone]} width="10" height="10" rx="2" /></svg>
        <span className="text-xs text-muted-foreground">{item.label}</span>
      </li>)}
    </ul> : null}
    {children}
  </section>;
}

/** The value axis (zero, half, the top) beside the plot, and the bucket labels under it, every so many from the latest. */
function Plot({ labels, top, format, children }: { labels: string[]; top: number; format: (value: number) => string; children: ReactNode }) {
  const every = labelEvery(labels.length);
  return <div className="flex min-w-0 gap-2">
    <div className="flex h-40 flex-col items-end justify-between" aria-hidden>
      <span className={TICK}>{format(top)}</span><span className={TICK}>{format(top / 2)}</span><span className={TICK}>{format(0)}</span>
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {children}
      <div className="flex min-w-0" aria-hidden>
        {labels.map((label, index) => <span key={index} className="min-w-0 flex-1 text-center text-xs leading-tight whitespace-nowrap text-muted-foreground">
          {(labels.length - 1 - index) % every === 0 ? label : ''}
        </span>)}
      </div>
    </div>
  </div>;
}

/**
 * Bars per bucket, the series stacked from the bottom in their order; a bucket names its bucket and values when pointed
 * at (and to assistive technology).
 */
export function StackedBars({ labels, series, unit, format = value => `${value.toLocaleString('ko-KR')}${unit}` }: {
  labels: string[]; series: Series[]; unit: string; format?: (value: number) => string;
}) {
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
  const top = axisTop(Math.max(0, ...totals));
  return <Plot labels={labels} top={top} format={format}>
    <svg className={CANVAS} viewBox={`0 0 ${Math.max(1, labels.length)} ${FULL}`} preserveAspectRatio="none" role="img"
      aria-label={series.map(item => item.label).join(' · ')}>
      {labels.map((label, index) => {
        const detail = [label, ...series.map(item => `${item.label} ${format(item.values[index] ?? 0)}`)].join(' · ');
        let base = FULL;
        return <g key={index} className={BUCKET}>
          <title>{detail}</title>
          <rect className={HIT} x={index} y={0} width={1} height={FULL} />
          {series.map(item => {
            const value = item.values[index] ?? 0;
            if (value <= 0) return null;
            const height = Math.max(0.6, (value / top) * FULL);
            base -= height;
            return <rect key={item.key} className={FILL[item.tone]} x={index + 0.12} y={base} width={0.76} height={height} />;
          })}
        </g>;
      })}
    </svg>
  </Plot>;
}

/** Lines over the buckets, a gap where a bucket has no value (no requests that hour); a bucket names its values when pointed at. */
export function Lines({ labels, series, format }: { labels: string[]; series: Series[]; format: (value: number) => string }) {
  const values = series.flatMap(item => item.values.filter((value): value is number => value != null));
  const top = axisTop(Math.max(0, ...values));
  const y = (value: number) => FULL - (value / top) * FULL;
  return <Plot labels={labels} top={top} format={format}>
    <svg className={CANVAS} viewBox={`0 0 ${Math.max(1, labels.length)} ${FULL}`} preserveAspectRatio="none" role="img"
      aria-label={series.map(item => item.label).join(' · ')}>
      {labels.map((label, index) => <g key={index} className={BUCKET}>
        <title>{[label, ...series.map(item => `${item.label} ${item.values[index] == null ? '-' : format(item.values[index] as number)}`)].join(' · ')}</title>
        <rect className={HIT} x={index} y={0} width={1} height={FULL} />
      </g>)}
      {series.map(item => {
        const runs: string[][] = [[]];
        item.values.forEach((value, index) => {
          if (value == null) runs.push([]);
          else runs[runs.length - 1].push(`${index + 0.5},${y(value)}`);
        });
        return runs.filter(run => run.length > 0).map((run, part) => <polyline key={`${item.key}-${part}`}
          className={cn('fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]', STROKE[item.tone])}
          points={run.length === 1 ? `${run[0]} ${run[0]}` : run.join(' ')} vectorEffect="non-scaling-stroke" />);
      })}
    </svg>
  </Plot>;
}
