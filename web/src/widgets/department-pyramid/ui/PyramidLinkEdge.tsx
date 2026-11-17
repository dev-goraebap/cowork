import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react';
import type { DepartmentLink } from '../model/pyramid-layout';

export type PyramidLinkFlowEdge = Edge<{ link: DepartmentLink; levelGap: number }, 'link'>;

/**
 * A line in right angles, as on a paper chart: down from a department to a bar halfway to the next level, along it and
 * down into the department below, so the departments of one parent hang from one bar.
 */
export function PyramidLinkEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<PyramidLinkFlowEdge>) {
  // Measured up from the level below, since the boxes of one level differ in height and share only their top.
  const bar = targetY - (data?.levelGap ?? 0) / 2;
  return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} V ${bar} H ${targetX} V ${targetY}`} />;
}
