"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nav } from "@/config/site";
import { cn } from "@/lib/cn";
import { IconClose } from "@/components/ui/Icons";

/**
 * Header discreto: transparente sobre o banner, fundo preto semitransparente depois
 * da animação. Menu móvel acessível (focus trap simples, Esc fecha, aria-expanded).
 */
export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById("inicio");
      const limit = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight * 0.6 : 80;
      setSolid(window.scrollY > limit);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const els = Array.from(panel.current.querySelectorAll<HTMLElement>("a,button"));
        const [f, l] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === f) {
          e.preventDefault();
          l.focus();
        } else if (!e.shiftKey && document.activeElement === l) {
          e.preventDefault();
          f.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      toggle.current?.focus();
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500",
        solid ? "border-b border-white/8 bg-ink/90 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:h-20 md:px-10">
        <a href="#inicio" className="flex items-center" aria-label="VIRALIZA Audiovisual & Podcast — início">
          <Image src="/brand/viraliza-logo.png" alt="VIRALIZA" width={1162} height={248} priority className="h-6 w-auto md:h-7" />
          <span className="ml-3 hidden border-l border-white/20 pl-3 text-[10px] font-semibold tracking-[0.28em] text-white/60 uppercase sm:inline">
            Audiovisual &amp; Podcast
          </span>
        </a>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[13px] font-medium text-white/75">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform hover:text-white hover:after:scale-x-100">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a href="#reserva" className="hidden rounded-full bg-brand px-5 py-2.5 text-[12px] font-bold tracking-[0.14em] text-ink uppercase transition hover:bg-white sm:inline-flex">
            Reservar podcast
          </a>
          <button
            ref={toggle}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-ink/40 backdrop-blur-md lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5" aria-hidden>
              <span className={cn("absolute left-0 h-[1.5px] w-5 bg-white transition", open ? "top-1.5 rotate-45" : "top-0")} />
              <span className={cn("absolute left-0 h-[1.5px] w-5 bg-white transition", open ? "top-1.5 -rotate-45" : "top-3")} />
            </span>
          </button>
        </div>
      </div>

      {open &&
        createPortal(
        <div id="menu-movel" ref={panel} role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] flex flex-col bg-ink/97 px-6 pt-6 pb-10 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <Image src="/brand/viraliza-logo.png" alt="VIRALIZA" width={1162} height={248} className="h-6 w-auto" />
            <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15" aria-label="Fechar menu">
              <IconClose />
            </button>
          </div>
          <nav aria-label="Navegação móvel" className="mt-12 flex-1">
            <ul className="space-y-2">
              {nav.map((n, i) => (
                <li key={n.href}>
                  <a href={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-3 font-display text-3xl font-semibold">
                    <span className="text-xs text-brand">0{i + 1}</span>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a href="#reserva" onClick={() => setOpen(false)} className="btn-primary w-full">
            Reservar podcast
          </a>
        </div>,
          document.body,
        )}
    </header>
  );
}
