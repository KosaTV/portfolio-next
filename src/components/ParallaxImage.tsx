"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform vec2 uMouse;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float depth = texture2D(uDepth, vUv).r;

    // Displace UV based on depth and mouse position
    float displacement = depth * 0.04;
    vec2 displaced = vUv + uMouse * displacement;

    vec4 color = texture2D(uImage, displaced);

    // Subtle edge vignette
    float vignette = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x)
                   * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

    color.a *= vignette;
    color.rgb *= 0.85;

    gl_FragColor = color;
  }
`;

function DepthPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));

  const [image, depth] = useTexture(["/jacob.png", "/jacob-depth.png"]);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uImage: { value: image },
      uDepth: { value: depth },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
    }),
    [image, depth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    // Smooth lerp toward target
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * delta * 3;
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * delta * 3;
    uniforms.uMouse.value.set(mouseCurrent.current.x, mouseCurrent.current.y);
    uniforms.uTime.value += delta;
  });

  // Match image aspect ratio
  const src = image.image as HTMLImageElement;
  const imageAspect = src.width / src.height;
  const planeHeight = viewport.height * 0.9;
  const planeWidth = planeHeight * imageAspect;

  return (
    <mesh
      ref={meshRef}
      position={[-(viewport.width / 2) + planeWidth * 0.45, 0, 0]}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export default function ParallaxImage() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[0.2] md:opacity-[0.25]">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <DepthPlane />
      </Canvas>
    </div>
  );
}
