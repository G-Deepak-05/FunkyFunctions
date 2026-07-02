import * as Tone from 'tone';
import * as math from 'mathjs';
import { analyzeEquation } from '../utils/equationAnalyzer';

export class SoundEngine {
  private synth: any;
  private kick: Tone.MembraneSynth;
  private hihat: Tone.MetalSynth;

  private delay: Tone.FeedbackDelay;
  private reverb: Tone.Reverb;
  private fft: Tone.FFT;
  private analyser: Tone.Analyser;
  private sequence: Tone.Sequence | null = null;
  private drumSequence: Tone.Sequence | null = null;
  private waveformPlayer: Tone.Player | null = null;
  private waveformInterval: number | null = null;
  private currentScale: string[] = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

  private isArpMode: boolean = false;
  private isIntenseBeat: boolean = false;

  constructor() {
    this.delay = new Tone.FeedbackDelay("8n", 0.4);
    this.reverb = new Tone.Reverb({ decay: 4, wet: 0.3 });
    this.fft = new Tone.FFT(32);
    this.analyser = new Tone.Analyser("waveform", 128);

    this.synth = new Tone.PolySynth(Tone.Synth).connect(this.delay);
    
    // Drum Machine
    this.kick = new Tone.MembraneSynth({
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
      octaves: 3,
      pitchDecay: 0.05,
    }).connect(this.delay);
    // Percussion
    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -20,
    }).connect(this.delay).toDestination();
    this.hihat.frequency.value = 200;

    this.delay.connect(this.reverb);
    this.reverb.toDestination();
    
    // Connect all to FFT/Analyser for visualizer
    this.synth.connect(this.fft);
    this.synth.connect(this.analyser);
    this.kick.connect(this.fft);
    this.hihat.connect(this.fft);

    this.synth.toDestination();
    this.kick.toDestination();
    this.hihat.toDestination();
  }

  public async start() {
    await Tone.start();
    Tone.Transport.start();
  }

  public stop() {
    this.clearSequence();
    this.synth.releaseAll();
    Tone.Transport.stop();
  }

  private clearSequence() {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }
    if (this.drumSequence) {
      this.drumSequence.stop();
      this.drumSequence.dispose();
      this.drumSequence = null;
    }
    if (this.waveformPlayer) {
      this.waveformPlayer.stop();
      this.waveformPlayer.dispose();
      this.waveformPlayer = null;
    }
    if (this.waveformInterval) {
      window.clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }
  }

  public setBPM(bpm: number) {
    Tone.Transport.bpm.value = bpm;
  }

  public setVolume(volume: number) {
    // Convert 0-100 to decibels. Tone.Destination.volume goes from ~ -60 to 0
    if (volume <= 0) {
      Tone.Destination.volume.value = -Infinity;
    } else {
      // Map 1-100 to -40 to 0
      const decibels = (volume / 100) * 40 - 40;
      Tone.Destination.volume.value = decibels;
    }
  }

  public getFFT() {
    return this.fft.getValue();
  }

  public playEquation(equation: string, onStep?: (step: number) => void, audioMode: 'sequencer' | 'waveform' = 'sequencer', parameters: Record<string, number> = {}) {
    this.clearSequence(); // Stop any existing sequence, keep transport running
    
    if (!equation || equation.trim() === '') return;
    const info = analyzeEquation(equation);
    if (info.type === 'invalid') return;

    let compiled: math.EvalFunction;
    try {
      const node = math.parse(info.parsedExpr);
      compiled = node.compile();
    } catch (e) {
      console.warn("Invalid equation for audio");
      return;
    }

    if (audioMode === 'waveform') {
      const duration = 2; // 2 seconds buffer
      const sampleRate = Tone.context.sampleRate;
      const buffer = Tone.context.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        try {
          const val = compiled.evaluate({ x: t, t: t, ...parameters });
          if (typeof val === 'number' && isFinite(val)) {
            // Soft clip the audio between -1 and 1
            channelData[i] = Math.max(-1, Math.min(1, val));
          } else {
            channelData[i] = 0;
          }
        } catch (e) {
          channelData[i] = 0;
        }
      }

      this.waveformPlayer = new Tone.Player(buffer).connect(this.fft).connect(this.analyser).toDestination();
      this.waveformPlayer.loop = true;
      this.waveformPlayer.start(0);

      // Simulate a progress bar for the visualizer
      if (onStep) {
        let step = 0;
        this.waveformInterval = window.setInterval(() => {
          onStep(step % 32);
          step++;
        }, 100);
      }
      return;
    }

    const eq = equation.toLowerCase();
    
    // Mode Detection
    this.isArpMode = info.type === 'implicit' || info.type === 'recurrence';
    this.isIntenseBeat = eq.includes('^2') || eq.includes('^3') || eq.includes('tan') || info.type === 'recurrence';

    let synthType: any = Tone.Synth;
    let synthOptions: any = {};
    
    if (eq.includes('sin') || eq.includes('cos')) {
      synthType = Tone.FMSynth;
      synthOptions = {
        harmonicity: 3,
        modulationIndex: 3.5,
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 1.5 }
      };
      this.currentScale = ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5']; // Dorian
    } else if (eq.includes('^2') || eq.includes('^3') || eq.includes('x*x') || eq.includes('x*x*x')) {
      synthType = Tone.Synth;
      synthOptions = {
        oscillator: { type: 'square8' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.1 }
      };
      this.currentScale = ['C4', 'Eb4', 'F4', 'Gb4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5', 'Gb5']; // Minor Blues
    } else if (eq.includes('tan')) {
      synthType = Tone.AMSynth;
      synthOptions = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.5 }
      };
      this.currentScale = ['C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4']; // Chromatic
    } else if (eq.includes('sqrt') || eq.includes('log')) {
      synthType = Tone.Synth;
      synthOptions = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 1.5, sustain: 0, release: 0.1 }
      };
      this.currentScale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']; // Major
    } else {
      this.currentScale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5']; // Pentatonic
    }

    if (this.synth) {
       this.synth.dispose();
    }
    this.synth = new Tone.PolySynth(synthType, synthOptions).connect(this.delay);
    this.synth.connect(this.fft);
    this.synth.connect(this.analyser);
    this.synth.toDestination();

    const minX = -10;
    const maxX = 10;
    const steps = 32;
    const stepSize = (maxX - minX) / steps;
    
    const minY = -10;
    const maxY = 10;
    const ySteps = 50;
    const yStepSize = (maxY - minY) / ySteps;

    const sequenceEvents: { notes: string[] | string | null, index: number, duration: string, velocity: number }[] = [];
    
    // Variables for analyzing the curve for drum patterns
    let zeroCrossings = 0;
    let prevY = 0;

    for (let i = 0; i < steps; i++) {
      const x = minX + i * stepSize;
      
      if (info.type === 'implicit') {
        let prevV = 0;
        const currentChord: string[] = [];
        for (let j = 0; j <= ySteps; j++) {
          const y = minY + j * yStepSize;
          try {
             const v = compiled.evaluate({ x, y, ...parameters });
             if (typeof v === 'number' && isFinite(v)) {
               if (prevV !== 0 && (v * prevV <= 0)) {
                  currentChord.push(this.mapYToNote(y));
               }
               prevV = v;
             } else {
               prevV = 0;
             }
          } catch(e) { prevV = 0; }
        }
        if (currentChord.length > 0) {
           sequenceEvents.push({ notes: [...new Set(currentChord)], index: i, duration: "16n", velocity: 0.7 });
        } else {
           sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
        }
      } else if (info.type === 'parametric') {
        const t = (i / steps) * Math.PI * 2;
        try {
          const res = compiled.evaluate({ t, ...parameters });
          const arr = res.toArray ? res.toArray() : res;
          if (Array.isArray(arr) && arr.length >= 2) {
            const y = arr[1];
            if (isFinite(y)) {
              sequenceEvents.push({ notes: this.mapYToNote(y), index: i, duration: "16n", velocity: 0.7 });
            } else {
              sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
            }
          } else {
            sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
          }
        } catch(e) { sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 }); }
      } else if (info.type === 'recurrence') {
        const n = i;
        let state = parameters.x0 !== undefined ? parameters.x0 : 0.5;
        for(let iter=0; iter<=n; iter++) {
          try { state = compiled.evaluate({ n: iter, x: () => state, y: () => state, ...parameters }); } catch(e) {}
        }
        if (isFinite(state)) {
          sequenceEvents.push({ notes: this.mapYToNote(state), index: i, duration: "16n", velocity: 0.7 });
        } else {
          sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
        }
      } else {
        try {
          const y = compiled.evaluate({ x, t: x, ...parameters });
          if (typeof y === 'number' && isFinite(y)) {
            // Calculate slope (derivative) numerically
            const deltaX = 0.01;
            const nextY = compiled.evaluate({ x: x + deltaX, t: x + deltaX, ...parameters });
            const slope = Math.abs((nextY - y) / deltaX);
            
            // Map slope to rhythm/duration
            let duration = "16n";
            if (slope < 0.5) duration = "4n"; // Flat curve = long note
            else if (slope < 2) duration = "8n"; // Medium curve = medium note
            else if (slope > 10) duration = "32n"; // Steep curve = fast arpeggio note
            
            // Map Y and Slope to Velocity
            const velocity = Math.max(0.3, Math.min(1.0, 0.5 + (Math.abs(y)/20) + (slope/40)));
            
            if (prevY !== 0 && (prevY * y <= 0)) zeroCrossings++;
            prevY = y;
            
            sequenceEvents.push({ notes: this.mapYToNote(y, i, steps), index: i, duration, velocity });
          } else {
            sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
          }
        } catch (e) {
          sequenceEvents.push({ notes: null, index: i, duration: "16n", velocity: 0.7 });
        }
      }
    }

    this.sequence = new Tone.Sequence((time, event) => {
      if (event.notes) {
        if (this.isArpMode && Array.isArray(event.notes) && event.notes.length > 1) {
          const stepTime = Tone.Time("32n").toSeconds();
          event.notes.forEach((note, idx) => {
            this.synth.triggerAttackRelease(note, "32n", time + idx * stepTime, event.velocity);
          });
        } else {
          this.synth.triggerAttackRelease(event.notes, event.duration, time, event.velocity);
        }
      }

      if (onStep) {
        Tone.Draw.schedule(() => {
          onStep(event.index);
        }, time);
      }
    }, sequenceEvents, "8n");

    this.drumSequence = new Tone.Sequence((time, idx) => {
      const isChill = zeroCrossings < 5;
      const isFrantic = zeroCrossings > 15;
      
      // Dynamic Kick
      if (idx % (isChill ? 8 : 4) === 0) {
        this.kick.triggerAttackRelease("C2", "8n", time, 0.4);
      } else if (isFrantic && idx % 4 === 2) {
        // Breakbeat kick
        this.kick.triggerAttackRelease("C2", "16n", time, 0.3);
      }
      
      // Dynamic Hi-hat
      if (this.isIntenseBeat || isFrantic) {
        this.hihat.triggerAttackRelease("16n", time, idx % 4 === 0 ? 0.6 : 0.3);
      } else if (isChill) {
        if (idx % 8 === 4) {
          this.hihat.triggerAttackRelease("16n", time, 0.5);
        }
      } else {
        if (idx % 2 !== 0) {
          this.hihat.triggerAttackRelease("16n", time, 0.3);
        }
      }
    }, Array.from({length: steps}, (_, i) => i), "8n");

    this.sequence.start(0);
    this.drumSequence.start(0);
  }
  private mapYToNote(y: number, index: number = 0, totalSteps: number = 32): string {
    const clampedY = Math.max(-10, Math.min(10, y));
    const normalizedY = (clampedY + 10) / 20; // 0 to 1
    
    // Choose octave based on Y height (lower Y = lower octave)
    const octave = Math.floor(normalizedY * 3) + 3; // Octaves 3, 4, 5
    
    // Choose note in scale based on position in measure + Y value
    const scaleIndex = Math.floor((normalizedY + (index / totalSteps)) * 10) % this.currentScale.length;
    const note = this.currentScale[scaleIndex].replace(/\d/, octave.toString());
    
    return note;
  }
}

export const soundEngine = new SoundEngine();
