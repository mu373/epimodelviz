import type { Node, Edge } from '@xyflow/react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import type { CompartmentNodeData } from '../types/model';
import { getCompartmentBaseName } from './colorUtils';
import { getCompartmentGroup, getOrderedColumns } from './yamlParser';

export function applyHierarchicalLayout(
  nodes: Node<CompartmentNodeData>[],
  width: number,
  height: number,
  columnOrder: string[],
): Node<CompartmentNodeData>[] {
  const groups: Record<string, { nonVax: Node<CompartmentNodeData>[]; vax: Node<CompartmentNodeData>[] }> = {};

  nodes.forEach((n) => {
    const g = getCompartmentGroup(n.id);
    const key = g.base;
    if (!groups[key]) groups[key] = { nonVax: [], vax: [] };
    if (g.isVax) {
      groups[key].vax.push(n);
    } else {
      groups[key].nonVax.push(n);
    }
  });

  const orderedCols = getOrderedColumns(nodes, columnOrder);
  let x = 100;
  const xStep = 250;

  // Use global row counts so nodes at the same row index align across columns
  let maxNonVax = 0;
  let maxVax = 0;
  for (const col of Object.values(groups)) {
    if (col.nonVax.length > maxNonVax) maxNonVax = col.nonVax.length;
    if (col.vax.length > maxVax) maxVax = col.vax.length;
  }
  const totalRows = maxNonVax + maxVax;
  const yStep = height / (totalRows + 1);

  orderedCols.forEach((colKey) => {
    const col = groups[colKey];
    if (!col) {
      x += xStep;
      return;
    }

    col.nonVax.forEach((node, i) => {
      node.position = { x, y: yStep * (i + 1) };
    });
    col.vax.forEach((node, i) => {
      node.position = { x, y: yStep * (maxNonVax + i + 1) };
    });
    x += xStep;
  });

  return [...nodes];
}

export function applyCircularLayout(
  nodes: Node<CompartmentNodeData>[],
  width: number,
  height: number,
): Node<CompartmentNodeData>[] {
  const radius = Math.min(width, height) / 3;
  const cx = width / 2;
  const cy = height / 2;
  const step = (2 * Math.PI) / Math.max(nodes.length, 1);

  nodes.forEach((node, i) => {
    node.position = {
      x: cx + radius * Math.cos(i * step - Math.PI / 2),
      y: cy + radius * Math.sin(i * step - Math.PI / 2),
    };
  });

  return [...nodes];
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export function applyForceLayout(
  nodes: Node<CompartmentNodeData>[],
  edges: Edge[],
  width: number,
  height: number,
  onTick: (positions: Map<string, { x: number; y: number }>) => void,
): { stop: () => void } {
  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    x: n.position.x || Math.random() * width,
    y: n.position.y || Math.random() * height,
  }));

  const simLinks = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const sim = forceSimulation(simNodes)
    .force('link', forceLink(simLinks).id((d: any) => d.id).distance(200))
    .force('charge', forceManyBody().strength(-800))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide().radius(80))
    .on('tick', () => {
      const positions = new Map<string, { x: number; y: number }>();
      simNodes.forEach((sn) => {
        positions.set(sn.id, { x: sn.x, y: sn.y });
      });
      onTick(positions);
    });

  return {
    stop: () => sim.stop(),
  };
}
