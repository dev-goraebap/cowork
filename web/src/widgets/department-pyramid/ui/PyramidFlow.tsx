import { applyNodeChanges, Controls, ReactFlow, type EdgeTypes, type NodeChange, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import { cn } from 'cn';
import type { OrgDepartment, OrgPerson } from '@/entities/organization';
import { pyramidLayout } from '../model/pyramid-layout';
import { PyramidLinkEdge, type PyramidLinkFlowEdge } from './PyramidLinkEdge';
import { PyramidNode, type PyramidFlowNode } from './PyramidNode';

const nodeTypes: NodeTypes = { department: PyramidNode };
const edgeTypes: EdgeTypes = { link: PyramidLinkEdge };

/** The root's font size in pixels, which grows on a large screen (app/styles/index.css); the boxes are laid out in it. */
const rootRem = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * React Flow's own variables (its ground, lines and controls) take the theme's tokens, so it follows the mode and colour
 * theme. The ground is the page's plain surface.
 */
const CANVAS = cn(
  '[--xy-background-color:var(--background)] [--xy-edge-stroke:var(--muted-foreground)] [--xy-edge-stroke-width:1]',
  '[--xy-controls-button-background-color:var(--card)] [--xy-controls-button-background-color-hover:var(--muted)]',
  '[--xy-controls-button-color:var(--foreground)] [--xy-controls-button-color-hover:var(--foreground)]',
  '[--xy-controls-button-border-color:var(--border)] [--xy-controls-box-shadow:none]',
  '[--xy-node-boxshadow-selected:none] [--xy-selection-background-color:transparent]',
);

/**
 * The departments on a canvas (React Flow) over a plain ground that pans and zooms and first fits the chart, as a
 * pyramid laid out by level: the top ones in a row, each department's own below it side by side, joined by right-angled
 * lines, each box listing its people. Pressing a box selects it; the chart is only for looking. The layout is worked out
 * here, so its library loads with the canvas.
 */
export function PyramidFlow({ departments, people, selected, onSelect }: {
  departments: readonly OrgDepartment[]; people: readonly OrgPerson[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const [rem, setRem] = useState(rootRem);
  useEffect(() => {
    const resize = () => setRem(rootRem());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const layout = useMemo(() => pyramidLayout(departments, people, rem), [departments, people, rem]);
  const placed = useMemo<PyramidFlowNode[]>(() => layout.boxes.map(box => ({
    id: box.id, type: 'department' as const, position: { x: box.x, y: box.y }, width: box.width, height: box.height,
    // group/node: the box draws React Flow's keyboard focus on its wrapper (PyramidNode).
    draggable: false, connectable: false, selected: box.id === selected, ariaLabel: box.department.name, className: 'group/node', data: { box },
  })), [layout, selected]);
  const [nodes, setNodes] = useState(placed);
  useEffect(() => setNodes(placed), [placed]);
  const edges = useMemo<PyramidLinkFlowEdge[]>(() => layout.links.map(link => ({
    id: link.id, source: link.source, target: link.target, type: 'link', selectable: false, data: { link, levelGap: layout.levelGap },
  })), [layout]);
  return <section className="relative h-full min-h-0 flex-1" aria-label="조직도">
    <ReactFlow className={cn('absolute inset-0', CANVAS)} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} minZoom={0.3} maxZoom={1.5}
      nodesConnectable={false} nodesDraggable={false} edgesFocusable={false} proOptions={{ hideAttribution: true }}
      onNodesChange={(changes: NodeChange<PyramidFlowNode>[]) => {
        setNodes(current => applyNodeChanges(changes, current));
        // Enter on a focused box selects it without a click: open its people as a press does.
        const chosen = changes.find(change => change.type === 'select' && change.selected);
        if (chosen && 'id' in chosen && chosen.id !== selected) onSelect(chosen.id);
      }}
      onNodeClick={(_, node) => onSelect(node.id)}>
      <Controls showInteractive={false} position="bottom-right" className="overflow-hidden rounded-lg border" />
    </ReactFlow>
  </section>;
}
