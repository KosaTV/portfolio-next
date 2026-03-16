"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function FloatingTorus({ position, rotation, scale, speed, color }: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = rotation[0] + t * speed * 0.3;
    ref.current.rotation.y = rotation[1] + t * speed * 0.5;
    ref.current.position.y = initialY + Math.sin(t * speed * 0.4) * 0.3;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusGeometry args={[1, 0.3, 16, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        wireframe
        transparent
        opacity={0.25}
      />
    </mesh>
  );
}

function FloatingOctahedron({ position, scale, speed, color }: {
  position: [number, number, number];
  scale: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = t * speed * 0.4;
    ref.current.rotation.z = t * speed * 0.2;
    ref.current.position.y = initialY + Math.sin(t * speed * 0.5 + 1) * 0.4;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        wireframe
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}

function FloatingIcosahedron({ position, scale, speed, color }: {
  position: [number, number, number];
  scale: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * speed * 0.3;
    ref.current.rotation.z = t * speed * 0.15;
    ref.current.position.y = initialY + Math.sin(t * speed * 0.3 + 2) * 0.35;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        wireframe
        transparent
        opacity={0.18}
      />
    </mesh>
  );
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#00f0d4"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  const cyan = "#00f0d4";
  const amber = "#f0a500";

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.3} color={cyan} />
      <pointLight position={[-5, -3, 3]} intensity={0.2} color={amber} />

      <FloatingTorus
        position={[-4.5, 1.5, -3]}
        rotation={[0.5, 0, 0.3]}
        scale={1.2}
        speed={0.6}
        color={cyan}
      />
      <FloatingTorus
        position={[5, -1, -4]}
        rotation={[0, 0.8, 0]}
        scale={0.8}
        speed={0.8}
        color={amber}
      />

      <FloatingOctahedron
        position={[3.5, 2.5, -2]}
        scale={0.7}
        speed={0.5}
        color={cyan}
      />
      <FloatingOctahedron
        position={[-3, -2, -5]}
        scale={1.0}
        speed={0.4}
        color={amber}
      />

      <FloatingIcosahedron
        position={[-1.5, -2.5, -3]}
        scale={0.6}
        speed={0.7}
        color={cyan}
      />
      <FloatingIcosahedron
        position={[6, 0.5, -6]}
        scale={1.1}
        speed={0.35}
        color={amber}
      />

      <ParticleField />
    </>
  );
}

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
