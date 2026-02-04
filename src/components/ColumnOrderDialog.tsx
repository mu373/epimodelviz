import { useState, useEffect } from 'react';
import { getCompartmentColor } from '../utils/colorUtils';

interface ColumnOrderDialogProps {
  open: boolean;
  onClose: () => void;
  columns: string[];
  onApply: (newOrder: string[]) => void;
  onPreview: (newOrder: string[]) => void;
  defaultOrder: string[];
}

export default function ColumnOrderDialog({
  open,
  onClose,
  columns,
  onApply,
  onPreview,
  defaultOrder,
}: ColumnOrderDialogProps) {
  const [order, setOrder] = useState<string[]>(columns);

  useEffect(() => {
    setOrder(columns);
  }, [columns]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const move = (index: number, direction: -1 | 1) => {
    const newOrder = [...order];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setOrder(newOrder);
    onPreview(newOrder);
  };

  const reset = () => {
    const filtered = defaultOrder.filter((t) => columns.includes(t));
    columns.forEach((t) => {
      if (!filtered.includes(t)) filtered.push(t);
    });
    setOrder(filtered);
    onPreview(filtered);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Column Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">Use up/down arrows to reorder columns:</p>
          <div className="space-y-2">
            {order.map((type, index) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getCompartmentColor(type) }} />
                  <span className="font-medium">{type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={() => { onApply(order); onClose(); }}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
