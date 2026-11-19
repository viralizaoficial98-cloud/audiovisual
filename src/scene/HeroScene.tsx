"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { QualityTier } from "@/lib/quality";
import { AnimationDriver } from "./parts/driver";
import { SceneAssetsProvider } from "./context";
import { CameraRig } from "./CameraRig";
import { Atmosphere, Floor, SceneLighting } from "./Environment";
import { CinemaCamera } from "./models/CinemaCamera";
import { LightingKit } from "./models/LightingKit";
import { Studio } from "./models/Studio";

type Props = {
  tier: QualityTier;
  active: boolean;
  onReady?: () => void;
};

const DPR: Record<QualityTier, [number, number]> = {
  high: [1, 1.75],
  medium: [1, 1.4],
  low: [0.75, 1.1],
};

/**
 * Raiz WebGL do banner. Toda a cena é procedural (geometria real em Three.js):
 * cada peça da câmara, cada luz e cada elemento do estúdio é um objecto 3D próprio.
 */
export default function HeroScene({ tier, active, onReady }: Props) {
  const [dpr, setDpr] = useState(DPR[tier][1]);
  const post = tier !== "low";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={dpr}
      shadows={tier === "high" ? "soft" : false}
      camera={{ fov: 38, near: 0.03, far: 80, position: [2.2, 1.64, 3.9] }}
      gl={{ antialias: !post, powerPreference: "high-performance", alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-hidden
    >
      <PerformanceMonitor
        bounds={() => [45, 58]}
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(DPR[tier][0], +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(DPR[tier][1], +(d + 0.15).toFixed(2)))}
      />
      <AnimationDriver tier={tier}>
        <Suspense fallback={null}>
          <SceneAssetsProvider>
            <CameraRig parallax={tier !== "low"} />
            <SceneLighting />
            <Floor />
            <Atmosphere />
            <CinemaCamera />
            <LightingKit />
            <Studio />
            <ReadySignal onReady={onReady} />
          </SceneAssetsProvider>
        </Suspense>
        {post && (
          <EffectComposer multisampling={tier === "high" ? 4 : 0} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.95} luminanceSmoothing={0.25} radius={0.7} />
            <Vignette offset={0.28} darkness={0.72} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </AnimationDriver>
    </Canvas>
  );
}

/** Avisa o DOM quando a cena compilou e desenhou o primeiro frame (remove o loader). */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    // pré-compila os shaders para evitar engasgos no primeiro scroll
    // (todos os objectos ficam visíveis durante a compilação: as peças que só aparecem
    // mais tarde na timeline também ficam com o shader pronto)
    const run = async () => {
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      try {
        if ("compileAsync" in gl) await (gl as THREE.WebGLRenderer).compileAsync(scene, camera);
      } catch {
        /* ignora — a compilação acontece no primeiro render */
      }
      hidden.forEach((o) => (o.visible = false));
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && onReady?.()));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onReady]);
  return null;
}
