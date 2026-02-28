'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { Color } from 'three';

const GlobeVisual = () => {
  const globeRef = useRef<any>();

  useFrame(({ clock }) => {
    if (globeRef.current) {
      // Slow, constant rotation
      globeRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  // Using HSL values from globals.css for primary color: 160 80% 40%
  const primaryColor = new Color("hsl(160, 80%, 40%)");

  return (
    <Sphere ref={globeRef} args={[1, 64, 64]} scale={2.8}>
      <MeshDistortMaterial
        color={primaryColor}
        attach="material"
        distort={0.35}
        speed={1.2}
        roughness={0.9}
        metalness={0.1}
      />
    </Sphere>
  );
};

export function Globe() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <GlobeVisual />
    </Canvas>
  );
}
