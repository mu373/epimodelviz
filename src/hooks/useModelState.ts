import { useReducer, useMemo, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, useReactFlow, type Node, type Edge } from '@xyflow/react';
import type { CompartmentNodeData, TransitionEdgeData, MediatorGroup, ModelStats } from '../types/model';
import { DEFAULT_COLUMN_ORDER } from '../constants/colors';
import { parseModel } from '../utils/yamlParser';
import { applyHierarchicalLayout, applyCircularLayout, applyForceLayout } from '../utils/layoutUtils';

interface DisplayOptions {
  showSpontaneous: boolean;
  showMediated: boolean;
  showVaccination: boolean;
  showLabels: boolean;
  showCompartmentLabels: boolean;
  showMediators: boolean;
}

interface AppState {
  yamlText: string;
  displayOptions: DisplayOptions;
  layout: 'hierarchical' | 'force' | 'circular';
  columnOrder: string[];
  dialogOpen: boolean;
  stats: ModelStats | null;
  error: string | null;
  mediatorGroups: MediatorGroup[];
}

type Action =
  | { type: 'SET_YAML'; payload: string }
  | { type: 'SET_DISPLAY_OPTION'; key: keyof DisplayOptions; value: boolean }
  | { type: 'SET_LAYOUT'; payload: 'hierarchical' | 'force' | 'circular' }
  | { type: 'SET_COLUMN_ORDER'; payload: string[] }
  | { type: 'TOGGLE_DIALOG' }
  | { type: 'SET_MODEL_RESULT'; stats: ModelStats; mediatorGroups: MediatorGroup[] }
  | { type: 'SET_ERROR'; payload: string | null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_YAML':
      return { ...state, yamlText: action.payload };
    case 'SET_DISPLAY_OPTION':
      return { ...state, displayOptions: { ...state.displayOptions, [action.key]: action.value } };
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload };
    case 'SET_COLUMN_ORDER':
      return { ...state, columnOrder: action.payload };
    case 'TOGGLE_DIALOG':
      return { ...state, dialogOpen: !state.dialogOpen };
    case 'SET_MODEL_RESULT':
      return { ...state, stats: action.stats, mediatorGroups: action.mediatorGroups, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const initialState: AppState = {
  yamlText: '',
  displayOptions: {
    showSpontaneous: true,
    showMediated: true,
    showVaccination: true,
    showLabels: true,
    showCompartmentLabels: true,
    showMediators: true,
  },
  layout: 'hierarchical',
  columnOrder: [...DEFAULT_COLUMN_ORDER],
  dialogOpen: false,
  stats: null,
  error: null,
  mediatorGroups: [],
};

export function useModelState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CompartmentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<TransitionEdgeData>>([]);
  const forceSimRef = useRef<{ stop: () => void } | null>(null);
  const { fitView } = useReactFlow();

  const applyLayoutToNodes = useCallback(
    (
      newNodes: Node<CompartmentNodeData>[],
      newEdges: Edge<TransitionEdgeData>[],
      layout: 'hierarchical' | 'force' | 'circular',
      colOrder: string[],
    ) => {
      // Stop any previous force simulation
      if (forceSimRef.current) {
        forceSimRef.current.stop();
        forceSimRef.current = null;
      }

      const width = 1200;
      const height = 800;

      if (layout === 'hierarchical') {
        const laid = applyHierarchicalLayout(newNodes, width, height, colOrder);
        setNodes(laid);
        setEdges(newEdges);
        setTimeout(() => fitView({ padding: 0.2 }), 50);
      } else if (layout === 'circular') {
        const laid = applyCircularLayout(newNodes, width, height);
        setNodes(laid);
        setEdges(newEdges);
        setTimeout(() => fitView({ padding: 0.2 }), 50);
      } else if (layout === 'force') {
        // Initialize with hierarchical first, then run force
        const laid = applyHierarchicalLayout(newNodes, width, height, colOrder);
        setNodes(laid);
        setEdges(newEdges);

        const sim = applyForceLayout(laid, newEdges, width, height, (positions) => {
          setNodes((prev) =>
            prev.map((n) => {
              const pos = positions.get(n.id);
              if (pos) return { ...n, position: { x: pos.x, y: pos.y } };
              return n;
            }),
          );
        });
        forceSimRef.current = sim;
      }
    },
    [setNodes, setEdges, fitView],
  );

  const visualize = useCallback(
    (yamlText?: string) => {
      const text = yamlText ?? state.yamlText;
      if (!text.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Please input YAML content' });
        return;
      }

      try {
        const result = parseModel(text);
        dispatch({ type: 'SET_MODEL_RESULT', stats: result.stats, mediatorGroups: result.mediatorGroups });
        applyLayoutToNodes(result.nodes, result.edges, state.layout, state.columnOrder);
      } catch (e: any) {
        dispatch({ type: 'SET_ERROR', payload: 'YAML parsing error: ' + e.message });
      }
    },
    [state.yamlText, state.layout, state.columnOrder, applyLayoutToNodes],
  );

  const changeLayout = useCallback(
    (layout: 'hierarchical' | 'force' | 'circular') => {
      dispatch({ type: 'SET_LAYOUT', payload: layout });
      if (nodes.length > 0) {
        // Re-parse to get fresh nodes (positions get mutated)
        try {
          const result = parseModel(state.yamlText);
          applyLayoutToNodes(result.nodes, result.edges, layout, state.columnOrder);
        } catch {
          // ignore
        }
      }
    },
    [nodes.length, state.yamlText, state.columnOrder, applyLayoutToNodes],
  );

  const reorderColumns = useCallback(
    (newOrder: string[]) => {
      dispatch({ type: 'SET_COLUMN_ORDER', payload: newOrder });
      if (nodes.length > 0 && state.layout === 'hierarchical') {
        try {
          const result = parseModel(state.yamlText);
          applyLayoutToNodes(result.nodes, result.edges, 'hierarchical', newOrder);
        } catch {
          // ignore
        }
      }
    },
    [nodes.length, state.yamlText, state.layout, applyLayoutToNodes],
  );

  // Propagate display options into node data
  const visibleNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, showLabel: state.displayOptions.showCompartmentLabels },
    }));
  }, [nodes, state.displayOptions.showCompartmentLabels]);

  // Filter visible edges and assign nearest-side handles
  const visibleEdges = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const filtered = edges.filter((e) => {
      const t = e.data?.type ?? e.type;
      if (t === 'spontaneous' && !state.displayOptions.showSpontaneous) return false;
      if (t === 'mediated' && !state.displayOptions.showMediated) return false;
      if (t === 'vaccination' && !state.displayOptions.showVaccination) return false;
      return true;
    }).map((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);

      let sourceHandle = 'source-right';
      let targetHandle = 'target-left';

      if (src && tgt) {
        const dx = tgt.position.x - src.position.x;
        const dy = tgt.position.y - src.position.y;
        const angle = Math.atan2(dy, dx);

        // Pick the side facing the other node
        if (Math.abs(angle) < Math.PI / 4) {
          sourceHandle = 'source-right';
          targetHandle = 'target-left';
        } else if (Math.abs(angle) > (3 * Math.PI) / 4) {
          sourceHandle = 'source-left';
          targetHandle = 'target-right';
        } else if (angle > 0) {
          sourceHandle = 'source-bottom';
          targetHandle = 'target-top';
        } else {
          sourceHandle = 'source-top';
          targetHandle = 'target-bottom';
        }
      }

      return {
        ...e,
        sourceHandle,
        targetHandle,
        data: { ...e.data!, showLabel: state.displayOptions.showLabels },
      };
    });

    // Assign perpendicular offsets for parallel edges (same node pair, any direction)
    const GAP = 12;
    const pairGroups = new Map<string, number[]>();
    for (let i = 0; i < filtered.length; i++) {
      const key = [filtered[i].source, filtered[i].target].sort().join('\0');
      if (!pairGroups.has(key)) pairGroups.set(key, []);
      pairGroups.get(key)!.push(i);
    }
    for (const [key, indices] of pairGroups.entries()) {
      if (indices.length <= 1) continue;
      const [canonicalFirst] = key.split('\0');
      const n = indices.length;
      for (let j = 0; j < n; j++) {
        const e = filtered[indices[j]];
        const offset = (j - (n - 1) / 2) * GAP;
        // Negate offset for edges whose source→target is reversed vs canonical sort order,
        // because the perpendicular vector flips with the direction.
        const sign = e.source === canonicalFirst ? 1 : -1;
        filtered[indices[j]] = { ...e, data: { ...e.data!, offsetPx: offset * sign } };
      }
    }

    return filtered;
  }, [edges, nodes, state.displayOptions]);

  return {
    state,
    dispatch,
    nodes: visibleNodes,
    setNodes,
    onNodesChange,
    edges: visibleEdges,
    onEdgesChange,
    visualize,
    changeLayout,
    reorderColumns,
  };
}
