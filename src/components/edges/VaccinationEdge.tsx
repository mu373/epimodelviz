import { useState } from 'react';
import {
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';
import { getOffsetStraightPath } from '../../utils/edgeUtils';

type VaccinationEdgeType = Edge<TransitionEdgeData, 'vaccination'>;

export default function VaccinationEdge({
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
}: EdgeProps<VaccinationEdgeType>) {
  const [hovered, setHovered] = useState(false);
  const offsetPx = data?.offsetPx ?? 0;
  const { path: edgePath, midX, midY } = getOffsetStraightPath(sourceX, sourceY, targetX, targetY, offsetPx);

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
          stroke: '#644391',
          strokeWidth: hovered ? 5 : 3,
          fill: 'none',
          ...style,
        }}
        markerEnd={markerEnd}
      />
      {/* Rate label at edge center */}
      {data?.showLabel && data?.rate && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              fontSize: 9,
              color: '#644391',
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
            <div style={{ color: '#d1d5db' }}>Type: vaccination</div>
            {data?.rate && <div style={{ color: '#d1d5db' }}>Rate: {data.rate}</div>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
