import React from 'react';

interface ParametersPanelProps {
  parameters: Record<string, number>;
  onChange: (param: string, value: number) => void;
}

const ParametersPanel: React.FC<ParametersPanelProps> = ({ parameters, onChange }) => {
  const paramsList = Object.keys(parameters);

  if (paramsList.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl border border-[var(--color-border)] shadow-md p-4 mt-2">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paramsList.map((param) => (
          <div key={param} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <label className="font-serif font-bold text-slate-800 w-8 text-center">{param}</label>
            <input
              type="range"
              min={-10}
              max={10}
              step={0.01}
              value={parameters[param]}
              onChange={(e) => onChange(param, parseFloat(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <input
              type="number"
              value={parameters[param]}
              onChange={(e) => onChange(param, parseFloat(e.target.value))}
              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-800 font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParametersPanel;
