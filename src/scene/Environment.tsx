"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { ease, hash, lerp, range, sampleKeys } from "@/animation/math";
import { PHASES, STUDIO_STEPS } from "@/animation/phases";
import { useAnim, useTier } from "./parts/driver";
import { useAssets } from "./context";
import { HERO_ASSEMBLY as H } from "./layout";

/** Iluminação global + nevoeiro + reflexos de estúdio (lightformers, sem HDRs externos). */
export function SceneLighting() {
  const tier = useTier();
  const scene = useThree((s) => s.scene);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.SpotLight>(null);
  const rimA = useRef<THREE.PointLight>(null);
  const rimB = useRef<THREE.PointLight>(null);
  const floorKey = useRef<THREE.SpotLight>(null);

  const fog = useMemo(() => new THREE.FogExp2("#080808", 0.16), []);
  scene.fog = fog;
  scene.background = useMemo(() => new THREE.Color("#080808"), []);

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(H[0] - 0.05, H[1], H[2]);
    return o;
  }, []);

  const fogKeys = useMemo(
    () => [
      { at: 0, v: [0.16] },
      { at: 0.35, v: [0.15] },
      { at: 0.48, v: [0.06] },
      { at: 0.62, v: [0.03] },
      { at: 0.85, v: [0.014] },
      { at: 1, v: [0.012] },
    ],
    [],
  );
  const tmp = useMemo(() => [0], []);

  useAnim((p) => {
    fog.density = sampleKeys(fogKeys, p, tmp)[0];
    const product = 1 - ease.inOutSine(range(p, 0.4, 0.56));
    const room = ease.inOutSine(range(p, STUDIO_STEPS.structure[0], STUDIO_STEPS.finalLight[1]));
    const fin = ease.inOutSine(range(p, STUDIO_STEPS.finalLight[0], STUDIO_STEPS.finalLight[1]));
    const kit = ease.inOutSine(range(p, 0.37, 0.5));
    if (ambient.current) ambient.current.intensity = 0.08 + kit * 0.1 + room * 0.08 + fin * 0.3;
    if (hemi.current) hemi.current.intensity = 0.12 + kit * 0.3 + room * 0.15 + fin * 0.6;
    if (key.current) key.current.intensity = 34 * product;
    if (fill.current) fill.current.intensity = 9 * product;
    // luz superior sobre as peças pousadas no chão (apaga-se quando já levitam)
    if (floorKey.current) floorKey.current.intensity = 16 * (1 - ease.inOutSine(range(p, 0.1, 0.2)));
    const rim = 1 - ease.inOutSine(range(p, PHASES.lights.start + 0.04, PHASES.lights.start + 0.14));
    if (rimA.current) rimA.current.intensity = 5 * rim;
    if (rimB.current) rimB.current.intensity = 3.5 * rim;
    scene.environmentIntensity = lerp(0.7, 0.9, fin);
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.08} color="#fff3e0" />
      <hemisphereLight ref={hemi} args={["#ffe6b5", "#1a1208", 0.12]} />
      <primitive object={target} />
      <spotLight
        ref={key}
        position={[H[0] - 1.3, H[1] + 1.7, H[2] + 1.7]}
        target={target}
        angle={0.55}
        penumbra={1}
        decay={1.8}
        distance={8}
        intensity={34}
        color="#fff4e2"
        castShadow={tier === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
      />
      <spotLight ref={floorKey} position={[H[0] + 0.2, H[1] + 2.6, H[2] + 0.6]} target={target} angle={0.75} penumbra={1} decay={1.6} distance={7} intensity={16} color="#ffe7c0" />
      <spotLight ref={fill} position={[H[0] + 1.7, H[1] + 0.3, H[2] + 1.5]} target={target} angle={0.6} penumbra={1} decay={1.8} distance={8} intensity={9} color="#dfe8ff" />
      <pointLight ref={rimA} position={[H[0] + 0.9, H[1] + 0.55, H[2] - 0.9]} color="#ffb400" distance={4} decay={1.6} intensity={5} />
      <pointLight ref={rimB} position={[H[0] - 1.1, H[1] + 0.3, H[2] - 0.7]} color="#ffcc33" distance={4} decay={1.6} intensity={3.5} />
      <Environment frames={1} resolution={256} environmentIntensity={0.8}>
        <Lightformer form="rect" intensity={2.2} color="#fff3dc" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffc400" position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[1.2, 5, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffb000" position={[6, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[1.2, 5, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[0, 2, 7]} scale={3} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 1, -7]} scale={[10, 2, 1]} />
      </Environment>
    </>
  );
}

/** Chão: reflector com desfoque no nível alto, standard brilhante nos restantes. */
export function Floor() {
  const tier = useTier();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      {tier === "high" ? (
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={2.2}
          mixContrast={1}
          roughness={0.75}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#151311"
          metalness={0.55}
          mirror={0.6}
        />
      ) : (
        <meshStandardMaterial color="#141210" roughness={0.38} metalness={0.3} />
      )}
    </mesh>
  );
}

/** Bokeh dourado de fundo e poeira em suspensão — atmosfera das fases 1–2. */
export function Atmosphere() {
  const tier = useTier();
  const { tex } = useAssets();
  // néons e símbolo V desfocados ao fundo (linguagem visual das renders oficiais)
  const backdrop = useMemo(() => {
    const blurTex = (draw: (g: CanvasRenderingContext2D) => void, w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.filter = "blur(10px)";
      draw(g);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const neon = blurTex((g) => {
      g.fillStyle = "#ffb000";
      g.fillRect(30, 26, 452, 12);
    }, 512, 64);
    const markImg = tex.mark.image as HTMLImageElement;
    const mark = blurTex((g) => g.drawImage(markImg, 40, 40, 176, (176 * markImg.height) / markImg.width), 256, 256);
    const mk = (map: THREE.Texture, color: string) =>
      new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    return {
      items: [
        { m: mk(neon, "#ffffff"), pos: [H[0] - 1.6, H[1] + 1.25, H[2] - 3.2] as [number, number, number], scale: [2.2, 0.28], base: 0.55 },
        { m: mk(neon, "#ffffff"), pos: [H[0] + 2.2, H[1] + 1.55, H[2] - 3.6] as [number, number, number], scale: [1.8, 0.24], base: 0.45 },
        { m: mk(neon, "#ffffff"), pos: [H[0] - 2.4, H[1] + 0.35, H[2] - 3.0] as [number, number, number], scale: [1.4, 0.2], base: 0.35 },
        { m: mk(mark, "#ffffff"), pos: [H[0] + 1.5, H[1] + 0.95, H[2] - 3.4] as [number, number, number], scale: [1.5, 1.5], base: 0.4 },
      ],
    };
  }, [tex.mark]);
  const bokehTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const bokeh = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const m = new THREE.SpriteMaterial({
          map: bokehTex,
          color: new THREE.Color().setHSL(0.11 + hash(i) * 0.04, 1, 0.5 + hash(i + 3) * 0.15),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        });
        return {
          m,
          pos: [H[0] - 2.4 + hash(i + 9) * 5, H[1] + 0.1 + hash(i + 21) * 1.9, H[2] - 2.2 - hash(i + 33) * 2.5] as [number, number, number],
          size: 0.25 + hash(i + 40) * 0.6,
          base: 0.12 + hash(i + 51) * 0.22,
        };
      }),
    [bokehTex],
  );

  const dustCount = tier === "low" ? 80 : 220;
  const dust = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      arr[i * 3] = (hash(i * 3) - 0.5) * 2.6;
      arr[i * 3 + 1] = (hash(i * 3 + 1) - 0.5) * 1.4;
      arr[i * 3 + 2] = (hash(i * 3 + 2) - 0.5) * 2.0;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [dustCount]);
  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffd36b",
        size: 0.008,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const dustRef = useRef<THREE.Points>(null);

  useAnim((p, t) => {
    const fade = 1 - ease.inOutSine(range(p, 0.4, 0.48));
    bokeh.forEach((b, i) => {
      b.m.opacity = b.base * fade * (0.8 + 0.2 * Math.sin(t * 0.4 + i));
    });
    backdrop.items.forEach((b) => (b.m.opacity = b.base * fade));
    dustMat.opacity = 0.75 * fade;
    if (dustRef.current) {
      dustRef.current.rotation.y = t * 0.02;
      dustRef.current.position.y = H[1] + 0.45 + Math.sin(t * 0.15) * 0.03;
      dustRef.current.visible = fade > 0.001;
    }
  });

  return (
    <group>
      {bokeh.map((b, i) => (
        <sprite key={i} material={b.m} position={b.pos} scale={[b.size, b.size, 1]} />
      ))}
      {backdrop.items.map((b, i) => (
        <sprite key={`bd${i}`} material={b.m} position={b.pos} scale={[b.scale[0], b.scale[1], 1]} />
      ))}
      <points ref={dustRef} position={H} geometry={dust} material={dustMat} />
    </group>
  );
}
