import { useCallback, useRef } from 'react';
import { EdgeLabelRenderer, useReactFlow } from '@xyflow/react';

interface ArcHandleProps {
  /** Curve midpoint (Bézier at t=0.5) in flow coordinates */
  midX: number;
  midY: number;
  /** Straight-line midpoint (after parallel offset) — drag reference */
  baseMidX: number;
  baseMidY: number;
  onOffsetChange: (offset: { x: number; y: number }) => void;
}

export default function ArcHandle({ midX, midY, baseMidX, baseMidY, onOffsetChange }: ArcHandleProps) {
  const { screenToFlowPosition } = useReactFlow();
  const dragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const flowPos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        // The curve midpoint = baseMid + 0.5 * arcOffset,
        // so arcOffset = 2 * (curvePoint - baseMid)
        onOffsetChange({
          x: 2 * (flowPos.x - baseMidX),
          y: 2 * (flowPos.y - baseMidY),
        });
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [screenToFlowPosition, baseMidX, baseMidY, onOffsetChange],
  );

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
          width: 28,
          height: 28,
          cursor: 'grab',
          zIndex: 50,
          pointerEvents: 'all',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Visible dot */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#3b82f6',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </EdgeLabelRenderer>
  );
}
