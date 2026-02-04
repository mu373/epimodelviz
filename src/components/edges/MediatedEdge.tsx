import { useState } from 'react';
import {
  getStraightPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';

type MediatedEdgeType = Edge<TransitionEdgeData, 'mediated'>;

export default function MediatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  markerEnd,
  style,
}: EdgeProps<MediatedEdgeType>) {
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
          stroke: '#f59e0b',
          strokeWidth: hovered ? 4 : 2,
          strokeDasharray: '4 2',
          fill: 'none',
          ...style,
        }}
        markerEnd={markerEnd}
      />
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
            <div style={{ color: '#d1d5db' }}>Type: mediated</div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
