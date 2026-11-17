import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { buildTree, type DepartmentNode, type OrgDepartment, type OrgPerson } from '@/entities/organization';

/** One line of a box's roster: the lead first, then the department's own people in the org chart's order. */
export type RosterLine = { id: string; name: string; rank?: string; isLead: boolean };
/** Who a box lists, at most MAX_LINES of them, and how many more there are. */
export type Roster = { lines: RosterLine[]; more: number; hasLead: boolean };
export type DepartmentBox = { id: string; department: OrgDepartment; childCount: number; memberCount: number; roster: Roster; x: number; y: number; width: number; height: number };
/** From a department's bottom down to a bar halfway to the next level, along it and down into the one below. */
export type DepartmentLink = { id: string; source: string; target: string };
export type DepartmentLayout = { boxes: DepartmentBox[]; links: DepartmentLink[]; levelGap: number };

/**
 * The box's width, the height of its name and size, of each roster line and its foot, and the gaps between levels and
 * siblings, in rem: the node's styles use the same numbers, and the layout turns them into the canvas's pixels at the
 * root's size, so a large screen's bigger type still fits its boxes.
 */
const BOX = { width: 14.5, head: 3.625, line: 1.625, foot: 0.625 } as const;
const LEVEL_GAP = 4.5;
const SIBLING_GAP = 1.75;
export const MAX_LINES = 10;

const rankOf = (person: OrgPerson) => person.titleName ?? person.positionName;

/**
 * A department's roster: its lead, then its working people in the order the org chart gives them (title, position,
 * name), cut at MAX_LINES with the rest counted. A lead known by id alone, not among the working people, is as good as none.
 */
export function rosterOf(department: OrgDepartment, people: readonly OrgPerson[]): Roster {
  const lead = department.leadEmployeeId ? people.find(person => person.id === department.leadEmployeeId) : undefined;
  const own = people.filter(person => person.departmentId === department.id && person.id !== lead?.id);
  const all: RosterLine[] = [
    ...(lead ? [{ id: lead.id, name: lead.name, rank: rankOf(lead), isLead: true }] : []),
    ...own.map(person => ({ id: person.id, name: person.name, rank: rankOf(person), isLead: false })),
  ];
  return { lines: all.slice(0, MAX_LINES), more: Math.max(all.length - MAX_LINES, 0), hasLead: !!lead };
}

/** A box grows by a line for each person listed, one for "부서장 미지정" and one for the count of the rest (in rem). */
const boxHeight = (roster: Roster) =>
  BOX.head + (roster.lines.length + (roster.hasLead ? 0 : 1) + (roster.more > 0 ? 1 : 0)) * BOX.line + BOX.foot;

type Datum = { node?: DepartmentNode<OrgDepartment>; children: DepartmentNode<OrgDepartment>[] };

/**
 * The departments as a pyramid, top down: each level a row, the departments of one parent side by side under it, the
 * top-level ones side by side at the top. Positions across come from d3-hierarchy's tidy tree, which spreads each
 * subtree as wide as it needs and keeps neighbours apart, so any number of levels and departments lays itself out. Boxes
 * are as tall as their rosters; a level's boxes share its top, and the next level starts below its tallest. rem: the
 * root's font size in pixels.
 */
export function pyramidLayout(departments: readonly OrgDepartment[], people: readonly OrgPerson[], rem: number): DepartmentLayout {
  const width = BOX.width * rem;
  const forest = buildTree(departments);
  const top = hierarchy<Datum>({ children: forest }, datum => (datum.node ? datum.node.children : datum.children).map(node => ({ node, children: node.children })));
  const placed = tree<Datum>()
    .nodeSize([width + SIBLING_GAP * rem, 1])
    // Cousins stand a little further apart than siblings, so each family reads as a group.
    .separation((left, right) => (left.parent === right.parent ? 1 : 1.2))(top);
  const nodes = placed.descendants().filter(node => node.data.node) as HierarchyPointNode<Datum>[];
  const rosters = new Map(nodes.map(node => [node.data.node!.item.id, rosterOf(node.data.node!.item, people)]));
  const heightOf = (id: string) => boxHeight(rosters.get(id)!) * rem;
  const tallest: number[] = [];
  for (const node of nodes) tallest[node.depth - 1] = Math.max(tallest[node.depth - 1] ?? 0, heightOf(node.data.node!.item.id));
  const levelGap = LEVEL_GAP * rem;
  const levelTop = tallest.reduce<number[]>((tops, _, level) => [...tops, level === 0 ? 0 : tops[level - 1]! + tallest[level - 1]! + levelGap], []);
  const left = Math.min(...nodes.map(node => node.x), 0);
  const boxes = nodes.map(node => {
    const item = node.data.node!.item;
    return {
      id: item.id, department: item, childCount: node.data.node!.children.length, roster: rosters.get(item.id)!,
      memberCount: people.filter(person => person.departmentId === item.id).length,
      x: node.x - left - width / 2, y: levelTop[node.depth - 1]!, width, height: heightOf(item.id),
    };
  });
  const links = nodes.filter(node => node.parent?.data.node).map(node => ({
    id: `${node.parent!.data.node!.item.id}-${node.data.node!.item.id}`, source: node.parent!.data.node!.item.id, target: node.data.node!.item.id,
  }));
  return { boxes, links, levelGap };
}
