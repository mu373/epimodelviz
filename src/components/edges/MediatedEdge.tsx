import {
  getStraightPath,
  type EdgeProps,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';

type MediatedEdgeType = Edge<TransitionEdgeData, 'mediated'>;

export default function MediatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
}: EdgeProps<MediatedEdgeType>) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={{
        stroke: '#f59e0b',
        strokeWidth: 2,
        strokeDasharray: '4 2',
        fill: 'none',
        ...style,
      }}
      markerEnd={`url(#${MarkerType.ArrowClosed})`}
    />
  );
}
