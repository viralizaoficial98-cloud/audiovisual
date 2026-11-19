"use client";

import { useEffect, useState } from "react";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/Icons";

/** Botão flutuante de WhatsApp — só aparece depois da introdução, para não competir com ela. */
export function WhatsAppFab() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => {
      const hero = document.getElementById("inicio");
      setShow(!!hero && window.scrollY > hero.offsetTop + hero.offsetHeight - window.innerHeight * 0.5);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <a
      href={whatsappLink("Olá, VIRALIZA! Vim pelo site e gostaria de mais informações.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar connosco pelo WhatsApp"
      tabIndex={show ? 0 : -1}
      className={`fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-ink shadow-[0_10px_30px_-5px_rgba(37,211,102,.5)] transition-[opacity,transform] duration-500 hover:scale-105 ${show ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
    >
      <IconWhatsApp size={26} />
    </a>
  );
}
