import {
  getStraightPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';

type SpontaneousEdgeType = Edge<TransitionEdgeData, 'spontaneous'>;

export default function SpontaneousEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}: EdgeProps<SpontaneousEdgeType>) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: '#6b7280',
          strokeWidth: 2,
          fill: 'none',
          ...style,
        }}
        markerEnd={`url(#${MarkerType.ArrowClosed})`}
      />
      {data?.showLabel && data.rate && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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
    </>
  );
}
