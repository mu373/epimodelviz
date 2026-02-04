import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { CompartmentNodeData } from '../../types/model';

type CompartmentNodeType = Node<CompartmentNodeData, 'compartment'>;

function CompartmentNode({ data }: NodeProps<CompartmentNodeType>) {
  const [hovered, setHovered] = useState(false);
  const parts = data.id.split('_');

  return (
    <div
      className="relative"
      style={{ width: 80, height: 40 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-center rounded-lg cursor-move"
        style={{
          width: 80,
          height: 40,
          backgroundColor: data.color,
          border: data.isVaccinated ? '3px dashed #644391' : '2px solid white',
        }}
      >
        <div
          className="text-center text-white font-semibold leading-tight"
          style={{ fontSize: 11, maxWidth: 70 }}
        >
          {parts.map((part, i) => (
            <span key={i} className="inline-block">
              {part}
              {i < parts.length - 1 ? '_' : ''}
              <wbr />
            </span>
          ))}
        </div>
      </div>

      {/* Sublabel — positioned absolutely so it doesn't affect node measurement */}
      {data.showLabel !== false && (
        <div
          className="absolute text-center text-gray-500 leading-tight"
          style={{ fontSize: 9, width: 80, wordWrap: 'break-word', top: 42 }}
        >
          {data.label}
        </div>
      )}

      {/* Tooltip */}
      {hovered && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap z-50">
          <div className="font-medium">{data.id}</div>
          <div className="text-gray-300">{data.label}</div>
        </div>
      )}

      {/* Source + target handle on each side so edges connect to nearest side */}
      <Handle type="source" position={Position.Top} id="source-top" />
      <Handle type="source" position={Position.Right} id="source-right" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" />
      <Handle type="source" position={Position.Left} id="source-left" />
      <Handle type="target" position={Position.Top} id="target-top" />
      <Handle type="target" position={Position.Right} id="target-right" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" />
      <Handle type="target" position={Position.Left} id="target-left" />
    </div>
  );
}

export default memo(CompartmentNode);
