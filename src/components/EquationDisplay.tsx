import React, { useMemo, useRef, useEffect } from 'react';
import * as math from 'mathjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { normalizeEquation } from '../utils/equationAnalyzer';

interface EquationDisplayProps {
  equation: string;
}

const EquationDisplay: React.FC<EquationDisplayProps> = ({ equation }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const texString = useMemo(() => {
    if (!equation || equation.trim() === '') return '';
    try {
      const normalized = normalizeEquation(equation);
      
      const hasPrefix = /^[a-zA-Z]\([a-zA-Z]\)\s*=/.test(normalized);
      const pureMath = normalized.replace(/^[a-zA-Z]\([a-zA-Z]\)\s*=/g, '');

      if (pureMath.includes('=')) {
        const parts = pureMath.split('=');
        if (parts.length === 2) {
          const left = math.parse(parts[0]).toTex();
          const right = math.parse(parts[1]).toTex();
          return `${left} = ${right}`;
        }
      }

      const parsed = math.parse(pureMath);
      
      let prefix = '';
      if (hasPrefix) {
        prefix = 'y = ';
      } else if (!pureMath.startsWith('[')) {
        prefix = 'y = ';
      }
      
      return prefix + parsed.toTex();
    } catch (e) {
      return equation;
    }
  }, [equation]);

  useEffect(() => {
    if (containerRef.current && texString) {
      try {
        katex.render(texString, containerRef.current, {
          displayMode: true,
          throwOnError: false
        });
      } catch (e) {
        console.error("KaTeX render error:", e);
      }
    } else if (containerRef.current) {
        containerRef.current.innerHTML = '';
    }
  }, [texString]);

  if (!texString) return null;

  return (
    <div className="absolute top-[65%] left-0 right-0 flex justify-center z-10 pointer-events-none px-4">
      <div 
        className="text-slate-800 transition-all duration-300 font-serif"
        style={{ fontSize: '1.5rem' }}
        ref={containerRef}
      >
      </div>
    </div>
  );
};

export default EquationDisplay;
