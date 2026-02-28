'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import { Color, AdditiveBlending, BackSide } from 'three';

const GlobeVisual = () => {
  const globeRef = useRef<any>();

  useFrame(({ clock }) => {
    if (globeRef.current) {
      // Slow, constant rotation
      globeRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  // Texture from a reliable source with permissive CORS
  const [earthTexture] = useTexture(['https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg']);

  // Using HSL values from globals.css for primary color: 160 80% 40%
  const primaryColor = new Color("hsl(160, 80%, 40%)");

  return (
    <group scale={3.8} ref={globeRef}>
      {/* Globe with texture */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial 
          map={earthTexture} 
          roughness={0.8} 
          metalness={0.2} 
        />
      </Sphere>
      
      {/* Atmosphere effect */}
      <Sphere args={[1.04, 64, 64]}>
        <meshStandardMaterial
          color={primaryColor}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          opacity={0.3}
        />
      </Sphere>
    </group>
  );
};

export function Globe() {
  return (
    <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <pointLight 
                color="hsl(160, 80%, 80%)" 
                position={[10, 5, 10]} 
                intensity={40.0}
            />
            <GlobeVisual />
        </Suspense>
    </Canvas>
  );
}
