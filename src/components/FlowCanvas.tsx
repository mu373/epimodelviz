import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CompartmentNode from './nodes/CompartmentNode';
import SpontaneousEdge from './edges/SpontaneousEdge';
import MediatedEdge from './edges/MediatedEdge';
import VaccinationEdge from './edges/VaccinationEdge';
import MediatorOverlay from './MediatorOverlay';
import Legend from './Legend';
import type { CompartmentNodeData, TransitionEdgeData, MediatorGroup } from '../types/model';

const nodeTypes = {
  compartment: CompartmentNode,
};

const edgeTypes = {
  spontaneous: SpontaneousEdge,
  mediated: MediatedEdge,
  vaccination: VaccinationEdge,
};

interface FlowCanvasProps {
  nodes: Node<CompartmentNodeData>[];
  edges: Edge<TransitionEdgeData>[];
  onNodesChange: OnNodesChange<Node<CompartmentNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<TransitionEdgeData>>;
  mediatorGroups: MediatorGroup[];
  showMediators: boolean;
  showMediated: boolean;
}

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  mediatorGroups,
  showMediators,
  showMediated,
}: FlowCanvasProps) {
  const hasModel = nodes.length > 0;

  return (
    <div className="relative w-full h-full">
      {!hasModel && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="mt-2 text-sm">No model loaded</p>
            <p className="text-xs text-gray-500 mt-1">Upload a YAML file or paste content to visualize</p>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={3}
      >
        <MiniMap
          nodeColor={(node) => (node.data as CompartmentNodeData)?.color ?? '#6b7280'}
          nodeStrokeWidth={2}
          zoomable
          pannable
          style={{ width: 160, height: 126, borderRadius: '0.5rem', overflow: 'hidden', boxShadow: 'none', border: '1px solid #e5e7eb' }}
        />
        <Controls />
        <Background />
        <MediatorOverlay
          nodes={nodes}
          mediatorGroups={mediatorGroups}
          visible={showMediators && showMediated}
        />
      </ReactFlow>
      {hasModel && <Legend />}
    </div>
  );
}
