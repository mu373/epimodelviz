import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  isArc: boolean;
  onToggleArc: () => void;
  onClose: () => void;
}

export default function EdgeContextMenu({ x, y, isArc, onToggleArc, onClose }: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}
      className="min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-md"
    >
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
        onClick={() => {
          onToggleArc();
          onClose();
        }}
      >
        {isArc ? 'Straighten edge' : 'Curve edge'}
      </button>
    </div>,
    document.body,
  );
}
