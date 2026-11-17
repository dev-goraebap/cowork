/** The Token colours a label can read in. */
export type LabelColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan' | 'blue' | 'purple' | 'pink' | 'gray';

// The theme's categorical colours by the hue they sit at, to read a label's own colour (as the server keeps it) in the theme.
const HUES: readonly [hue: number, color: LabelColor][] = [
  [0, 'red'], [28, 'orange'], [50, 'yellow'], [130, 'green'], [170, 'teal'], [190, 'cyan'], [220, 'blue'], [275, 'purple'], [330, 'pink'], [360, 'red'],
];

/**
 * A label's colour (a hex the project keeps, #rrggbb) as the nearest of the theme's Token colours, so labels follow the
 * theme in light and dark; a grey one reads gray, one that does not read as a colour the default.
 */
export function labelColor(color?: string): LabelColor {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '');
  if (!match) return 'default';
  const [r, g, b] = match.slice(1).map(part => parseInt(part, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.12) return 'gray';
  const delta = max - min;
  const hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  const turned = (hue + 360) % 360;
  return HUES.reduce((best, each) => (Math.abs(each[0] - turned) < Math.abs(best[0] - turned) ? each : best))[1];
}
