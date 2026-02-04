import {
  getStraightPath,
  type EdgeProps,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';

type VaccinationEdgeType = Edge<TransitionEdgeData, 'vaccination'>;

export default function VaccinationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
}: EdgeProps<VaccinationEdgeType>) {
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
        stroke: '#644391',
        strokeWidth: 3,
        fill: 'none',
        ...style,
      }}
      markerEnd={`url(#${MarkerType.ArrowClosed})`}
    />
  );
}
