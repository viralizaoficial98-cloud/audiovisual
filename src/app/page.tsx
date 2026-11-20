import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { CinematicHero } from "@/components/hero/CinematicHero";
import { Services } from "@/components/sections/Services";
import { PodcastRental } from "@/components/sections/PodcastRental";
import { Events } from "@/components/sections/Events";
import { StudioGallery } from "@/components/sections/StudioGallery";
import { Portfolio } from "@/components/sections/Portfolio";
import { Process } from "@/components/sections/Process";
import { Contact } from "@/components/sections/Contact";
import { QuoteModal } from "@/components/forms/QuoteModal";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <CinematicHero />
        <div className="silver-transition" aria-hidden />
        <div id="conteudo" className="theme-silver">
          <Services />
          <PodcastRental />
          <Events />
          <StudioGallery />
          <Portfolio />
          <Process />
          <Contact />
        </div>
      </main>
      <div className="theme-silver">
        <Footer />
      </div>
      <WhatsAppFab />
      <QuoteModal />
    </>
  );
}
