import { useState } from 'react';
import { Play, Square, Settings, Share2, Volume2, VolumeX, Activity, Music } from 'lucide-react';
import * as Tone from 'tone';
import EquationInput from './components/EquationInput';
import GraphCanvas from './components/GraphCanvas';
import AudioVisualizer from './components/AudioVisualizer';
import MemeOverlay from './components/MemeOverlay';
import EquationDisplay from './components/EquationDisplay';
import ParametersPanel from './components/ParametersPanel';
import { useAudioEngine } from './hooks/useAudioEngine';
import { analyzeEquation } from './utils/equationAnalyzer';

function App() {
  const [equation, setEquation] = useState('sin(x)');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(-1);
  const [audioMode, setAudioMode] = useState<'sequencer' | 'waveform'>('sequencer');
  const [parameters, setParameters] = useState<Record<string, number>>({});

  useAudioEngine(equation, isPlaying, isMuted, audioMode, (step) => {
    setProgress(step);
  }, parameters);

  const togglePlayback = async () => {
    if (!isPlaying) {
      setProgress(-1);
      await Tone.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleEquationChange = (newEquation: string) => {
    const eq = newEquation || "";
    setEquation(eq); 
    setProgress(-1);
    setError(null);
    
    // Extract parameters
    const info = analyzeEquation(eq);
    if (info.parameters && info.parameters.length > 0) {
      setParameters(prev => {
        const next = { ...prev };
        info.parameters.forEach((p: string) => {
          if (next[p] === undefined) {
            next[p] = p === 'x0' ? 0.5 : 1.0; // sane defaults
          }
        });
        return next;
      });
    }
  };

  const handleParameterChange = (param: string, value: number) => {
    setParameters(prev => ({ ...prev, [param]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <span className="font-serif font-bold italic text-white text-sm">f(x)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Funky Functions
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAudioMode(audioMode === 'sequencer' ? 'waveform' : 'sequencer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm font-medium border ${
              audioMode === 'waveform' 
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
            }`}
            title={audioMode === 'waveform' ? "DSP Waveform Mode" : "Sequencer Mode"}
          >
            {audioMode === 'waveform' ? <Activity size={16} /> : <Music size={16} />}
            <span className="hidden md:inline">{audioMode === 'waveform' ? 'Waveform' : 'Sequencer'}</span>
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded hover:bg-[var(--color-card)] transition-colors text-slate-500 hover:text-slate-800"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button className="p-2 rounded hover:bg-[var(--color-card)] transition-colors text-slate-500 hover:text-slate-800" title="Settings">
            <Settings size={20} />
          </button>
          <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded bg-white hover:bg-slate-50 transition-colors border border-[var(--color-border)] text-sm font-medium text-slate-700 shadow-sm">
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <MemeOverlay equation={equation} />
        
        {/* Background Visualizer (3D) - highly transparent for light mode */}
        <div className="absolute inset-0 z-0 opacity-15 mix-blend-multiply">
          <AudioVisualizer isPlaying={isPlaying} />
        </div>

        {/* Graph Overlay (2D) */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <GraphCanvas equation={equation} isPlaying={isPlaying} progress={progress} audioMode={audioMode} parameters={parameters} />
        </div>

        <EquationDisplay equation={equation} />

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex flex-col items-center justify-end pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm text-center shadow-sm backdrop-blur-md">
                {error}
              </div>
            )}
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-[var(--color-card)]/80 backdrop-blur-xl p-4 rounded-2xl border border-[var(--color-border)] shadow-2xl">
              
              <button 
                onClick={togglePlayback}
                className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                  isPlaying 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isPlaying ? <Square size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
              </button>
              
              <div className="flex-1">
                <EquationInput 
                  value={equation} 
                  onChange={handleEquationChange}
                  onSubmit={async () => {
                    await Tone.start();
                    if (!isPlaying) setIsPlaying(true);
                  }}
                />
              </div>
              
            </div>
            
            <ParametersPanel 
              parameters={parameters}
              onChange={handleParameterChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
