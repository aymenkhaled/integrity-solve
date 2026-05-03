import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

function DistortOrb() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.12;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.08) * 0.15;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[1.4, 64, 64]}>
        <MeshDistortMaterial
          color="#6366f1"
          distort={0.45}
          speed={2}
          metalness={0.85}
          roughness={0.15}
          emissive="#4f46e5"
          emissiveIntensity={0.35}
        />
      </Sphere>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#6366f1" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#8b5cf6" />
      <DistortOrb />
      <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
    </Canvas>
  );
}
