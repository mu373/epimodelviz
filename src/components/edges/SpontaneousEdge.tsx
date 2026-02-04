import { useState } from 'react';
import {
  getStraightPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';

type SpontaneousEdgeType = Edge<TransitionEdgeData, 'spontaneous'>;

export default function SpontaneousEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  data,
  markerEnd,
  style,
}: EdgeProps<SpontaneousEdgeType>) {
  const [hovered, setHovered] = useState(false);
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      {/* Invisible wide hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Visible edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: '#6b7280',
          strokeWidth: hovered ? 4 : 2,
          fill: 'none',
          ...style,
        }}
        markerEnd={markerEnd}
      />
      {/* Rate label at edge center */}
      {data?.showLabel && data.rate && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              fontSize: 9,
              color: '#6b7280',
              background: 'rgba(255,255,255,0.8)',
              padding: '1px 3px',
              borderRadius: 2,
              lineHeight: 1.1,
              wordWrap: 'break-word',
              maxWidth: 60,
              textAlign: 'center',
            }}
          >
            {data.rate}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Hover tooltip */}
      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${midX}px,${midY - 12}px)`,
              background: '#1f2937',
              color: 'white',
              fontSize: 12,
              borderRadius: 8,
              padding: '6px 10px',
              zIndex: 100,
              whiteSpace: 'nowrap',
            }}
          >
            <div className="font-medium">{source} → {target}</div>
            <div style={{ color: '#d1d5db' }}>Type: spontaneous</div>
            {data?.rate && <div style={{ color: '#d1d5db' }}>Rate: {data.rate}</div>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
