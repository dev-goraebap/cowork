/** A work item's reference (COWORK-12) read as its project's key and its number; nothing when it is no reference. */
export function parseWorkItemRef(ref: string): { key: string; number: number } | undefined {
  const match = /^([A-Za-z0-9]{2,10})-(\d+)$/.exec(ref);
  return match ? { key: match[1]!.toUpperCase(), number: Number(match[2]) } : undefined;
}

/** Where a work item opens, as client/ addresses it: under its project (/projects/cowork/work-items/12). */
export const workItemHref = (workItem: { projectKey: string; number: number }) => `/workspace/projects/${workItem.projectKey}/work-items/${workItem.number}`;

/** Where a work item opens from 업무, the workspace's work items, so the menu stays there: /work-items/COWORK-12. */
export const workspaceWorkItemHref = (workItem: { ref: string }) => `/my-work/${workItem.ref}`;
