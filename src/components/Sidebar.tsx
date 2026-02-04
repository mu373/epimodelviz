import type { ModelStats } from '../types/model';

interface DisplayOptions {
  showSpontaneous: boolean;
  showMediated: boolean;
  showVaccination: boolean;
  showLabels: boolean;
  showMediators: boolean;
}

interface SidebarProps {
  yamlText: string;
  onYamlChange: (text: string) => void;
  onVisualize: () => void;
  onLoadSample: () => void;
  displayOptions: DisplayOptions;
  onDisplayOptionChange: (key: keyof DisplayOptions, value: boolean) => void;
  stats: ModelStats | null;
  error: string | null;
}

export default function Sidebar({
  yamlText,
  onYamlChange,
  onVisualize,
  onLoadSample,
  displayOptions,
  onDisplayOptionChange,
  stats,
  error,
}: SidebarProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      onYamlChange(text);
    };
    reader.readAsText(file);
  };

  const checkboxes: { key: keyof DisplayOptions; label: string }[] = [
    { key: 'showSpontaneous', label: 'Show spontaneous transitions' },
    { key: 'showMediated', label: 'Show mediated transitions' },
    { key: 'showVaccination', label: 'Show vaccination transitions' },
    { key: 'showLabels', label: 'Show rate labels' },
    { key: 'showMediators', label: 'Show mediator connections' },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto flex-shrink-0">
      {/* File Input */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Input YAML</h3>
        <label className="block">
          <input type="file" accept=".yaml,.yml" className="hidden" onChange={handleFileUpload} />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">Click to upload YAML file</p>
          </div>
        </label>
      </div>

      {/* Text Input */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Or paste YAML directly</h3>
        <textarea
          className="w-full h-48 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Paste YAML content here..."
          value={yamlText}
          onChange={(e) => onYamlChange(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={onVisualize}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Visualize
          </button>
          <button
            onClick={onLoadSample}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Load Sample
          </button>
        </div>
      </div>

      {/* Display Options */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Display Options</h3>
        <div className="space-y-2">
          {checkboxes.map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={displayOptions[key]}
                onChange={(e) => onDisplayOptionChange(key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Model Statistics</h3>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="text-gray-600">
            Compartments: <span className="font-medium text-gray-900">{stats?.compartments ?? '-'}</span>
          </div>
          <div className="text-gray-600">
            Transitions: <span className="font-medium text-gray-900">{stats?.transitions ?? '-'}</span>
          </div>
          <div className="text-gray-600">
            Parameters: <span className="font-medium text-gray-900">{stats?.parameters ?? '-'}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
