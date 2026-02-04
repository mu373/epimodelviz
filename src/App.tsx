import { useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useModelState } from './hooks/useModelState';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import FlowCanvas from './components/FlowCanvas';
import ColumnOrderDialog from './components/ColumnOrderDialog';
import { getOrderedColumns } from './utils/yamlParser';
import { DEFAULT_COLUMN_ORDER } from './constants/colors';
import { exportToSvg } from './utils/exportUtils';

function AppInner() {
  const {
    state,
    dispatch,
    nodes,
    onNodesChange,
    edges,
    onEdgesChange,
    visualize,
    changeLayout,
    reorderColumns,
  } = useModelState();

  const handleLoadSample = useCallback(async () => {
    try {
      const res = await fetch('/sample.yml');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      dispatch({ type: 'SET_YAML', payload: text });
      setTimeout(() => visualize(text), 0);
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load sample.yml: ' + e.message });
    }
  }, [dispatch, visualize]);

  const handleVisualize = useCallback(() => {
    visualize();
  }, [visualize]);

  const handleExport = useCallback(() => {
    exportToSvg({
      nodes,
      edges,
      mediatorGroups: state.mediatorGroups,
      showMediators: state.displayOptions.showMediators && state.displayOptions.showMediated,
    });
  }, [nodes, edges, state.mediatorGroups, state.displayOptions.showMediators, state.displayOptions.showMediated]);

  const columns = nodes.length > 0 ? getOrderedColumns(nodes, state.columnOrder) : [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Compartment Model Visualizer</h1>
        <p className="text-sm text-gray-600 mt-1">Visualize epidemiological compartment models from YAML</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          yamlText={state.yamlText}
          onYamlChange={(text) => dispatch({ type: 'SET_YAML', payload: text })}
          onVisualize={handleVisualize}
          onLoadSample={handleLoadSample}
          displayOptions={state.displayOptions}
          onDisplayOptionChange={(key, value) => dispatch({ type: 'SET_DISPLAY_OPTION', key, value })}
          stats={state.stats}
          error={state.error}
        />

        <div className="flex-1 flex flex-col bg-white">
          <Toolbar
            layout={state.layout}
            onLayoutChange={changeLayout}
            onColumnOrderClick={() => dispatch({ type: 'TOGGLE_DIALOG' })}
            onExport={handleExport}
          />
          <div className="flex-1">
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              mediatorGroups={state.mediatorGroups}
              showMediators={state.displayOptions.showMediators}
              showMediated={state.displayOptions.showMediated}
              showLabels={state.displayOptions.showLabels}
            />
          </div>
        </div>
      </div>

      <ColumnOrderDialog
        open={state.dialogOpen}
        onClose={() => dispatch({ type: 'TOGGLE_DIALOG' })}
        columns={columns}
        onApply={reorderColumns}
        onPreview={reorderColumns}
        defaultOrder={DEFAULT_COLUMN_ORDER}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
