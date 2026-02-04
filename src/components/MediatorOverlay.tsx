import { memo, useState } from 'react';
import { EdgeLabelRenderer, type Node } from '@xyflow/react';
import type { CompartmentNodeData, MediatorGroup } from '../types/model';
import { getCompartmentColor } from '../utils/colorUtils';

interface MediatorOverlayProps {
  nodes: Node<CompartmentNodeData>[];
  mediatorGroups: MediatorGroup[];
  visible: boolean;
}

interface BoxPosition {
  source: string;
  x: number;
  y: number;
  color: string;
}

function MediatorOverlay({ nodes, mediatorGroups, visible }: MediatorOverlayProps) {
  const [hoveredBox, setHoveredBox] = useState<{ source: string; rate: string } | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<{ sources: string[]; rate: string } | null>(null);

  if (!visible || mediatorGroups.length === 0) return null;

  // Group by target transition for stacking
  const transitionGroups: Record<string, MediatorGroup[]> = {};
  mediatorGroups.forEach((g) => {
    const key = `${g.targetSource}-${g.targetTarget}`;
    if (!transitionGroups[key]) transitionGroups[key] = [];
    transitionGroups[key].push(g);
  });

  const overlays: JSX.Element[] = [];

  Object.entries(transitionGroups).forEach(([, groups]) => {
    const s = nodes.find((n) => n.id === groups[0].targetSource);
    const t = nodes.find((n) => n.id === groups[0].targetTarget);
    if (!s || !t) return;

    const baseX = (s.position.x + t.position.x) / 2 + 40; // +40 for node center offset
    const baseY = (s.position.y + t.position.y) / 2 + 20 + 70; // +20 for node center, +70 offset below

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
        const targetY = (s.position.y + t.position.y) / 2 + 20;

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
                zIndex: 5,
              }}
              onMouseEnter={() => setHoveredBox({ source: pos.source, rate: set.rate })}
              onMouseLeave={() => setHoveredBox(null)}
            >
              {pos.source.length > 10 ? pos.source.substring(0, 8) + '...' : pos.source}
            </div>,
          );
        });

        // Arrow line (SVG overlay)
        overlays.push(
          <svg
            key={`${groupData.id}-${setIdx}-arrow`}
            className="nodrag nopan"
            style={{
              position: 'absolute',
              overflow: 'visible',
              pointerEvents: 'none',
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
            <line
              x1={arrowX}
              y1={setMinY - 15}
              x2={arrowX}
              y2={targetY}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              markerEnd={`url(#mediator-arrow-${groupData.id}-${setIdx})`}
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onMouseEnter={() => setHoveredArrow({ sources: set.sources, rate: set.rate })}
              onMouseLeave={() => setHoveredArrow(null)}
            />
          </svg>,
        );

        // Rate label
        overlays.push(
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

  return (
    <EdgeLabelRenderer>
      {overlays}

      {/* Tooltip for hovered box */}
      {hoveredBox && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: '#1f2937',
            color: 'white',
            fontSize: 12,
            borderRadius: 8,
            padding: '6px 10px',
            zIndex: 100,
          }}
        >
          <div className="font-medium">Mediator: {hoveredBox.source}</div>
          <div className="text-gray-300">Rate: {hoveredBox.rate}</div>
        </div>
      )}

      {/* Tooltip for hovered arrow */}
      {hoveredArrow && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: '#1f2937',
            color: 'white',
            fontSize: 12,
            borderRadius: 8,
            padding: '6px 10px',
            zIndex: 100,
          }}
        >
          <div className="text-gray-300">Mediators: {hoveredArrow.sources.join(', ')}</div>
          <div className="text-gray-300">Rate: {hoveredArrow.rate}</div>
        </div>
      )}
    </EdgeLabelRenderer>
  );
}

export default memo(MediatorOverlay);
