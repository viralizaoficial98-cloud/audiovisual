"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Revelação subtil ao entrar no ecrã (fade + subida curta). Usada só nas secções
 * comerciais; o banner tem a sua própria timeline. Respeita prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={cn("transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)]", className)}
      style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : `translateY(${y}px)`, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({ eyebrow, title, intro, align = "left" }: { eyebrow: string; title: ReactNode; intro?: ReactNode; align?: "left" | "center" }) {
  return (
    <Reveal className={cn("mb-12 max-w-3xl md:mb-16", align === "center" && "mx-auto text-center")}>
      <p className={cn("eyebrow mb-5", align === "center" && "justify-center")}>
        <span className="h-px w-8 bg-brand" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="section-title">{title}</h2>
      {intro && <p className="mt-6 text-base text-muted leading-relaxed md:text-lg">{intro}</p>}
    </Reveal>
  );
}
