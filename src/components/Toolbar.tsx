import { useReactFlow } from '@xyflow/react';
import { exportToSvg } from '../utils/exportUtils';

interface ToolbarProps {
  layout: 'hierarchical' | 'force' | 'circular';
  onLayoutChange: (layout: 'hierarchical' | 'force' | 'circular') => void;
  onColumnOrderClick: () => void;
}

export default function Toolbar({ layout, onLayoutChange, onColumnOrderClick }: ToolbarProps) {
  const { fitView } = useReactFlow();

  return (
    <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as 'hierarchical' | 'force' | 'circular')}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="hierarchical">Hierarchical Layout</option>
          <option value="force">Force-Directed</option>
          <option value="circular">Circular</option>
        </select>
        <button
          onClick={onColumnOrderClick}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Column Order
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Reset View
        </button>
        <button
          onClick={exportToSvg}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Export SVG
        </button>
      </div>
    </div>
  );
}
