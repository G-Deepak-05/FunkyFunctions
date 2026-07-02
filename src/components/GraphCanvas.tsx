import React, { useEffect, useRef } from 'react';
import * as math from 'mathjs';
import { analyzeEquation } from '../utils/equationAnalyzer';

interface GraphCanvasProps {
  equation: string;
  isPlaying: boolean;
  progress?: number;
  audioMode?: 'sequencer' | 'waveform';
  parameters?: Record<string, number>;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ equation, isPlaying, progress, audioMode, parameters = {} }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Viewport settings
    const minX = audioMode === 'waveform' ? 0 : -10;
    const maxX = audioMode === 'waveform' ? 0.05 : 10;
    const container = canvas.parentElement;
    if (!canvas || !container) return;

    // Handle resize
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawGraph();
    };

    const drawGraph = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      
      // Math coordinate system limits
      const minX = -10;
      const maxX = 10;
      const minY = -10;
      const maxY = 10;
      
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;

      // Calculate progress ratio
      const ratio = isPlaying && progress !== undefined && progress !== -1 ? (progress + 1) / 32 : 1.0;
      const maxDrawX = minX + ratio * rangeX;
      const maxDrawT = ratio * (Math.PI * 10);
      const maxDrawN = ratio * Math.max(100, maxX);

      // Helper to map math coordinates to canvas pixels
      const toCanvasX = (x: number) => ((x - minX) / rangeX) * width;
      const toCanvasY = (y: number) => height - ((y - minY) / rangeY) * height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Grid Lines
      ctx.beginPath();
      // Minor grid lines
      ctx.strokeStyle = '#e2e8f0'; // light blue-gray
      ctx.lineWidth = 1;
      
      const gridStepX = rangeX / 100; // 0.2 step for 20 units (-10 to 10)
      const gridStepY = rangeY / 100;
      
      for (let x = minX; x <= maxX; x += gridStepX) {
        ctx.moveTo(toCanvasX(x), 0);
        ctx.lineTo(toCanvasX(x), height);
      }
      for (let y = minY; y <= maxY; y += gridStepY) {
        ctx.moveTo(0, toCanvasY(y));
        ctx.lineTo(width, toCanvasY(y));
      }
      ctx.stroke();

      // Major grid lines
      ctx.beginPath();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      for (let x = minX; x <= maxX; x += 1) {
        ctx.moveTo(toCanvasX(x), 0);
        ctx.lineTo(toCanvasX(x), height);
      }
      for (let y = minY; y <= maxY; y += 1) {
        ctx.moveTo(0, toCanvasY(y));
        ctx.lineTo(width, toCanvasY(y));
      }
      ctx.stroke();

      // Draw Main Axes
      ctx.beginPath();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      // X axis
      ctx.moveTo(0, toCanvasY(0));
      ctx.lineTo(width, toCanvasY(0));
      // Y axis
      ctx.moveTo(toCanvasX(0), 0);
      ctx.lineTo(toCanvasX(0), height);
      ctx.stroke();
      
      // Draw Numerical Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = minX; x <= maxX; x += 2) {
        if (x !== 0) {
          ctx.fillText(x.toString(), toCanvasX(x), toCanvasY(0) + 6);
        }
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = minY; y <= maxY; y += 2) {
        if (y !== 0) {
          ctx.fillText(y.toString(), toCanvasX(0) - 6, toCanvasY(y));
        }
      }

      if (!equation || equation.trim() === '') {
        return;
      }

      // Parse and plot equation
      try {
        const info = analyzeEquation(equation);
        if (info.type === 'invalid') return;

        const node = math.parse(info.parsedExpr);
        const compiled = node.compile();

        ctx.beginPath();
        ctx.strokeStyle = isPlaying ? '#2563eb' : '#64748b'; // Math blue ink or slate
        ctx.fillStyle = isPlaying ? '#2563eb' : '#64748b';
        ctx.lineWidth = 2; // Sharp crisp line
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (info.type === 'implicit') {
          // Grid based evaluation (sign change detection)
          const step = rangeX / (width / 2); // Evaluate every 2 pixels
          const yStep = rangeY / (height / 2);
          
          let prevRow: number[] = [];
          let currRow: number[] = [];

          for (let y = maxY; y >= minY; y -= yStep) {
            let prevV = 0;
            for (let x = minX; x <= maxDrawX; x += step) {
              try {
                const v = compiled.evaluate({ x, y, ...parameters });
                if (typeof v === 'number' && !isNaN(v) && isFinite(v)) {
                  currRow.push(v);
                  
                  const colIndex = currRow.length - 1;
                  const signChangedX = prevV !== 0 && (v * prevV <= 0);
                  const signChangedY = prevRow.length > 0 && (v * prevRow[colIndex] <= 0);
                  
                  if (signChangedX || signChangedY) {
                    const cx = toCanvasX(x);
                    const cy = toCanvasY(y);
                    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
                  }
                  prevV = v;
                } else {
                  currRow.push(0);
                  prevV = 0;
                }
              } catch (e) {
                 currRow.push(0);
                 prevV = 0;
              }
            }
            prevRow = currRow;
            currRow = [];
          }
        } else if (info.type === 'parametric') {
          let firstPoint = true;
          const tStep = 0.05;
          for (let t = 0; t <= maxDrawT; t += tStep) {
            try {
              const res = compiled.evaluate({ t, ...parameters });
              const arr = res.toArray ? res.toArray() : res;
              if (Array.isArray(arr) && arr.length >= 2) {
                const x = arr[0];
                const y = arr[1];
                if (isFinite(x) && isFinite(y)) {
                  const cx = toCanvasX(x);
                  const cy = toCanvasY(y);
                  if (firstPoint) {
                    ctx.moveTo(cx, cy);
                    firstPoint = false;
                  } else {
                    ctx.lineTo(cx, cy);
                  }
                }
              }
            } catch(e) { /* ignore */ }
          }
          ctx.stroke();
        } else if (info.type === 'recurrence') {
          let state = parameters.x0 !== undefined ? parameters.x0 : 0.5;
          let firstPoint = true;
          for (let n = 0; n <= maxDrawN; n++) {
             try {
                state = compiled.evaluate({ n, x: () => state, y: () => state, ...parameters });
                if (isFinite(state)) {
                  if (n >= minX && n <= maxX) {
                    const cx = toCanvasX(n);
                    const cy = toCanvasY(state);
                    if (firstPoint) {
                      ctx.moveTo(cx, cy);
                      firstPoint = false;
                    } else {
                      ctx.lineTo(cx, cy);
                    }
                  }
                } else {
                  firstPoint = true;
                }
             } catch(e) { firstPoint = true; }
          }
          ctx.stroke();
        } else {
          // Explicit function drawing
          let firstPoint = true;
          const step = rangeX / (width * 2); // 2 points per pixel

          for (let x = minX; x <= maxDrawX; x += step) {
            try {
              const y = compiled.evaluate({ x, t: x, ...parameters });
              if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
                const cx = toCanvasX(x);
                const cy = toCanvasY(y);
                
                if (firstPoint) {
                  ctx.moveTo(cx, cy);
                  firstPoint = false;
                } else {
                  ctx.lineTo(cx, cy);
                }
              } else {
                firstPoint = true; // Break line on undefined/infinity
              }
            } catch (e) {
              firstPoint = true;
            }
          }
          ctx.stroke();
        }
      } catch (e) {
        console.warn("Invalid equation:", e);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial draw

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [equation, isPlaying, progress, audioMode, parameters]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default GraphCanvas;
