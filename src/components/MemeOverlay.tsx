import React from 'react';

interface MemeOverlayProps {
  equation: string;
}

const MemeOverlay: React.FC<MemeOverlayProps> = ({ equation }) => {
  if (!equation || equation.trim() === '') {
    return null;
  }

  if (equation.replace(/\s/g, '') === '1/0') {
    return (
      <div className="absolute inset-0 z-50 bg-blue-600 flex flex-col items-center justify-center text-white font-mono p-8 text-center" style={{ animation: 'pulse 0.1s infinite' }}>
        <h1 className="text-6xl font-bold mb-4">:(</h1>
        <p className="text-xl max-w-2xl">
          Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
        </p>
        <p className="mt-8 text-sm opacity-80">Stop code: DIVIDE_BY_ZERO_EXCEPTION</p>
      </div>
    );
  }
  
  if (equation.replace(/\s/g, '') === '42') {
    return (
       <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 text-green-400 font-mono p-8 text-2xl border border-green-500 rounded-lg animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)] backdrop-blur-sm">
            THE ANSWER TO THE ULTIMATE QUESTION OF LIFE, THE UNIVERSE, AND EVERYTHING
          </div>
       </div>
    );
  }
  
  return null;
};

export default MemeOverlay;
