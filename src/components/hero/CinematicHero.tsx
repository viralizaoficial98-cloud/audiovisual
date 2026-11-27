"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildHeroTimeline } from "@/animation/heroTimeline";
import { createHeroPlayer, type HeroPlayer } from "@/animation/heroPlayer";
import { heroState } from "@/animation/heroState";
import { detectTier, detectWebGL, isTierForced, isWeakDevice, prefersReducedMotion, type QualityTier } from "@/lib/quality";
import { HeroOverlay } from "./HeroOverlay";
import { HeroLoader, HeroPoster } from "./HeroLoader";
import { ImageSequenceFallback, StaticHero } from "./HeroFallback";
import { GoldParticles } from "./GoldParticles";

// o motor 3D (three.js + cena) é um chunk à parte, carregado em segundo plano
const loadScene = () => import("@/scene/HeroScene");
const HeroScene = dynamic(loadScene, { ssr: false, loading: () => null });

type Mode = "pending" | "webgl" | "fallback" | "static";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Banner cinematográfico com a altura de UM ecrã. A montagem 3D (câmara → luzes → estúdio →
 * revelação) é reproduzida no tempo enquanto o banner está visível — o scroll da página é
 * 100% nativo: um gesto normal passa logo para a secção seguinte, a animação nunca retém o
 * utilizador. (Antes: secção de 1120vh/905svh com o palco "sticky" e a animação presa ao
 * scroll — era preciso fazer scroll ~10 ecrãs para sair do banner.)
 */
export function CinematicHero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const player = useRef<HeroPlayer | null>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [tier, setTier] = useState<QualityTier>("medium");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  // decide o modo no cliente: WebGL (todos os aparelhos capazes, desktop e mobile); sequência
  // de imagens (sem WebGL); ou composição final estática (movimento reduzido, ou aparelho que
  // não consegue reproduzir a animação adequadamente — pela capacidade real, não pela largura)
  useIsoLayoutEffect(() => {
    if (prefersReducedMotion()) return setMode("static");
    if (!detectWebGL()) return setMode("fallback");
    if (isWeakDevice() && !isTierForced()) return setMode("static");
    const t = detectTier();
    loadScene(); // começa já a descarregar o motor 3D (em paralelo com a hidratação)
    setTier(t);
    setMode("webgl");
  }, []);

  // timeline (textos + progresso da cena) conduzida pelo leitor no tempo
  useIsoLayoutEffect(() => {
    if (mode !== "webgl" && mode !== "fallback") return;
    const stg = stage.current;
    if (!stg) return;
    const tl = buildHeroTimeline(stg);
    const pl = createHeroPlayer(tl, { gated: mode === "webgl" });
    player.current = pl;
    // sem WebGL não há nada a preparar: a sequência de imagens começa já
    if (mode === "fallback") pl.start();
    const w = window as unknown as { __viralizaPlayer?: HeroPlayer };
    w.__viralizaPlayer = pl;
    return () => {
      pl.destroy();
      tl.kill();
      player.current = null;
      if (w.__viralizaPlayer === pl) delete w.__viralizaPlayer;
    };
  }, [mode]);

  // a cena 3D desenhou o 1.º frame real → a sequência começa
  useEffect(() => {
    if (ready) player.current?.start();
  }, [ready, mode]);

  // visibilidade: o render WebGL pára fora do ecrã; a sequência pausa com < 35% visível
  useEffect(() => {
    const sec = section.current;
    if (!sec) return;
    const io = new IntersectionObserver(
      ([e]) => {
        heroState.visible = e.isIntersecting;
        setActive(e.isIntersecting);
        player.current?.setVisible(e.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.35] },
    );
    io.observe(sec);
    return () => io.disconnect();
  }, [mode]);

  const skip = useCallback(() => {
    player.current?.skip();
    // leva o foco para o título final (acessibilidade) sem mover a página
    requestAnimationFrame(() => document.getElementById("hero-title")?.focus({ preventScroll: true }));
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  if (mode === "static") return <StaticHero />;

  return (
    <section ref={section} id="inicio" aria-label="Introdução cinematográfica: montagem do universo audiovisual Viraliza" className="relative h-[100svh] min-h-[560px]">
      <div ref={stage} className="relative h-full w-full overflow-hidden bg-ink" data-scene-ready={ready ? "" : undefined}>
        {/* a cena é decorativa: não captura toques nem cliques (o gesto vai sempre para a página) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {mode === "webgl" && <HeroScene tier={tier} active={active} onReady={onReady} />}
          {mode === "fallback" && <ImageSequenceFallback />}
        </div>
        {/* 1.º ecrã imediato (render da própria cena em p = 0), POR CIMA do canvas enquanto
            este prepara os shaders — desvanece quando o primeiro frame 3D real foi desenhado */}
        {mode !== "fallback" && <HeroPoster hidden={ready} />}
        {/* partículas douradas em primeiro plano durante a montagem magnética */}
        {mode === "webgl" && <GoldParticles tier={tier} />}
        <HeroOverlay onSkip={skip} />
        {mode !== "fallback" && <HeroLoader done={ready} />}
        <p className="sr-only">
          Animação de introdução: uma câmara profissional Viraliza é montada peça a peça, seguida do sistema de iluminação e da construção da sala
          de podcast. Pode continuar a navegar a qualquer momento ou saltar a introdução.
        </p>
      </div>
    </section>
  );
}
