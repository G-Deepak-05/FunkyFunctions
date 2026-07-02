import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface EquationInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

const EquationInput: React.FC<EquationInputProps> = ({ value, onChange, onSubmit }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className={`relative flex items-center transition-all duration-300 rounded-lg bg-white border shadow-sm ${
      isFocused ? 'border-[var(--color-primary)] ring-2 ring-blue-500/20' : 'border-[var(--color-border)]'
    }`}>
      <div className="pl-4 pr-2 py-3 text-slate-400">
        <Sparkles size={20} className={isFocused ? 'text-[var(--color-primary)]' : ''} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Type an equation, e.g., sin(x)"
        className="w-full bg-transparent border-none outline-none text-slate-900 text-lg md:text-xl py-3 pr-6 font-mono placeholder:text-slate-400"
        spellCheck={false}
      />
    </div>
  );
};

export default EquationInput;
