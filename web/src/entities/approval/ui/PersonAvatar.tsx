import type { ComponentProps } from 'react';
import { PersonAvatar as MemberAvatar } from '@/shared/ui/person';

/** A member's avatar by their id (shared/ui/person): pressing it opens their profile, unless isStatic (a picker's option). */
export function PersonAvatar({ id, name, size = 24, tooltip = false, isStatic = false }: {
  id?: string; name?: string; size?: ComponentProps<typeof MemberAvatar>['size']; tooltip?: boolean; isStatic?: boolean;
}) {
  return <MemberAvatar id={id} name={name} size={size} tooltip={tooltip} isStatic={isStatic} />;
}
