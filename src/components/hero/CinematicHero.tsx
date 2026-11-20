"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildHeroTimeline, ScrollTrigger } from "@/animation/heroTimeline";
import { heroState, onHeroProgress, setHeroProgress } from "@/animation/heroState";
import { SHOWCASE } from "@/animation/phases";
import { detectTier, detectWebGL, prefersReducedMotion, type QualityTier } from "@/lib/quality";
import { HeroOverlay } from "./HeroOverlay";
import { HeroLoader } from "./HeroLoader";
import { ImageSequenceFallback, StaticHero } from "./HeroFallback";
import { CameraShowcase } from "./CameraShowcase";

const HeroScene = dynamic(() => import("@/scene/HeroScene"), { ssr: false, loading: () => null });

type Mode = "pending" | "webgl" | "fallback" | "static";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Banner cinematográfico. A secção tem altura virtual (≈6 ecrãs) e o palco fica fixo
 * (position: sticky) enquanto o scroll percorre a timeline. No fim da secção o palco
 * solta-se naturalmente e a página continua — sem saltos de layout (não há pin-spacer).
 */
export function CinematicHero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [tier, setTier] = useState<QualityTier>("medium");
  const [ready, setReady] = useState(false);
  const [firstImage, setFirstImage] = useState(false);
  const [active, setActive] = useState(true);

  // decide o modo no cliente (WebGL, fallback por imagens, ou estático por reduced-motion)
  useIsoLayoutEffect(() => {
    if (prefersReducedMotion()) setMode("static");
    else if (!detectWebGL()) setMode("fallback");
    else {
      setTier(detectTier());
      setMode("webgl");
    }
  }, []);

  // timeline GSAP + ScrollTrigger
  useIsoLayoutEffect(() => {
    if (mode !== "webgl" && mode !== "fallback") return;
    const sec = section.current;
    const stg = stage.current;
    if (!sec || !stg) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const tl = buildHeroTimeline(sec, stg, { scrub: coarse ? 0.6 : 1 });
    tlRef.current = tl;
    // se a página abrir a meio (refresh/âncora), sincroniza imediatamente
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const st = tl.scrollTrigger;
      if (st) {
        tl.progress(st.progress);
        setHeroProgress(st.progress);
      }
    });
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      tlRef.current = null;
    };
  }, [mode]);

  // pausa o render WebGL quando o banner sai do ecrã
  useEffect(() => {
    const sec = section.current;
    if (!sec) return;
    const io = new IntersectionObserver(([e]) => {
      heroState.visible = e.isIntersecting;
      inView = e.isIntersecting;
      update();
    });
    // Em ecrãs horizontais as fotografias oficiais cobrem todo o ecrã nas Partes 1–3:
    // a cena 3D (invisível por trás) deixa de ser desenhada até à transição frontal.
    let inView = true;
    const update = () => {
      const landscape = window.innerWidth / window.innerHeight >= 1.2;
      const covered = landscape && heroState.progress < SHOWCASE.t34[0] - 0.008;
      setActive(inView && !covered);
    };
    const off = onHeroProgress(update);
    window.addEventListener("resize", update);
    update();
    io.observe(sec);
    return () => {
      io.disconnect();
      off();
      window.removeEventListener("resize", update);
    };
  }, []);

  const skip = useCallback(() => {
    const sec = section.current;
    if (!sec) return;
    const end = sec.offsetTop + sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: end, behavior: "instant" as ScrollBehavior });
    ScrollTrigger.update();
    const tl = tlRef.current;
    if (tl) {
      tl.scrollTrigger?.getTween()?.progress(1);
      tl.progress(1);
    }
    setHeroProgress(1);
    // leva o foco para o título final (acessibilidade)
    requestAnimationFrame(() => document.getElementById("hero-title")?.focus({ preventScroll: true }));
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onFirstImage = useCallback(() => setFirstImage(true), []);

  if (mode === "static") return <StaticHero />;

  return (
    <section
      ref={section}
      id="inicio"
      aria-label="Introdução cinematográfica: montagem do universo audiovisual Viraliza"
      className="relative h-[600svh] md:h-[740vh]"
    >
      <div ref={stage} className="sticky top-0 h-[100svh] w-full overflow-hidden bg-ink">
        <div className="absolute inset-0" aria-hidden>
          {mode === "webgl" && <HeroScene tier={tier} active={active} onReady={onReady} />}
          {mode === "fallback" && <ImageSequenceFallback />}
        </div>
        {/* introdução com as 4 imagens oficiais da câmara (2.5D) por cima da cena 3D */}
        {(mode === "webgl" || mode === "fallback") && <CameraShowcase tier={mode === "fallback" ? "low" : tier} onFirstImage={onFirstImage} />}
        <HeroOverlay onSkip={skip} />
        {mode !== "fallback" && <HeroLoader done={ready && firstImage} />}
        <p className="sr-only">
          Animação controlada pelo scroll: uma câmara profissional Viraliza é montada peça a peça, seguida do sistema de iluminação e da construção
          da sala de podcast. Pode saltar a introdução a qualquer momento.
        </p>
      </div>
    </section>
  );
}
