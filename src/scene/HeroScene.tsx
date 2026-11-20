"use client";

import { Suspense, startTransition, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { QualityTier } from "@/lib/quality";
import { heroState, onHeroProgress } from "@/animation/heroState";
import { AnimationDriver, useDriver } from "./parts/driver";
import { SceneAssetsProvider } from "./context";
import { CameraRig } from "./CameraRig";
import { Atmosphere, Floor, SceneLighting } from "./Environment";
import { CinemaCamera } from "./models/CinemaCamera";
import { LightingKit } from "./models/lighting/LightingKit";
import { PodcastStudio } from "./models/studio/PodcastStudio";

type Props = {
  tier: QualityTier;
  active: boolean;
  /** Primeiro frame real desenhado (a imagem inicial pode dar lugar à cena). */
  onReady?: () => void;
};

/** Limites da resolução de renderização (devicePixelRatio) por nível de qualidade. */
const DPR: Record<QualityTier, [number, number]> = {
  high: [1, 1.75],
  medium: [0.85, 1.4],
  low: [0.7, 1.1],
};

/**
 * Carregamento progressivo da cena (as fases aprovadas não mudam):
 *  0 — câmara + ambiente: o necessário para o primeiro ecrã;
 *  1 — kit de iluminação (só visível a partir de p ≈ 0.40);
 *  2 — estúdio de podcast (só visível a partir de p ≈ 0.55).
 * Os estágios 1 e 2 montam-se em segundo plano depois do primeiro frame, ou de imediato
 * se o utilizador se aproximar da respectiva fase.
 */
const STAGE_NEEDED_AT = [0, 0.22, 0.42] as const;
/** Estados (progresso) a "aquecer" quando cada estágio fica montado: cada fase acende
 *  luzes diferentes, e o número de luzes faz parte de cada shader — sem isto, os shaders
 *  seriam compilados a meio do scroll (congelamentos ao entrar nas luzes e no estúdio). */
const WARM_AT: Record<1 | 2, number[]> = {
  1: [0.42, 0.5],
  2: [0.56, 0.62, 0.75, 0.9, 1],
};

/**
 * Raiz WebGL do banner. Toda a cena é procedural (geometria real em Three.js):
 * cada peça da câmara, cada luz e cada elemento do estúdio é um objecto 3D próprio.
 */
export default function HeroScene({ tier, active, onReady }: Props) {
  const post = tier !== "low";
  // Telemóveis/tablets: desenha só quando o scroll muda (+ atmosfera a 15 fps) — menos GPU,
  // menos bateria e menos aquecimento. O desktop mantém o ciclo contínuo.
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(-1);

  return (
    <Canvas
      frameloop={!active ? "never" : touch ? "demand" : "always"}
      dpr={DPR[tier][1]}
      shadows={tier === "high" ? "soft" : false}
      camera={{ fov: 38, near: 0.03, far: 80, position: [2.2, 1.64, 3.9] }}
      gl={{ antialias: !post, powerPreference: "high-performance", alpha: false, stencil: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // diagnóstico de desempenho (?perf): expõe o renderer para medir draw calls/programas
        if (window.location.search.includes("perf")) (window as unknown as { __viralizaGL?: unknown }).__viralizaGL = { gl, scene };
      }}
      aria-hidden
    >
      <AdaptiveResolution range={DPR[tier]} touch={touch} />
      <AnimationDriver tier={tier}>
        <Suspense fallback={null}>
          <SceneAssetsProvider>
            <CameraRig parallax={tier !== "low"} />
            <SceneLighting />
            <Floor />
            <Atmosphere />
            <CinemaCamera />
            <Mounted stage={0} onMounted={setMounted} />
            {stage >= 1 && (
              <Suspense fallback={null}>
                <LightingKit />
                <Mounted stage={1} onMounted={setMounted} />
              </Suspense>
            )}
            {stage >= 2 && (
              <Suspense fallback={null}>
                <PodcastStudio />
                <Mounted stage={2} onMounted={setMounted} />
              </Suspense>
            )}
            <Preparer mounted={mounted} post={post} onReady={onReady} requestStage={(s) => startTransition(() => setStage((cur) => Math.max(cur, s)))} />
            {touch && active && <OnDemandInvalidator />}
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

/** Marca um estágio como montado (o Suspense do estágio resolveu e as peças existem). */
function Mounted({ stage, onMounted }: { stage: number; onMounted: (s: number) => void }) {
  const driver = useDriver();
  useEffect(() => {
    // as peças acabadas de montar ficam já no estado do scroll actual
    driver?.applyAt(heroState.progress);
    onMounted(stage);
  }, [driver, stage, onMounted]);
  return null;
}

const idle = (timeout = 400) =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 60);
  });
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
/** Espera que o scroll acalme (sem mudanças de progresso durante ~150 ms), no máximo `max` ms:
 *  o trabalho de preparação evita competir com um gesto em curso. */
const calm = (max = 1200) =>
  new Promise<void>((resolve) => {
    const t0 = performance.now();
    let last = heroState.progress;
    let still = performance.now();
    const tick = () => {
      const now = performance.now();
      if (heroState.progress !== last) {
        last = heroState.progress;
        still = now;
      }
      if (now - still > 150 || now - t0 > max) resolve();
      else setTimeout(tick, 50);
    };
    tick();
  });

/**
 * Orquestra o carregamento progressivo e o "aquecimento" da GPU:
 *  - estágio 0: prepara só os shaders do estado actual e avisa quando o 1.º frame foi desenhado;
 *  - estágios seguintes: em tempo ocioso, prepara shaders, texturas e geometria de cada fase
 *    (no estado de luzes dessa fase) antes de o utilizador lá chegar.
 */
function Preparer({ mounted, post, onReady, requestStage }: { mounted: number; post: boolean; onReady?: () => void; requestStage: (s: number) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const driver = useDriver();
  const done = useRef(new Set<number>());
  const target = useRef<THREE.WebGLRenderTarget | null>(null);

  // se o utilizador avançar depressa, monta já o que vai ser preciso
  useEffect(
    () =>
      onHeroProgress((p) => {
        if (p >= STAGE_NEEDED_AT[2]) requestStage(2);
        else if (p >= STAGE_NEEDED_AT[1]) requestStage(1);
      }),
    [requestStage],
  );

  useEffect(() => () => target.current?.dispose(), []);

  useEffect(() => {
    if (mounted < 0 || !driver) return;
    let cancelled = false;

    /** Coloca a cena no estado de p (síncrono), executa fn e repõe o estado do scroll actual. */
    const at = <T,>(p: number, fn: () => T): T => {
      driver.applyAt(p);
      try {
        return fn();
      } finally {
        driver.applyAt(heroState.progress);
      }
    };
    // As variantes de shader dependem do destino do desenho: com pós-processamento a cena é
    // desenhada num render target (cor linear, sem tone mapping); sem ele, directamente no ecrã
    // (sRGB + ACES). A preparação usa SEMPRE o mesmo destino que o render real.
    const rt = () => (target.current ??= new THREE.WebGLRenderTarget(4, 4));
    const withTarget = <T,>(fn: () => T): T => {
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(post ? rt() : null);
      try {
        return fn();
      } finally {
        gl.setRenderTarget(prev);
      }
    };
    const compile = (p: number) => at(p, () => withTarget(() => gl.compileAsync(scene, camera)).catch(() => undefined));
    /** Desenho de aquecimento (sem culling): envia geometria e texturas para a GPU e inicializa
     *  os uniforms — o custo do "primeiro frame" de cada fase sai do scroll. Com pós-processamento
     *  vai para um render target de 4×4 px; sem ele vai para o ecrã e é logo substituído pelo
     *  frame real (mesma tarefa: o navegador só apresenta o último). */
    const upload = (p: number) => {
      const culled: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.frustumCulled) {
          o.frustumCulled = false;
          culled.push(o);
        }
      });
      try {
        at(p, () => withTarget(() => gl.render(scene, camera)));
      } finally {
        culled.forEach((o) => (o.frustumCulled = true));
      }
      if (!post) gl.render(scene, camera); // repõe já o frame do estado actual
    };

    /** Prepara um estágio. Devolve false se foi interrompido (é retomado no efeito seguinte). */
    const prepare = async (st: number) => {
      if (st === 0) {
        // 1.º ecrã: só os shaders do estado actual (fase da câmara)
        await compile(heroState.progress);
        if (cancelled) return false;
        invalidate();
        await nextFrame();
        await nextFrame();
        if (cancelled) return false;
        onReady?.();
        return true;
      }
      for (const p of WARM_AT[st as 1 | 2]) {
        await calm();
        await idle();
        if (cancelled) return false;
        await compile(p);
        await calm();
        await idle();
        if (cancelled) return false;
        upload(p);
      }
      invalidate();
      return true;
    };

    // fila: prepara, por ordem, todos os estágios já montados que ainda não foram preparados
    // (se o kit e o estúdio montarem juntos — salto directo para o fim — nenhum fica de fora)
    const run = async () => {
      for (let st = 0; st <= mounted; st++) {
        if (done.current.has(st)) continue;
        if (!(await prepare(st))) return;
        done.current.add(st);
        heroState.prepared = Math.max(heroState.prepared, st);
        if (st < 2 && st === mounted) {
          await idle(300);
          if (!cancelled) requestStage(st + 1);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [mounted, post, driver, gl, scene, camera, invalidate, onReady, requestStage]);

  return null;
}

/**
 * Resolução adaptativa: mede o ritmo real dos frames SÓ enquanto a animação avança
 * (no modo "a pedido" dos telemóveis os frames em repouso não contam) e ajusta o
 * devicePixelRatio em degraus. A mudança só é aplicada quando o scroll pára, para
 * nunca redimensionar o canvas a meio de um gesto (isso causava soluços).
 */
function AdaptiveResolution({ range: [min, max], touch }: { range: [number, number]; touch: boolean }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ cur: max, lastP: -1, wasMoving: false, lastMove: 0, samples: [] as number[], pending: 0, ups: 0, cooldown: 0 });
  // orçamento por frame: ~50 fps no desktop, ~36 fps em telemóveis
  const budget = touch ? 1 / 36 : 1 / 50;

  useFrame((_, dt) => {
    const s = st.current;
    const now = performance.now();
    const p = heroState.progress;
    const moving = p !== s.lastP;
    s.lastP = p;
    if (moving) s.lastMove = now;
    if (moving && s.wasMoving && dt > 0 && dt < 0.5 && now > s.cooldown) {
      s.samples.push(dt);
      if (s.samples.length >= 45) {
        const sorted = s.samples.sort((a, b) => a - b);
        const typical = sorted[Math.floor(sorted.length * 0.6)];
        s.samples = [];
        if (typical > budget * 1.3 && s.cur > min) s.pending = Math.max(min, +(s.cur - 0.2).toFixed(2));
        else if (typical < budget * 0.6 && s.cur < max && s.ups < 2) s.pending = Math.min(max, +(s.cur + 0.15).toFixed(2));
      }
    }
    s.wasMoving = moving;
    // aplica só com o scroll parado há 350 ms
    if (s.pending && now - s.lastMove > 350) {
      if (s.pending > s.cur) s.ups++;
      s.cur = s.pending;
      s.pending = 0;
      s.cooldown = now + 1500;
      setDpr(s.cur);
    }
  });
  return null;
}

/** Renderização a pedido: um frame por cada mudança de progresso + atmosfera lenta. */
function OnDemandInvalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const off = onHeroProgress(() => invalidate());
    const idleTimer = window.setInterval(() => invalidate(), 66);
    return () => {
      off();
      window.clearInterval(idleTimer);
    };
  }, [invalidate]);
  return null;
}
