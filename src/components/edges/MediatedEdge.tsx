import { useState, useCallback, useContext } from 'react';
import {
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import type { TransitionEdgeData } from '../../types/model';
import { getOffsetStraightPath, getOffsetArcPath, getDefaultArcOffset } from '../../utils/edgeUtils';
import { DispatchContext } from '../../hooks/useModelState';
import EdgeContextMenu from './EdgeContextMenu';
import ArcHandle from './ArcHandle';

type MediatedEdgeType = Edge<TransitionEdgeData, 'mediated'>;

export default function MediatedEdge({
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
}: EdgeProps<MediatedEdgeType>) {
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dispatch = useContext(DispatchContext);
  const offsetPx = data?.offsetPx ?? 0;
  const arcOffset = data?.arcOffset;

  const straight = getOffsetStraightPath(sourceX, sourceY, targetX, targetY, offsetPx);
  const arc = arcOffset
    ? getOffsetArcPath(sourceX, sourceY, targetX, targetY, offsetPx, arcOffset)
    : null;

  const edgePath = arc?.path ?? straight.path;
  const midX = arc?.midX ?? straight.midX;
  const midY = arc?.midY ?? straight.midY;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

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
        onContextMenu={handleContextMenu}
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
      {/* Draggable arc handle */}
      {arc && (
        <ArcHandle
          midX={arc.midX}
          midY={arc.midY}
          cx={arc.cx}
          cy={arc.cy}
          baseMidX={straight.midX}
          baseMidY={straight.midY}
          onOffsetChange={(offset) => dispatch({ type: 'SET_ARC_OFFSET', edgeId: id, offset })}
        />
      )}
      {/* Context menu */}
      {contextMenu && (
        <EdgeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isArc={!!arcOffset}
          onToggleArc={() =>
            dispatch({
              type: 'TOGGLE_EDGE_ARC',
              edgeId: id,
              defaultOffset: getDefaultArcOffset(sourceX, sourceY, targetX, targetY),
              isCurrentlyArc: !!arcOffset,
            })
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
