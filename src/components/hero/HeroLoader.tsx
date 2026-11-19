"use client";

import { useEffect, useState } from "react";

/** Ecrã de preparação enquanto a cena 3D compila (normalmente < 1 s). */
export function HeroLoader({ done }: { done: boolean }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, [done]);
  if (gone) return null;
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-ink transition-opacity duration-700 ${done ? "pointer-events-none opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/viraliza-mark.png" alt="" width={56} height={49} className="animate-pulse-soft h-12 w-auto" />
      <div className="h-px w-40 overflow-hidden bg-white/10">
        <div className="animate-loader h-full w-1/3 bg-brand" />
      </div>
      <p className="text-[10px] font-semibold tracking-[0.36em] text-white/50 uppercase">A preparar o estúdio</p>
    </div>
  );
}
