import { useEffect, useRef } from 'react';
import { soundEngine } from '../audio/SoundEngine';

export const useAudioEngine = (equation: string, isPlaying: boolean, isMuted: boolean, audioMode: 'sequencer' | 'waveform', onStep: (step: number) => void, parameters: Record<string, number> = {}) => {
  const previousEquation = useRef(equation);
  const previousMode = useRef(audioMode);
  const previousParams = useRef(JSON.stringify(parameters));

  useEffect(() => {
    if (isPlaying && !isMuted) {
      soundEngine.start().then(() => {
        soundEngine.playEquation(equation, onStep, audioMode, parameters);
      });
    } else {
      soundEngine.stop();
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    const paramsStr = JSON.stringify(parameters);
    if (isPlaying && !isMuted && (previousEquation.current !== equation || previousMode.current !== audioMode || previousParams.current !== paramsStr)) {
      soundEngine.playEquation(equation, onStep, audioMode, parameters);
    }
    previousEquation.current = equation;
    previousMode.current = audioMode;
    previousParams.current = paramsStr;
  }, [equation, isPlaying, isMuted, audioMode, parameters]);
  
  return { soundEngine };
};
