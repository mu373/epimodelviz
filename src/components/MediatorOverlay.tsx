import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EdgeLabelRenderer, type Node } from '@xyflow/react';
import type { CompartmentNodeData, MediatorGroup } from '../types/model';
import { getCompartmentColor } from '../utils/colorUtils';

interface MediatorOverlayProps {
  nodes: Node<CompartmentNodeData>[];
  mediatorGroups: MediatorGroup[];
  visible: boolean;
  showLabels: boolean;
}

interface BoxPosition {
  source: string;
  x: number;
  y: number;
  color: string;
}

const NODE_W = 80;
const NODE_H = 40;

/** Compute the actual edge midpoint using the same angle-based handle selection as useModelState */
function getEdgeMidpoint(s: Node<CompartmentNodeData>, t: Node<CompartmentNodeData>) {
  const sCx = s.position.x + NODE_W / 2;
  const sCy = s.position.y + NODE_H / 2;
  const tCx = t.position.x + NODE_W / 2;
  const tCy = t.position.y + NODE_H / 2;

  const dx = tCx - sCx;
  const dy = tCy - sCy;
  const angle = Math.atan2(dy, dx);

  let sx: number, sy: number, tx: number, ty: number;

  if (Math.abs(angle) < Math.PI / 4) {
    // source right → target left
    sx = s.position.x + NODE_W;  sy = s.position.y + NODE_H / 2;
    tx = t.position.x;           ty = t.position.y + NODE_H / 2;
  } else if (Math.abs(angle) > (3 * Math.PI) / 4) {
    // source left → target right
    sx = s.position.x;           sy = s.position.y + NODE_H / 2;
    tx = t.position.x + NODE_W;  ty = t.position.y + NODE_H / 2;
  } else if (angle > 0) {
    // source bottom → target top
    sx = s.position.x + NODE_W / 2;  sy = s.position.y + NODE_H;
    tx = t.position.x + NODE_W / 2;  ty = t.position.y;
  } else {
    // source top → target bottom
    sx = s.position.x + NODE_W / 2;  sy = s.position.y;
    tx = t.position.x + NODE_W / 2;  ty = t.position.y + NODE_H;
  }

  return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
}

function MediatorOverlay({ nodes, mediatorGroups, visible, showLabels }: MediatorOverlayProps) {
  const [hoveredBox, setHoveredBox] = useState<{ source: string; rate: string; mouseX: number; mouseY: number } | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<{ sources: string[]; rate: string; mouseX: number; mouseY: number } | null>(null);

  if (!visible || mediatorGroups.length === 0) return null;

  // Group by target transition for stacking
  const transitionGroups: Record<string, MediatorGroup[]> = {};
  mediatorGroups.forEach((g) => {
    const key = `${g.targetSource}-${g.targetTarget}`;
    if (!transitionGroups[key]) transitionGroups[key] = [];
    transitionGroups[key].push(g);
  });

  const overlays: React.JSX.Element[] = [];

  Object.entries(transitionGroups).forEach(([, groups]) => {
    const s = nodes.find((n) => n.id === groups[0].targetSource);
    const t = nodes.find((n) => n.id === groups[0].targetTarget);
    if (!s || !t) return;

    const mid = getEdgeMidpoint(s, t);
    const baseX = mid.x;
    const baseY = mid.y + 70; // 70px below the edge midpoint

    let cumulativeY = 0;

    groups.forEach((groupData, groupIdx) => {
      const xOffset = (groupIdx - (groups.length - 1) / 2) * 30;
      const groupX = baseX;
      const arrowX = baseX + xOffset;
      const groupY = baseY + cumulativeY;

      let yOffset = 0;

      groupData.mediatorSets.forEach((set, setIdx) => {
        const cols = Math.min(Math.ceil(Math.sqrt(set.sources.length)), 4);
        const rows = Math.ceil(set.sources.length / cols);
        const boxWidth = 60;
        const boxHeight = 24;
        const gap = 5;
        const setGap = 15;

        const positions: BoxPosition[] = set.sources.map((src, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const totalWidth = Math.min(set.sources.length, cols) * boxWidth + (Math.min(set.sources.length, cols) - 1) * gap;
          return {
            source: src,
            x: groupX - totalWidth / 2 + col * (boxWidth + gap) + boxWidth / 2,
            y: groupY + yOffset + row * (boxHeight + gap) + boxHeight / 2,
            color: getCompartmentColor(src),
          };
        });

        const setMinY = Math.min(...positions.map((p) => p.y));
        const targetY = mid.y;

        // Render boxes
        positions.forEach((pos, idx) => {
          overlays.push(
            <div
              key={`${groupData.id}-${setIdx}-box-${idx}`}
              className="nodrag nopan"
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                width: boxWidth,
                height: boxHeight,
                borderRadius: 4,
                backgroundColor: `${pos.color}30`,
                border: `1.5px solid ${pos.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: pos.source.length > 8 ? 8 : 10,
                fontWeight: 600,
                color: pos.color,
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 5,
              }}
              onMouseEnter={(e) => setHoveredBox({ source: pos.source, rate: set.rate, mouseX: e.clientX, mouseY: e.clientY })}
              onMouseLeave={() => setHoveredBox(null)}
            >
              {pos.source.length > 10 ? pos.source.substring(0, 8) + '...' : pos.source}
            </div>,
          );
        });

        // Arrow line (SVG overlay) — no pointerEvents: none on container
        overlays.push(
          <svg
            key={`${groupData.id}-${setIdx}-arrow`}
            className="nodrag nopan"
            style={{
              position: 'absolute',
              overflow: 'visible',
              pointerEvents: 'auto',
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              zIndex: 4,
            }}
          >
            <defs>
              <marker
                id={`mediator-arrow-${groupData.id}-${setIdx}`}
                viewBox="0 -5 10 10"
                refX={6}
                refY={0}
                markerWidth={4}
                markerHeight={4}
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,-5L10,0L0,5" fill="#f59e0b" />
              </marker>
            </defs>
            {/* Invisible wide hit area for arrow */}
            <line
              x1={arrowX}
              y1={setMinY - 15}
              x2={arrowX}
              y2={targetY}
              stroke="transparent"
              strokeWidth={16}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => setHoveredArrow({ sources: set.sources, rate: set.rate, mouseX: e.clientX, mouseY: e.clientY })}
              onMouseLeave={() => setHoveredArrow(null)}
            />
            {/* Visible arrow */}
            <line
              x1={arrowX}
              y1={setMinY - 15}
              x2={arrowX}
              y2={targetY}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              markerEnd={`url(#mediator-arrow-${groupData.id}-${setIdx})`}
              style={{ pointerEvents: 'none' }}
            />
          </svg>,
        );

        // Rate label
        if (showLabels) overlays.push(
          <div
            key={`${groupData.id}-${setIdx}-rate`}
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(${arrowX + 5}px, ${setMinY - 40}px)`,
              fontSize: 9,
              color: '#f59e0b',
              background: 'rgba(255,255,255,0.8)',
              padding: '2px',
              borderRadius: 2,
              lineHeight: 1.2,
              wordWrap: 'break-word',
              maxWidth: 100,
              zIndex: 5,
            }}
          >
            {set.rate}
          </div>,
        );

        yOffset += rows * boxHeight + (rows - 1) * gap + setGap;
      });

      const totalGroupHeight = yOffset + 40;
      cumulativeY += totalGroupHeight;
    });
  });

  // Portal tooltips to document.body so they aren't affected by React Flow transforms
  const tooltip = (hoveredBox || hoveredArrow) ? createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: (hoveredBox?.mouseX ?? hoveredArrow?.mouseX ?? 0) + 10,
        top: (hoveredBox?.mouseY ?? hoveredArrow?.mouseY ?? 0) - 60,
        background: '#1f2937',
        color: 'white',
        fontSize: 12,
        borderRadius: 8,
        padding: '6px 10px',
        zIndex: 10000,
        whiteSpace: 'nowrap',
      }}
    >
      {hoveredBox && (
        <>
          <div className="font-medium">Mediator: {hoveredBox.source}</div>
          <div style={{ color: '#d1d5db' }}>Rate: {hoveredBox.rate}</div>
        </>
      )}
      {hoveredArrow && (
        <>
          <div style={{ color: '#d1d5db' }}>Mediators: {hoveredArrow.sources.join(', ')}</div>
          <div style={{ color: '#d1d5db' }}>Rate: {hoveredArrow.rate}</div>
        </>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <EdgeLabelRenderer>
        {overlays}
      </EdgeLabelRenderer>
      {tooltip}
    </>
  );
}

export default memo(MediatorOverlay);
