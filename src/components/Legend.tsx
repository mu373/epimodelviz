export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs z-10">
      <div className="font-medium text-gray-900 mb-2">Transition Types</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <svg width="30" height="2">
            <line x1="0" y1="1" x2="30" y2="1" stroke="#6b7280" strokeWidth="2" />
          </svg>
          <span className="text-gray-600">Spontaneous</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="2">
            <line x1="0" y1="1" x2="30" y2="1" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" />
          </svg>
          <span className="text-gray-600">Mediated</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="2">
            <line x1="0" y1="1" x2="30" y2="1" stroke="#644391" strokeWidth="3" />
          </svg>
          <span className="text-gray-600">Vaccination</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="10">
            <rect x="0" y="3" width="20" height="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" rx="1" />
            <defs>
              <marker id="arrow-legend" viewBox="0 -2 4 4" refX="2" refY="0" markerWidth="3" markerHeight="3" orient="auto">
                <path d="M0,-2L4,0L0,2" fill="#f59e0b" />
              </marker>
            </defs>
            <line x1="10" y1="3" x2="10" y2="0" stroke="#f59e0b" strokeWidth="1" markerEnd="url(#arrow-legend)" />
          </svg>
          <span className="text-gray-600">Mediator influence</span>
        </div>
      </div>
    </div>
  );
}
