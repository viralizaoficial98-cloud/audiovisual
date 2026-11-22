"use client";

import {
  Suspense,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
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
import { KitLights } from "./models/lighting/effects";
import { PodcastStudio, StudioLights } from "./models/studio/PodcastStudio";

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

/**
 * Raiz WebGL do banner. Toda a cena é procedural (geometria real em Three.js):
 * cada peça da câmara, cada luz e cada elemento do estúdio é um objecto 3D próprio.
 */
export default function HeroScene({ tier, active, onReady }: Props) {
  // Telemóveis/tablets: desenha só quando a animação muda (≤ 30 fps; ≤ 15 fps enquanto o
  // utilizador faz scroll), sem pós-processamento e com resolução ≤ 1.25× — o GPU fica
  // disponível para o scroll do navegador. O desktop mantém o ciclo contínuo.
  const [touch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );
  const post = tier !== "low" && !touch;
  const dprRange = useMemo<[number, number]>(
    () => (touch ? [DPR[tier][0], Math.min(DPR[tier][1], 1.25)] : DPR[tier]),
    [tier, touch],
  );
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(-1);
  const requestStage = useCallback(
    (st: number) => startTransition(() => setStage((cur) => Math.max(cur, st))),
    [],
  );
  // O conteúdo da cena é memorizado: entrar/sair do banner (`active`) só liga/desliga o ciclo
  // de render — não volta a renderizar a árvore (antes, cada regresso ao banner recriava o
  // mapa de ambiente do drei sem libertar o anterior: fuga de memória GPU).
  const content = useMemo(
    () => (
      <AnimationDriver tier={tier}>
        <Suspense fallback={null}>
          <SceneAssetsProvider>
            <CameraRig parallax={tier !== "low"} />
            <StableLighting />
            {/* todas as luzes das 3 fases existem desde o início (intensidade 0 até à sua fase):
              o número de luzes é constante → nenhum shader é recompilado ao mudar de fase */}
            <KitLights />
            <StudioLights />
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
            <Preparer
              mounted={mounted}
              post={post}
              onReady={onReady}
              requestStage={requestStage}
            />
          </SceneAssetsProvider>
        </Suspense>
        {post && (
          <EffectComposer
            multisampling={tier === "high" ? 4 : 0}
            enableNormalPass={false}
          >
            <Bloom
              mipmapBlur
              intensity={0.75}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.25}
              radius={0.7}
            />
            <Vignette offset={0.28} darkness={0.72} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </AnimationDriver>
    ),
    [tier, post, stage, mounted, onReady, requestStage],
  );

  return (
    <Canvas
      frameloop={!active ? "never" : touch ? "demand" : "always"}
      dpr={dprRange[1]}
      shadows={tier === "high" ? "soft" : false}
      camera={{ fov: 38, near: 0.03, far: 80, position: [2.2, 1.64, 3.9] }}
      gl={{
        antialias: !post,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
      }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // diagnóstico de desempenho (?perf): expõe o renderer para medir draw calls/programas
        if (window.location.search.includes("perf"))
          (window as unknown as { __viralizaGL?: unknown }).__viralizaGL = {
            gl,
            scene,
          };
      }}
      aria-hidden
    >
      <AdaptiveResolution range={dprRange} touch={touch} />
      {content}
      {touch && active && <OnDemandInvalidator />}
    </Canvas>
  );
}

/** Luzes + mapa de ambiente (drei <Environment>): sem props, nunca precisa de voltar a
 *  renderizar — e cada re-render recriaria o mapa de ambiente sem libertar o anterior. */
const StableLighting = memo(SceneLighting);

/** Marca um estágio como montado (o Suspense do estágio resolveu e as peças existem). */
function Mounted({
  stage,
  onMounted,
}: {
  stage: number;
  onMounted: (s: number) => void;
}) {
  const driver = useDriver();
  useEffect(() => {
    // as peças acabadas de montar ficam já no estado do scroll actual
    driver?.applyAt(heroState.progress);
    onMounted(stage);
  }, [driver, stage, onMounted]);
  return null;
}

type Renderable = THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;
const isRenderable = (o: THREE.Object3D): o is Renderable =>
  (o as THREE.Mesh).isMesh === true ||
  (o as THREE.Points).isPoints === true ||
  (o as THREE.Line).isLine === true ||
  (o as THREE.Sprite).isSprite === true;
const materialsOf = (o: Renderable) =>
  (Array.isArray(o.material) ? o.material : [o.material]).filter(
    Boolean,
  ) as THREE.Material[];
const texturesOf = (m: THREE.Material) =>
  Object.values(m).filter(
    (v): v is THREE.Texture =>
      !!v &&
      (v as THREE.Texture).isTexture === true &&
      !(v as THREE.Texture).isRenderTargetTexture,
  );
/** Estágio de uma peça: kit (1), estúdio (2) ou o resto (0 — câmara, ambiente, luzes). */
const stageOf = (o: THREE.Object3D) => {
  for (let a: THREE.Object3D | null = o; a; a = a.parent) {
    if (a.name === "kit-iluminacao") return 1;
    if (a.name === "estudio") return 2;
  }
  return 0;
};

type Item =
  | { kind: "compile"; obj: Renderable }
  | { kind: "link"; mat: THREE.Material; polls: number }
  | { kind: "texture"; tex: THREE.Texture }
  | { kind: "draw"; objs: Renderable[]; polls: number };

/**
 * Preparação progressiva da GPU, EM FATIAS PEQUENAS dentro do ciclo de render.
 *
 * Diagnóstico (1.ª visita, perfis de CPU): os congelamentos vinham do primeiro uso de cada
 * shader (compilação + ligação síncronas, "onFirstUse") e de tarefas de preparação grandes
 * (compilar/desenhar uma fase inteira de uma vez). Aqui cada tarefa é UMA coisa — compilar um
 * material, concluir a ligação de um programa, enviar uma textura, ou um desenho de aquecimento
 * de ~24 malhas — e cada frame tem um orçamento de tempo (4–12 ms). A main thread nunca fica
 * presa: o scroll e a animação continuam a responder durante toda a preparação.
 *
 * Com KHR_parallel_shader_compile (Chrome/Edge/Android) a compilação corre fora da main thread
 * e a ligação só é concluída quando o driver diz que está pronta (sem esperas). Sem a extensão,
 * cada programa custa o seu tempo de compilação, mas no máximo um por frame.
 *
 * Uma fase só fica visível depois de preparada; se o visitante lá chegar antes, o scroll segue
 * normalmente e a fase aparece já no estado do progresso actual (sem recompilar nada).
 */
function Preparer({
  mounted,
  post,
  onReady,
  requestStage,
}: {
  mounted: number;
  post: boolean;
  onReady?: () => void;
  requestStage: (s: number) => void;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const st = useRef({
    known: new WeakSet<THREE.Object3D>(),
    keys: new Set<string>(),
    texSeen: new WeakSet<THREE.Texture>(),
    queues: [[], [], []] as Item[][],
    scanned: -1,
    done: -1,
    readyAt: 0,
    lastP: -1,
    lastMove: 0,
    rt: null as THREE.WebGLRenderTarget | null,
    parallel: false,
    nextRequest: 0,
    /** programas criados cuja ligação ainda não foi concluída (trabalho pendente na GPU) */
    pending: new Set<{ isReady: () => boolean; getUniforms: () => unknown }>(),
    newThisTick: 0,
    compiled: new WeakSet<THREE.Material>(),
    linked: new WeakSet<THREE.Material>(),
  });

  // diagnóstico (?perf): estado da fila de preparação
  useEffect(() => {
    if (window.location.search.includes("perf"))
      (window as unknown as { __viralizaPrep?: unknown }).__viralizaPrep =
        st.current;
  }, []);

  useEffect(() => {
    st.current.parallel =
      gl.getContext().getExtension("KHR_parallel_shader_compile") !== null;
    const s = st.current;
    return () => s.rt?.dispose();
  }, [gl]);

  // se o utilizador avançar depressa, monta já o que vai ser preciso
  useEffect(
    () =>
      onHeroProgress((p) => {
        if (p >= STAGE_NEEDED_AT[2]) requestStage(2);
        else if (p >= STAGE_NEEDED_AT[1]) requestStage(1);
      }),
    [requestStage],
  );

  /** Procura peças novas na cena e põe na fila o que cada uma precisa. */
  const scan = useCallback(() => {
    const s = st.current;
    const fresh: Renderable[][] = [[], [], []];
    scene.traverse((o) => {
      if (!isRenderable(o) || s.known.has(o)) return;
      s.known.add(o);
      const stage = stageOf(o);
      fresh[stage].push(o);
      for (const m of materialsOf(o)) {
        const attrs = (o as THREE.Mesh).geometry?.attributes ?? {};
        const geo = `${attrs.uv1 ? "u1" : ""}${attrs.uv2 ? "u2" : ""}${attrs.tangent ? "t" : ""}${attrs.color?.itemSize ?? ""}`;
        const key = `${m.uuid}|${(o as THREE.InstancedMesh).isInstancedMesh ? "i" : ""}${o.type}|${geo}`;
        if (!s.keys.has(key)) {
          s.keys.add(key);
          s.queues[stage].push(
            { kind: "compile", obj: o },
            { kind: "link", mat: m, polls: 0 },
          );
        }
        for (const t of texturesOf(m)) {
          if (s.texSeen.has(t)) continue;
          s.texSeen.add(t);
          s.queues[stage].push({ kind: "texture", tex: t });
        }
      }
    });
    fresh.forEach((list, stage) => {
      for (let i = 0; i < list.length; i += 24)
        s.queues[stage].push({
          kind: "draw",
          objs: list.slice(i, i + 24),
          polls: 0,
        });
    });
  }, [scene]);

  // cada estágio montado → regista as suas peças
  useEffect(() => {
    if (mounted > st.current.scanned) {
      st.current.scanned = mounted;
      scan();
      invalidate();
    }
  }, [mounted, scan, invalidate]);

  /** Destino igual ao do render real: render target com pós-processamento; ecrã sem ele. */
  const withTarget = useCallback(
    <T,>(fn: () => T): T => {
      const s = st.current;
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(
        post ? (s.rt ??= new THREE.WebGLRenderTarget(4, 4)) : null,
      );
      try {
        return fn();
      } finally {
        gl.setRenderTarget(prev);
      }
    },
    [gl, post],
  );

  const programsOf = useCallback(
    (m: THREE.Material) => {
      const progs = (
        gl.properties.get(m) as {
          programs?: Map<
            string,
            { isReady: () => boolean; getUniforms: () => unknown }
          >;
        }
      ).programs;
      return progs ? [...progs.values()] : [];
    },
    [gl],
  );

  /** Desenho de aquecimento de um lote de malhas (envia geometria e uniforms; 1.º uso do
   *  programa). Só o lote fica visível; vai para um render target de 4×4 px ou, sem
   *  pós-processamento, para 1 pixel do ecrã (scissor) — o frame real que se segue, na mesma
   *  tarefa, redesenha o ecrã inteiro. */
  const warmDraw = useCallback(
    (objs: Renderable[]) => {
      const s = st.current;
      const batch = new Set<THREE.Object3D>(objs);
      const saved: [THREE.Object3D, boolean, boolean][] = [];
      scene.traverse((o) => {
        if (!isRenderable(o)) return;
        saved.push([o, o.visible, o.frustumCulled]);
        const inBatch = batch.has(o);
        o.visible = inBatch;
        if (inBatch) o.frustumCulled = false;
      });
      const anc: THREE.Object3D[] = [];
      for (const o of objs)
        for (let a = o.parent; a; a = a.parent)
          if (!a.visible) ((a.visible = true), anc.push(a));
      const prev = gl.getRenderTarget();
      const scissor = new THREE.Vector4();
      const scissorTest = gl.getScissorTest();
      try {
        if (post)
          gl.setRenderTarget((s.rt ??= new THREE.WebGLRenderTarget(4, 4)));
        else {
          gl.getScissor(scissor);
          gl.setScissorTest(true);
          gl.setScissor(0, 0, 1, 1);
          gl.setRenderTarget(null);
        }
        gl.render(scene, camera);
      } finally {
        if (!post) {
          gl.setScissor(scissor);
          gl.setScissorTest(scissorTest);
        }
        gl.setRenderTarget(prev);
        for (const [o, v, f] of saved) ((o.visible = v), (o.frustumCulled = f));
        for (const a of anc) a.visible = false;
      }
    },
    [gl, scene, camera, post],
  );

  // Enquanto o estágio 0 não está pronto, o canvas está tapado pela imagem inicial: o render
  // real não desenha nada (câmara sem camadas visíveis) — poupa main thread e GPU para a
  // preparação e para o scroll. A compilação e os desenhos de aquecimento usam a camada normal.
  useEffect(() => {
    if (st.current.done < 0) camera.layers.disableAll();
    return () => camera.layers.set(0);
  }, [camera]);
  const withCameraLayer = useCallback(
    <T,>(fn: () => T): T => {
      const mask = camera.layers.mask;
      camera.layers.set(0);
      try {
        return fn();
      } finally {
        camera.layers.mask = mask;
      }
    },
    [camera],
  );

  /** Executa um item. Devolve false se tem de esperar (volta para o fim da fila). */
  const run = useCallback(
    (it: Item): boolean => {
      const s = st.current;
      switch (it.kind) {
        case "compile": {
          // o trabalho de compilação acontece no processo da GPU: sem compilação paralela, no
          // máximo 1 programa NOVO por passo (senão a GPU fica ocupada e o navegador não
          // produz frames); com ela, no máximo 3 programas em curso de cada vez. Materiais
          // diferentes com o mesmo programa (ex.: as faíscas de cada peça) reutilizam o
          // programa em cache e não contam.
          if (s.parallel ? s.pending.size >= 3 : s.newThisTick >= 1)
            return false;
          // (marcado como compilado mesmo que a compilação seja saltada: a fila nunca encrava)
          for (const m of materialsOf(it.obj)) s.compiled.add(m);
          const before = gl.info.programs?.length ?? 0;
          let hasLight = false;
          it.obj.traverse((o) =>
            (o as THREE.Light).isLight ? (hasLight = true) : null,
          );
          // compila os materiais desta malha com as luzes (constantes) da cena
          if (!hasLight)
            withCameraLayer(() =>
              withTarget(() => gl.compile(it.obj, camera, scene)),
            );
          const created = (gl.info.programs ?? []).slice(before) as unknown as {
            isReady: () => boolean;
            getUniforms: () => unknown;
          }[];
          s.newThisTick += created.length;
          for (const pr of created) s.pending.add(pr);
          return true;
        }
        case "link": {
          if (!s.compiled.has(it.mat)) return false; // ainda não foi compilado
          if (s.linked.has(it.mat)) return true;
          const progs = programsOf(it.mat);
          // com compilação paralela: só conclui quando o driver tem o programa pronto
          if (s.parallel && it.polls < 120 && progs.some((p) => !p.isReady())) {
            it.polls++;
            return false;
          }
          progs.forEach((p) => {
            p.getUniforms();
            s.pending.delete(p);
          });
          s.linked.add(it.mat);
          return true;
        }
        case "texture":
          if (
            it.tex.image ||
            (it.tex as THREE.Texture & { isCubeTexture?: boolean })
              .isCubeTexture
          )
            gl.initTexture(it.tex);
          return true;
        case "draw": {
          // só desenha quando todos os materiais do lote estão compilados E ligados
          // (o desenho nunca dispara uma compilação síncrona)
          if (
            it.polls < 600 &&
            it.objs.some((o) => materialsOf(o).some((m) => !s.linked.has(m)))
          ) {
            it.polls++;
            return false;
          }
          withCameraLayer(() => warmDraw(it.objs));
          return true;
        }
      }
    },
    [gl, camera, scene, withTarget, withCameraLayer, programsOf, warmDraw],
  );

  /** Um passo de preparação (com orçamento de tempo). */
  const step = () => {
    const s = st.current;
    const now = performance.now();
    const p = heroState.progress;
    if (p !== s.lastP) ((s.lastP = p), (s.lastMove = now));

    // frame a seguir à conclusão do estágio 0: a cena completa já foi desenhada → troca o poster
    if (s.readyAt && now >= s.readyAt) {
      s.readyAt = 0;
      onReady?.();
    }
    if (s.nextRequest && now >= s.nextRequest) {
      s.nextRequest = 0;
      requestStage(s.done + 1);
    }

    const stage = s.done + 1;
    if (stage > 2 || stage > s.scanned) return;
    const q = s.queues[stage];
    // orçamento por frame: estágio 0 (atrás da imagem inicial, o canvas não desenha nada) → 16 ms;
    // fase seguinte quase a chegar → 12 ms; scroll parado → 8 ms; durante o scroll → 4 ms
    const urgent = p >= STAGE_NEEDED_AT[stage] + 0.1;
    const budget =
      stage === 0 ? 16 : urgent ? 12 : now - s.lastMove > 250 ? 8 : 4;
    let waits = 0;
    s.newThisTick = 0;
    while (q.length && performance.now() - now < budget && waits < q.length) {
      const it = q.shift()!;
      if (run(it)) waits = 0;
      else (q.push(it), waits++);
    }
    if (q.length === 0) {
      // estágio concluído (nova procura para apanhar peças montadas entretanto)
      scan();
      if (s.queues[stage].length) return void invalidate();
      s.done = stage;
      heroState.prepared = stage;
      if (stage === 0) {
        camera.layers.set(0); // este frame já desenha a cena completa
        s.readyAt = now + 1;
      }
      if (stage < 2) s.nextRequest = now + 250;
    }
    invalidate();
  };
  const stepRef = useRef(step);
  stepRef.current = step;
  // dentro do ciclo de render enquanto o banner está visível…
  useFrame(() => stepRef.current());
  // …e por temporizador quando não está (o render pára fora do ecrã, a preparação não):
  // quem fizer scroll até ao fim e voltar encontra a cena já preparada
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!heroState.visible) stepRef.current();
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  return null;
}

/**
 * Resolução adaptativa: mede o ritmo real dos frames SÓ enquanto a animação avança
 * (no modo "a pedido" dos telemóveis os frames em repouso não contam) e ajusta o
 * devicePixelRatio em degraus. A mudança só é aplicada quando o scroll pára, para
 * nunca redimensionar o canvas a meio de um gesto (isso causava soluços).
 */
function AdaptiveResolution({
  range: [min, max],
  touch,
}: {
  range: [number, number];
  touch: boolean;
}) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({
    cur: max,
    lastP: -1,
    wasMoving: false,
    lastMove: 0,
    samples: [] as number[],
    pending: 0,
    ups: 0,
    cooldown: 0,
  });
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
        if (typical > budget * 1.3 && s.cur > min)
          s.pending = Math.max(min, +(s.cur - 0.2).toFixed(2));
        else if (typical < budget * 0.6 && s.cur < max && s.ups < 2)
          s.pending = Math.min(max, +(s.cur + 0.15).toFixed(2));
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
    let last = 0;
    let lastScroll = 0;
    // a animação pede frames a cada passo, mas em ecrãs tácteis: ≤ 30 fps, e ≤ 15 fps enquanto
    // o utilizador está a fazer scroll (o gesto tem prioridade sobre a animação)
    const request = () => {
      const now = performance.now();
      const gap = now - lastScroll < 150 ? 66 : 32;
      if (now - last < gap) return;
      last = now;
      invalidate();
    };
    const onScroll = () => (lastScroll = performance.now());
    invalidate();
    const off = onHeroProgress(request);
    const idleTimer = window.setInterval(() => invalidate(), 66);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      off();
      window.clearInterval(idleTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [invalidate]);
  return null;
}
