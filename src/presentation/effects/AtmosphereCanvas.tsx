"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function CelestialOrb() {
  const mesh = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.z += delta * 0.035;
  });

  return (
    <mesh ref={mesh} rotation={[0.85, 0, 0.2]}>
      <torusGeometry args={[2.2, 0.015, 8, 96]} />
      <meshBasicMaterial color="#E6C57A" transparent opacity={0.42} />
    </mesh>
  );
}

export default function AtmosphereCanvas() {
  return (
    <Canvas
      className="atmosphere-canvas"
      camera={{ position: [0, 0, 6], fov: 45 }}
      aria-hidden
    >
      <CelestialOrb />
    </Canvas>
  );
}
