import { CinematicHero } from "@/components/hero/CinematicHero";

export default function Home() {
  return (
    <main>
      <CinematicHero />
      <div id="conteudo" className="h-[150vh] bg-ink" />
    </main>
  );
}
