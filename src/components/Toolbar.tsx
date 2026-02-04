import { useReactFlow } from '@xyflow/react';

interface ToolbarProps {
  layout: 'hierarchical' | 'force' | 'circular';
  onLayoutChange: (layout: 'hierarchical' | 'force' | 'circular') => void;
  onColumnOrderClick: () => void;
  onExport: () => void;
}

export default function Toolbar({ layout, onLayoutChange, onColumnOrderClick, onExport }: ToolbarProps) {
  const { fitView } = useReactFlow();

  return (
    <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as 'hierarchical' | 'force' | 'circular')}
          className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-7 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-no-repeat bg-[length:16px_16px] bg-[position:right_4px_center]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E")` }}
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
          onClick={onExport}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Export SVG
        </button>
      </div>
    </div>
  );
}
