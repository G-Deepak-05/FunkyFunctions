import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

const MinimalisticParticles: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 1000;
  const dummy = new THREE.Object3D();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Rotate the whole system slowly
    meshRef.current.rotation.y = state.clock.elapsedTime * (isPlaying ? 0.2 : 0.05);
    meshRef.current.rotation.x = state.clock.elapsedTime * (isPlaying ? 0.1 : 0.02);
    
    if (isPlaying) {
      const fftData = soundEngine.getFFT();
      
      let i = 0;
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          for (let z = 0; z < 10; z++) {
            // Pick an FFT bin based on distance from center or just linear index
            // FFT returns values from -100 to 0 (dB)
            const fftIndex = Math.floor((i / count) * fftData.length);
            const rawFft = fftData[fftIndex] as number;
            // Normalize roughly to 0-1 (assuming range is -100 to 0)
            const normalized = Math.max(0, (rawFft + 100) / 100);
            
            const scale = 0.5 + normalized * 2.0;

            dummy.position.set(
              (x - 5) * 2 + (Math.random() - 0.5) * 0.1,
              (y - 5) * 2 + (Math.random() - 0.5) * 0.1,
              (z - 5) * 2 + (Math.random() - 0.5) * 0.1
            );
            
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            i++;
          }
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Create a minimal grid/cube of particles
  React.useEffect(() => {
    if (!meshRef.current) return;
    
    let i = 0;
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
          dummy.position.set(
            (x - 5) * 2 + (Math.random() - 0.5),
            (y - 5) * 2 + (Math.random() - 0.5),
            (z - 5) * 2 + (Math.random() - 0.5)
          );
          
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
          i++;
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={isPlaying ? "#2563eb" : "#94a3b8"} transparent opacity={0.4} />
    </instancedMesh>
  );
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  return (
    <div className="w-full h-full absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <fog attach="fog" args={['#fdfdfc', 5, 25]} />
        <MinimalisticParticles isPlaying={isPlaying} />
      </Canvas>
    </div>
  );
};

export default AudioVisualizer;
