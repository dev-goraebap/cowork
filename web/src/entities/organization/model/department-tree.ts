type TreeItem = { id: string; name: string; parentId?: string | null; displayOrder: number };

/** A department with the departments directly below it, each in turn with theirs. */
export type DepartmentNode<T extends TreeItem> = { item: T; children: DepartmentNode<T>[] };
/** A department in tree order: how deep it sits, the names from the top down to it, and the people in it and below it. */
export type DepartmentRow<T extends TreeItem> = { item: T; level: number; path: string[]; count: number };

const byDisplayOrder = (left: TreeItem, right: TreeItem) =>
  left.displayOrder - right.displayOrder || left.name.localeCompare(right.name, 'ko');

/**
 * The departments as a tree of any depth, siblings in display order. A department whose parent is missing (deleted,
 * say) starts a branch of its own at the top.
 */
export function buildTree<T extends TreeItem>(items: readonly T[]): DepartmentNode<T>[] {
  const ids = new Set(items.map(item => item.id));
  const below = new Map<string | null, T[]>();
  for (const item of items) {
    const parent = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    below.set(parent, [...(below.get(parent) ?? []), item]);
  }
  const grow = (parentId: string | null, seen: Set<string>): DepartmentNode<T>[] =>
    [...(below.get(parentId) ?? [])].sort(byDisplayOrder)
      // A loop in bad data would never end, so a department already on the way down is not visited again.
      .filter(item => !seen.has(item.id))
      .map(item => ({ item, children: grow(item.id, new Set([...seen, item.id])) }));
  return grow(null, new Set());
}

/**
 * The tree flattened depth first, each department with its level, path and how many people (given their department
 * ids) work in it and below it, as lists and pickers show it.
 */
export function treeRows<T extends TreeItem>(items: readonly T[], people: readonly { departmentId?: string }[] = []): DepartmentRow<T>[] {
  const direct = new Map<string, number>();
  for (const person of people) if (person.departmentId) direct.set(person.departmentId, (direct.get(person.departmentId) ?? 0) + 1);
  const rows: DepartmentRow<T>[] = [];
  const visit = (node: DepartmentNode<T>, level: number, path: string[]): number => {
    const here = [...path, node.item.name];
    const row: DepartmentRow<T> = { item: node.item, level, path: here, count: 0 };
    rows.push(row);
    row.count = (direct.get(node.item.id) ?? 0) + node.children.reduce((sum, child) => sum + visit(child, level + 1, here), 0);
    return row.count;
  };
  for (const root of buildTree(items)) visit(root, 0, []);
  return rows;
}

