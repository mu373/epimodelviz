import type { Node, Edge } from '@xyflow/react';
import type { CompartmentNodeData, TransitionEdgeData, MediatorGroup } from '../types/model';
import { getCompartmentColor } from './colorUtils';

const NODE_W = 80;
const NODE_H = 40;

export interface SvgExportData {
  nodes: Node<CompartmentNodeData>[];
  edges: Edge<TransitionEdgeData>[];
  mediatorGroups: MediatorGroup[];
  showMediators: boolean;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Draw an arrowhead polygon at (tipX, tipY) pointing in direction angle */
function arrowHead(
  tipX: number,
  tipY: number,
  angle: number,
  size: number,
  color: string,
  opacity = 1,
): string {
  const hw = size * 0.5;
  const bx = tipX - size * Math.cos(angle);
  const by = tipY - size * Math.sin(angle);
  const lx = bx + hw * Math.sin(angle);
  const ly = by - hw * Math.cos(angle);
  const rx = bx - hw * Math.sin(angle);
  const ry = by + hw * Math.cos(angle);
  const opacityAttr = opacity < 1 ? ` opacity="${opacity}"` : '';
  return `<polygon points="${tipX},${tipY} ${lx},${ly} ${rx},${ry}" fill="${color}"${opacityAttr}/>`;
}

function getHandleXY(
  node: Node<CompartmentNodeData>,
  side: 'right' | 'left' | 'bottom' | 'top',
): { x: number; y: number } {
  const x = node.position.x;
  const y = node.position.y;
  switch (side) {
    case 'right':
      return { x: x + NODE_W, y: y + NODE_H / 2 };
    case 'left':
      return { x, y: y + NODE_H / 2 };
    case 'bottom':
      return { x: x + NODE_W / 2, y: y + NODE_H };
    case 'top':
      return { x: x + NODE_W / 2, y };
  }
}

function getNearestSides(
  src: Node<CompartmentNodeData>,
  tgt: Node<CompartmentNodeData>,
): { sourceSide: 'right' | 'left' | 'bottom' | 'top'; targetSide: 'right' | 'left' | 'bottom' | 'top' } {
  const dx = tgt.position.x - src.position.x;
  const dy = tgt.position.y - src.position.y;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angle) < Math.PI / 4) {
    return { sourceSide: 'right', targetSide: 'left' };
  } else if (Math.abs(angle) > (3 * Math.PI) / 4) {
    return { sourceSide: 'left', targetSide: 'right' };
  } else if (angle > 0) {
    return { sourceSide: 'bottom', targetSide: 'top' };
  } else {
    return { sourceSide: 'top', targetSide: 'bottom' };
  }
}

export function exportToSvg(data: SvgExportData) {
  const { nodes, edges, mediatorGroups, showMediators } = data;
  if (nodes.length === 0) return;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edgeElements: string[] = [];
  const nodeElements: string[] = [];
  const mediatorElements: string[] = [];

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  function expand(x: number, y: number, w = 0, h = 0) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  // --- Edges (deduplicate mediated edges sharing the same source-target) ---
  const ARROW_SIZE = 8;
  const renderedEdges = new Set<string>();

  edges.forEach((e) => {
    const edgeType = e.type ?? 'spontaneous';
    const dedupeKey = `${edgeType}-${e.source}-${e.target}`;
    if (renderedEdges.has(dedupeKey)) return;
    renderedEdges.add(dedupeKey);

    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (!src || !tgt) return;

    const { sourceSide, targetSide } = getNearestSides(src, tgt);
    const sp = getHandleXY(src, sourceSide);
    const tp = getHandleXY(tgt, targetSide);

    const angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
    const tipX = tp.x;
    const tipY = tp.y;
    const endX = tp.x - ARROW_SIZE * Math.cos(angle);
    const endY = tp.y - ARROW_SIZE * Math.sin(angle);

    let stroke = '#6b7280';
    let strokeWidth = 2;
    let dash = '';

    if (edgeType === 'mediated') {
      stroke = '#f59e0b';
      dash = ' stroke-dasharray="4 2"';
    } else if (edgeType === 'vaccination') {
      stroke = '#644391';
      strokeWidth = 3;
    }

    edgeElements.push(`<g id="edge-${e.source}-${e.target}">`);
    edgeElements.push(
      `  <line x1="${sp.x}" y1="${sp.y}" x2="${endX}" y2="${endY}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`,
    );
    edgeElements.push(`  ${arrowHead(tipX, tipY, angle, ARROW_SIZE, stroke)}`);
    edgeElements.push(`</g>`);

    // Rate label (mediated edges show rates via mediator overlay instead)
    if (edgeType !== 'mediated' && e.data?.showLabel && e.data?.rate) {
      const mx = (sp.x + tp.x) / 2;
      const my = (sp.y + tp.y) / 2;
      edgeElements.push(
        `<text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="9" fill="${stroke}" font-family="Helvetica, Arial, sans-serif">${escapeXml(e.data.rate)}</text>`,
      );
      expand(mx - 40, my - 14, 80, 14);
    }
  });

  // --- Nodes ---
  nodes.forEach((n) => {
    const x = n.position.x;
    const y = n.position.y;
    const d = n.data;
    expand(x, y, NODE_W, NODE_H + 25);

    nodeElements.push(`<g id="node-${d.id}">`);
    if (d.isVaccinated) {
      nodeElements.push(
        `  <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="8" ry="8" fill="${d.color}" stroke="#644391" stroke-width="3" stroke-dasharray="6 3"/>`,
      );
    } else {
      nodeElements.push(
        `  <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="8" ry="8" fill="${d.color}" stroke="white" stroke-width="2"/>`,
      );
    }

    const fontSize = d.id.length > 12 ? 9 : 11;
    nodeElements.push(
      `  <text x="${x + NODE_W / 2}" y="${y + NODE_H / 2}" dy="0.35em" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="white" font-family="Helvetica, Arial, sans-serif">${escapeXml(d.id)}</text>`,
    );
    nodeElements.push(`</g>`);

    nodeElements.push(
      `<text x="${x + NODE_W / 2}" y="${y + NODE_H + 12}" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Helvetica, Arial, sans-serif">${escapeXml(d.label)}</text>`,
    );
  });

  // --- Mediator overlays ---
  const MED_ARROW = 6;

  if (showMediators && mediatorGroups.length > 0) {
    const transitionGroups: Record<string, MediatorGroup[]> = {};
    mediatorGroups.forEach((g) => {
      const key = `${g.targetSource}-${g.targetTarget}`;
      if (!transitionGroups[key]) transitionGroups[key] = [];
      transitionGroups[key].push(g);
    });

    Object.values(transitionGroups).forEach((groups) => {
      const s = nodeMap.get(groups[0].targetSource);
      const t = nodeMap.get(groups[0].targetTarget);
      if (!s || !t) return;

      const { sourceSide, targetSide } = getNearestSides(s, t);
      const sp = getHandleXY(s, sourceSide);
      const tp = getHandleXY(t, targetSide);
      const mid = { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 };

      const baseX = mid.x;
      const baseY = mid.y + 70;
      let cumulativeY = 0;

      groups.forEach((groupData, groupIdx) => {
        const xOffset = (groupIdx - (groups.length - 1) / 2) * 30;
        const groupX = baseX;
        const arrowX = baseX + xOffset;
        const groupY = baseY + cumulativeY;
        let yOffset = 0;

        groupData.mediatorSets.forEach((set) => {
          const cols = Math.min(Math.ceil(Math.sqrt(set.sources.length)), 4);
          const rows = Math.ceil(set.sources.length / cols);
          const boxW = 60;
          const boxH = 24;
          const gap = 5;
          const setGap = 15;

          const positions = set.sources.map((src, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const totalW = Math.min(set.sources.length, cols) * boxW + (Math.min(set.sources.length, cols) - 1) * gap;
            return {
              source: src,
              cx: groupX - totalW / 2 + col * (boxW + gap) + boxW / 2,
              cy: groupY + yOffset + row * (boxH + gap) + boxH / 2,
              color: getCompartmentColor(src),
            };
          });

          const setMinY = Math.min(...positions.map((p) => p.cy));

          mediatorElements.push(`<g id="mediator-${groupData.id}">`);

          // Boxes
          positions.forEach((pos) => {
            const rx = pos.cx - boxW / 2;
            const ry = pos.cy - boxH / 2;
            expand(rx, ry, boxW, boxH);
            mediatorElements.push(
              `  <rect x="${rx}" y="${ry}" width="${boxW}" height="${boxH}" rx="4" ry="4" fill="${pos.color}" fill-opacity="0.19" stroke="${pos.color}" stroke-width="1.5"/>`,
            );
            const label = pos.source.length > 10 ? pos.source.substring(0, 8) + '...' : pos.source;
            const fs = pos.source.length > 8 ? 8 : 10;
            mediatorElements.push(
              `  <text x="${pos.cx}" y="${pos.cy}" text-anchor="middle" dy="0.35em" font-size="${fs}" font-weight="600" fill="${pos.color}" font-family="Helvetica, Arial, sans-serif">${escapeXml(label)}</text>`,
            );
          });

          // Arrow line (shortened) + arrowhead polygon
          const aStartY = setMinY - 15;
          const aEndY = mid.y + MED_ARROW;
          mediatorElements.push(
            `  <line x1="${arrowX}" y1="${aStartY}" x2="${arrowX}" y2="${aEndY}" stroke="#f59e0b" stroke-width="1.5" opacity="0.7"/>`,
          );
          // Arrow points upward (angle = -PI/2)
          mediatorElements.push(`  ${arrowHead(arrowX, mid.y, -Math.PI / 2, MED_ARROW, '#f59e0b', 0.7)}`);
          expand(arrowX - 4, mid.y, 8, aStartY - mid.y);

          // Rate label
          mediatorElements.push(
            `  <text x="${arrowX + 5}" y="${setMinY - 25}" font-size="9" fill="#f59e0b" font-family="Helvetica, Arial, sans-serif">${escapeXml(set.rate)}</text>`,
          );
          expand(arrowX + 5, setMinY - 35, 80, 10);

          mediatorElements.push(`</g>`);

          yOffset += rows * boxH + (rows - 1) * gap + setGap;
        });

        cumulativeY += yOffset + 40;
      });
    });
  }

  // --- Build SVG ---
  const pad = 40;
  const svgW = maxX - minX + pad * 2;
  const svgH = maxY - minY + pad * 2;
  const vx = minX - pad;
  const vy = minY - pad;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="${vx} ${vy} ${svgW} ${svgH}">`,
    ...edgeElements,
    ...nodeElements,
    ...mediatorElements,
    `</svg>`,
  ];

  const svgStr = lines.join('\n');
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'compartment-model.svg';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
