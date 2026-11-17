import { Badge } from '@/shared/ui/badge';
import type { OutcomeTone } from '../model/format';

/** An outcome's colour as the schedule's category fills, which read in the light and dark themes alike. */
const TONE: Record<OutcomeTone['color'], string> = {
  green: 'bg-event-green text-event-green-foreground',
  orange: 'bg-event-orange text-event-orange-foreground',
  red: 'bg-event-red text-event-red-foreground',
  gray: 'bg-event-gray text-event-gray-foreground',
};

/** How a request or change ended, as a small coloured badge. */
export function ToneBadge({ label, color }: OutcomeTone) {
  return <Badge className={TONE[color]}>{label}</Badge>;
}
