"use client";

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { STUDIO_STEPS } from "@/animation/phases";
import { useAssets } from "../../context";
import { useThree } from "@react-three/fiber";
import { useAnim, useTier } from "../../parts/driver";
import { BeamCone } from "../rigs";
import { SET_FOCUS } from "../../layout";
import { Backdrop } from "./equipment";
import { BACKDROP, KIT_FOCUS, LED_L, LED_PANEL_DY, LED_R, REAIM, SOFTBOX_POSE, ledHeadPos, w } from "./kitLayout";

/** Janelas do acendimento sequencial (fase 5): LED esq., LED dir., ring light, softbox. */
export const POWER = {
  ledL: w(0.75, 0.79),
  ledR: w(0.77, 0.81),
  ring: w(0.8, 0.84),
  softbox: w(0.83, 0.88),
  backdropRise: w(0.74, 0.82),
  backdropGlow: w(0.84, 0.9),
};

const toward = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const on = (p: number, win: readonly [number, number]) => ease.inOutSine(range(p, win[0], win[1]));
const fin = (p: number) => ease.inOutSine(range(p, STUDIO_STEPS.finalLight[0], STUDIO_STEPS.finalLight[1]));

/** Materiais emissivos do kit (cada luz acende no seu momento). */
export function useKitMaterials() {
  const { tex } = useAssets();
  return useMemo(() => {
    const led = () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3226",
        map: tex.ledGrid,
        emissive: new THREE.Color("#fff1d6"),
        emissiveMap: tex.ledGrid,
        emissiveIntensity: 0,
        roughness: 0.5,
        toneMapped: false,
      });
    return {
      ledL: led(),
      ledR: led(),
      diffuser: new THREE.MeshStandardMaterial({ color: "#d9d6cf", emissive: new THREE.Color("#fff6e6"), emissiveIntensity: 0, roughness: 0.9, side: THREE.DoubleSide, toneMapped: false }),
      ring: new THREE.MeshStandardMaterial({ color: "#d8d8d8", emissive: new THREE.Color("#fffaf0"), emissiveIntensity: 0, roughness: 0.6, toneMapped: false }),
      backdropFrame: new THREE.MeshStandardMaterial({ color: "#1a1406", emissive: new THREE.Color("#ffb800"), emissiveIntensity: 0, toneMapped: false }),
      backdropLogo: new THREE.MeshStandardMaterial({ map: tex.logo, transparent: true, emissive: new THREE.Color("#ffffff"), emissiveMap: tex.logo, emissiveIntensity: 0.05, roughness: 0.5, depthWrite: false }),
    };
  }, [tex]);
}

export type KitMaterials = ReturnType<typeof useKitMaterials>;

/**
 * Luzes REAIS do kit (focos, luz de trabalho, ambiente, reflexo dourado). São montadas desde o
 * 1.º frame, fora do grupo do kit, e ficam sempre "visíveis" com intensidade 0 até à fase LUZ:
 * o número de luzes da cena nunca muda. No three.js o número de luzes faz parte de cada shader;
 * se mudasse ao entrar nas fases LUZ/ESTÚDIO, todos os materiais seriam recompilados nesse
 * frame (era a causa dos congelamentos na 1.ª visita). As fórmulas de intensidade são as mesmas.
 */
export function KitLights() {
  const tier = useTier();
  const size = useThree((s) => s.size);
  const work = useRef<THREE.SpotLight>(null);
  const sweep = useRef<THREE.PointLight>(null);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const spotS = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const pos = useMemo(() => {
    const hL = ledHeadPos(LED_L);
    const hR = ledHeadPos(LED_R);
    return {
      ledL: [hL[0], hL[1] + LED_PANEL_DY, hL[2]] as Vec3,
      ledR: [hR[0], hR[1] + LED_PANEL_DY, hR[2]] as Vec3,
      softbox: SOFTBOX_POSE.pos as Vec3,
    };
  }, []);

  const targets = useMemo(() => {
    const focus = new THREE.Object3D();
    focus.position.set(...SET_FOCUS);
    const kit = new THREE.Object3D();
    kit.position.set(2.1, 0, -0.3);
    return { focus, kit };
  }, []);

  useAnim((p) => {
    const active = p > 0.398 && p < 0.62;
    // os focos acompanham a rotação das cabeças: centro do kit → set de podcast
    const re = ease.inOutCubic(range(p, REAIM[0], REAIM[1]));
    targets.focus.position.set(lerp(KIT_FOCUS[0], SET_FOCUS[0], re), lerp(KIT_FOCUS[1], SET_FOCUS[1], re), lerp(KIT_FOCUS[2], SET_FOCUS[2], re));
    // luz de trabalho por cima do kit (desce quando os equipamentos acendem)
    const kitOut = 1 - range(p, 0.55, 0.6);
    if (work.current)
      work.current.intensity = active
        ? on(p, w(0, 0.08)) * lerp(60, 28, on(p, w(0.75, 0.9))) * kitOut * (size.width / Math.max(1, size.height) < 1 ? 0.5 : 1)
        : 0;
    // luz ambiente da fase LUZ para o kit se ler bem (o estúdio tem a sua própria luz depois)
    const amb = active ? on(p, w(0, 0.08)) * kitOut : 0;
    if (fill.current) fill.current.intensity = amb * 0.35;
    if (hemi.current) hemi.current.intensity = amb * (0.45 + 0.6 * on(p, w(0.75, 0.9)));
    // reflexos dourados (uma só luz, reutilizada): F1 percorre as peças pousadas no chão,
    // F5 percorre as estruturas metálicas já montadas
    const s1 = range(p, ...w(0.02, 0.16));
    const s5 = range(p, ...w(0.78, 0.92));
    if (sweep.current) {
      if (s5 > 0) {
        sweep.current.position.set(lerp(-0.4, 4.5, ease.inOutSine(s5)), 1.6, 0.6);
        sweep.current.intensity = Math.sin(Math.PI * s5) * 3;
        sweep.current.distance = 2.2;
      } else {
        sweep.current.position.set(lerp(-0.2, 4.6, ease.inOutSine(s1)), 0.45, 0.0);
        sweep.current.intensity = Math.sin(Math.PI * s1) * 3.5;
        sweep.current.distance = 1.8;
      }
    }
    // F5 — focos reais acendem com os equipamentos
    const L = on(p, POWER.ledL);
    const R = on(p, POWER.ledR);
    const S = on(p, POWER.softbox);
    // durante a montagem do estúdio os focos baixam (não iluminam o chão à frente) e voltam
    // à intensidade total quando são reorientados para o set (só actua depois de 0.55)
    // ecrãs verticais (telemóvel) vêem mais chão: focos mais suaves para não criar poças de luz
    const portrait = size.width / Math.max(1, size.height) < 1 ? 0.45 : 1;
    const dim = portrait * (1 - 0.7 * range(p, 0.55, 0.58) * (1 - range(p, REAIM[0], REAIM[1])));
    if (spotL.current) spotL.current.intensity = L * 15 * (1 + 0.2 * fin(p)) * dim;
    if (spotR.current) spotR.current.intensity = R * 15 * (1 + 0.2 * fin(p)) * dim;
    if (spotS.current) {
      spotS.current.intensity = S * 20 * (1 + 0.2 * fin(p)) * dim;
      // sombra só é recalculada quando o foco está aceso (poupa um passe de sombra até lá)
      spotS.current.shadow.autoUpdate = spotS.current.intensity > 0;
    }
    // antes da fase LUZ o kit não existia na imagem (grupo escondido): luzes exactamente a 0
    if (p < 0.3995) for (const l of [work, fill, hemi, sweep, spotL, spotR, spotS]) if (l.current) l.current.intensity = 0;
  });

  const spot = (ref: RefObject<THREE.SpotLight | null>, at: Vec3, angle: number, shadow = false) => (
    <spotLight
      ref={ref}
      position={at}
      target={targets.focus}
      angle={angle}
      penumbra={0.85}
      decay={1.6}
      distance={14}
      intensity={0}
      color="#ffe9c4"
      castShadow={shadow}
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  );

  return (
    <group name="luzes-kit">
      <primitive object={targets.focus} />
      <primitive object={targets.kit} />
      <spotLight ref={work} position={[2.1, 4.8, 2.2]} target={targets.kit} angle={0.9} penumbra={1} decay={1.2} distance={12} intensity={0} color="#ffe8c4" />
      <ambientLight ref={fill} intensity={0} color="#fff0d8" />
      <hemisphereLight ref={hemi} args={["#ffe2a8", "#20160a", 0]} />
      <pointLight ref={sweep} color="#ffc84a" distance={1.8} decay={2} intensity={0} />
      {spot(spotL, pos.ledL, 0.62)}
      {spot(spotR, pos.ledR, 0.62)}
      {spot(spotS, pos.softbox, 0.75, tier === "high")}
    </group>
  );
}

/** Efeitos visuais do kit (onda magnética, cones de luz, parede de fundo e emissivos).
 *  As luzes reais estão em KitLights (montadas desde o início). */
export function KitEffects({ m, ledL, ledR }: { m: KitMaterials; ledL: Vec3; ledR: Vec3; softbox: Vec3; ring: Vec3 }) {
  const tier = useTier();
  const wave = useRef<THREE.Group>(null);
  const backdrop = useRef<THREE.Group>(null);

  const waveMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffb400",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  useAnim((p) => {
    // F2 — onda de energia magnética no chão
    const u = range(p, ...w(0.15, 0.32));
    waveMat.opacity = Math.sin(Math.PI * u) * 0.55;
    if (wave.current) {
      wave.current.visible = u > 0 && u < 1;
      const s = lerp(0.15, 4.2, ease.outCubic(u));
      wave.current.scale.set(s, 1, s);
    }
    // F5 — acendimento sequencial (emissivos; as luzes reais estão em KitLights)
    const b = 1 + 0.25 * fin(p);
    const L = on(p, POWER.ledL);
    const R = on(p, POWER.ledR);
    const G = on(p, POWER.ring);
    const S = on(p, POWER.softbox);
    m.ledL.emissiveIntensity = L * 2.6 * b;
    m.ledR.emissiveIntensity = R * 2.6 * b;
    m.ring.emissiveIntensity = G * 3 * b;
    m.diffuser.emissiveIntensity = S * 2.2 * b;
    // parede de fundo: sobe do chão, a moldura LED acende; recolhe quando o estúdio começa
    const rise = on(p, POWER.backdropRise) * (1 - ease.inOutCubic(range(p, STUDIO_STEPS.structure[0], STUDIO_STEPS.structure[0] + 0.025)));
    if (backdrop.current) {
      backdrop.current.position.y = -2.8 * (1 - rise);
      backdrop.current.visible = rise > 0.001;
    }
    m.backdropFrame.emissiveIntensity = on(p, POWER.backdropGlow) * 2.4;
    m.backdropLogo.emissiveIntensity = 0.05 + on(p, POWER.backdropGlow) * 0.9;
  });

  return (
    <group>
      <group ref={wave} position={[2.1, 0.006, -0.25]} visible={false}>
        {[0.8, 1].map((r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} material={waveMat}>
            <ringGeometry args={[r - 0.012, r, 96]} />
          </mesh>
        ))}
      </group>
      {tier !== "low" && (
        <>
          <BeamCone from={ledL} to={toward(ledL, KIT_FOCUS, 0.5)} radius={0.38} intensity={(p) => on(p, POWER.ledL) * 0.045 * (1 - range(p, 0.55, 0.57))} />
          <BeamCone from={ledR} to={toward(ledR, KIT_FOCUS, 0.5)} radius={0.38} intensity={(p) => on(p, POWER.ledR) * 0.045 * (1 - range(p, 0.55, 0.57))} />
          <BeamCone from={ledL} to={SET_FOCUS} radius={0.75} intensity={(p) => on(p, POWER.ledL) * 0.05 * range(p, REAIM[0], REAIM[1])} />
          <BeamCone from={ledR} to={SET_FOCUS} radius={0.75} intensity={(p) => on(p, POWER.ledR) * 0.05 * range(p, REAIM[0], REAIM[1])} />
        </>
      )}
      <group ref={backdrop} position={[0, -2.8, 0]} visible={false}>
        <group position={BACKDROP}>
          <Backdrop frameMat={m.backdropFrame} logoMat={m.backdropLogo} />
        </group>
      </group>
    </group>
  );
}
