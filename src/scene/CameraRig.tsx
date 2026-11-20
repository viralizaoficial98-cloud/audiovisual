"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { clamp, lerp, range, sampleKeys } from "@/animation/math";
import { useAnim } from "./parts/driver";
import { HERO_ASSEMBLY as H } from "./layout";

/**
 * Câmara virtual. Keyframes [posição, alvo, fov] interpolados por Catmull-Rom em
 * função do progresso: aproximação macro na montagem da câmara, recuo para revelar
 * a iluminação, travelling para trás enquanto o estúdio é construído e dolly-out final.
 */
type K = { at: number; v: [number, number, number, number, number, number, number] };

const k = (at: number, pos: [number, number, number], tgt: [number, number, number], fov: number): K => ({ at, v: [...pos, ...tgt, fov] });
const h = (dx: number, dy: number, dz: number): [number, number, number] => [H[0] + dx, H[1] + dy, H[2] + dz];

export const CAMERA_KEYS: K[] = [
  // peças pousadas no chão — plano largo, ligeiramente picado
  k(0.0, h(0.05, 0.78, 2.15), h(-0.02, -0.4, 0.05), 40),
  k(0.06, h(0.12, 0.66, 2.0), h(-0.02, -0.32, 0.04), 39),
  // levitação: a câmara desce ao nível da constelação
  k(0.12, h(0.25, 0.3, 1.8), h(-0.08, 0.02, 0), 38),
  // estrutura interna e electrónica: aproximação
  k(0.18, h(0.34, 0.2, 1.38), h(-0.02, 0.0, 0), 36),
  k(0.24, h(0.2, 0.14, 1.12), h(0.02, 0.0, 0), 35),
  // conjunto óptico: vista frontal-esquerda, ao longo do eixo da lente
  k(0.29, h(-0.55, 0.12, 1.25), h(-0.3, 0.0, 0.05), 36),
  // painéis e acessórios (câmara à direita, espaço para o texto)
  k(0.335, h(0.0, 0.24, 1.5), h(-0.3, 0.04, 0), 37),
  k(0.362, h(0.0, 0.16, 1.32), h(-0.26, 0.05, 0), 36),
  // revelação: a câmara roda para a frente; aproximação à lente
  k(0.39, h(-0.2, 0.16, 1.5), h(-0.24, 0.1, 0.2), 35),
  k(0.4, h(0.0, 0.2, 1.55), h(-0.1, 0.08, 0.1), 36),
  k(0.42, [3.0, 1.85, 4.7], [3.25, 1.3, 0.9], 40),
  k(0.49, [2.45, 1.85, 5.7], [2.25, 1.2, -1.0], 40),
  k(0.55, [2.2, 1.8, 5.75], [2.0, 1.25, -1.6], 40),
  k(0.63, [1.7, 2.1, 7.3], [1.4, 1.45, -2.0], 42),
  k(0.73, [1.05, 2.35, 8.6], [0.8, 1.55, -2.3], 42),
  k(0.85, [0.65, 2.45, 9.25], [0.35, 1.6, -2.4], 42),
  k(1.0, [0.35, 2.3, 10.2], [0.05, 1.62, -2.5], 41),
];

const DESIGN_ASPECT = 16 / 9;

export function CameraRig({ parallax = true }: { parallax?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const out = useMemo(() => new Array(7).fill(0), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax]);

  useAnim((p, _t, dt) => {
    sampleKeys(CAMERA_KEYS, p, out);
    pos.set(out[0], out[1], out[2]);
    tgt.set(out[3], out[4], out[5]);
    let fov = out[6];

    // Ecrãs mais estreitos que 16:9: alarga o FOV até um limite e recua o resto,
    // com menos recuo dentro da sala (para não sair pelas paredes).
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < DESIGN_ASPECT) {
      const need = DESIGN_ASPECT / aspect;
      const inRoom = range(p, 0.38, 0.5);
      // dentro da sala alarga-se mais o FOV e quase não se recua (para não sair pelas paredes)
      const fovGain = Math.min(need, lerp(1.8, 2.1, inRoom));
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * fovGain));
      const rest = need / fovGain;
      if (rest > 1) {
        const d = Math.pow(rest, lerp(0.6, 0.12, inRoom));
        pos.sub(tgt).multiplyScalar(d).add(tgt);
      }
      // no telemóvel o set de podcast é o protagonista: centra a câmara nele
      const focusX = (1.7 - tgt.x) * inRoom * 0.7;
      pos.x += focusX;
      tgt.x += focusX;
      fov = clamp(fov, 20, 78);
    }

    // parallax subtil do rato (desktop)
    const pt = pointer.current;
    const s = 1 - Math.exp(-dt * 3);
    pt.sx += (pt.x - pt.sx) * s;
    pt.sy += (pt.y - pt.sy) * s;
    const dist = pos.distanceTo(tgt);
    pos.x += pt.sx * 0.035 * dist;
    pos.y -= pt.sy * 0.02 * dist;

    camera.position.copy(pos);
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(tgt);
  });

  return null;
}
