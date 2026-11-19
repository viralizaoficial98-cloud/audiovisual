# VIRALIZA — Audiovisual & Podcast

Website institucional e comercial com **banner cinematográfico 3D controlado pelo scroll**: a câmara Viraliza é montada peça a peça, segue-se o sistema de iluminação e a construção da sala de podcast, até à revelação do estúdio completo. Depois, o scroll liberta-se para as secções comerciais.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger · Three.js · React Three Fiber · Drei · postprocessing.

```bash
npm install
npm run dev          # desenvolvimento em http://localhost:3000
npm run build && npm start
npm test             # testes unitários (preços, mensagens, validações, timeline)
npm run test:e2e     # testes no browser (precisa do servidor a correr)
```

## Como funciona a animação

| Fase | Progresso | O que acontece |
|---|---|---|
| 1 — Visão | 0–15% | ~30 peças da câmara suspensas em vista explodida; afastam-se ligeiramente ao começar o scroll |
| 2 — Câmara | 15–35% | Cada peça encaixa com a sua trajectória (estrutura, sensor, circuitos, ópticas, objectiva, pára-sol, painel, monitor, bateria, microfone, cartões, parafusos que roscam); a câmara roda |
| 3 — Luz | 35–55% | A câmara viaja até ao tripé; tripés levantam-se do chão, abrem as pernas, colunas sobem; painéis LED encaixam e abrem as abas; softbox expande; cabos são passados; luzes reais acendem |
| 4 — Estúdio | 55–85% | 14 etapas: paredes, painéis acústicos, revestimentos, fitas LED, logotipo, TV, estantes, cadeiras/sofás, mesa, microfones, acessórios, câmaras, iluminação, mesa de produção, luz final |
| 5 — Revelação | 85–100% | Dolly-out, título, subtítulo, botões e preço |

- **Uma timeline GSAP** (`src/animation/heroTimeline.ts`) com `ScrollTrigger` + `scrub` anima o progresso global e os textos. É reversível por construção.
- **A cena 3D lê o progresso a cada frame** e calcula o estado de cada peça como função pura de `p` (`src/scene/parts/Assemble.tsx`) — scroll para cima produz exactamente o estado inverso.
- O palco usa `position: sticky` numa secção de ~6 ecrãs de altura: não há pin-spacer, logo não há saltos de layout quando a animação termina.
- **Todas as janelas de tempo** estão em `src/animation/phases.ts`. Os movimentos da câmara virtual estão em `src/scene/CameraRig.tsx`.

### Limitações (transparência)

- **Não havia modelos 3D (GLB) nos anexos** — só imagens PNG/WebP, que não têm geometria. Por isso, a câmara, as luzes e o estúdio foram **modelados proceduralmente em Three.js** (primitivas, texturas geradas em canvas com o logotipo real). A montagem é 3D real, com peças individuais, mas o nível de detalhe é de *motion design* estilizado, não fotorrealista como os renders.
- Para aproximar ao fotorrealismo dos renders, o passo seguinte é encomendar/criar modelos GLB (Blender) com as peças separadas e com os mesmos nomes; o motor de montagem (`Assemble`) mantém-se igual — basta trocar a geometria em `src/scene/models/`.
- O **logotipo** foi recortado do anexo `PodCast-Parte1` (sem redesenho), com fundo removido. A resolução de origem é limitada (~1160 px); recomenda-se substituir `public/brand/*.png` pelo ficheiro vectorial oficial quando disponível.
- As imagens do estúdio estão identificadas no site como **visualizações conceptuais**.

### Desempenho e acessibilidade

- 3 níveis de qualidade detectados automaticamente (`src/lib/quality.ts`; forçar com `?quality=high|medium|low`): resolução, sombras, bloom, chão reflector, cones de luz e densidade de adereços. O `PerformanceMonitor` baixa a resolução se o FPS cair.
- Shaders pré-compilados antes de remover o loader; render pausa quando o banner sai do ecrã.
- Sem WebGL → sequência de imagens sincronizada com o scroll (fallback 2D assumido). `prefers-reduced-motion` → banner estático, sem WebGL.
- No mobile: secção mais curta, FOV adaptado a ecrãs verticais e enquadramento centrado no set de podcast.
- Botão **Saltar introdução** sempre visível durante a sequência.

## Conteúdos e configuração

- Contactos, preço por hora e URL: `src/config/site.ts`
- Serviços, tipos de gravação/evento: `src/content/services.ts`
- Galeria e processo: `src/content/studio.ts`
- Portfólio: `src/content/portfolio.ts` (vazio de propósito — sem projectos inventados; instruções no ficheiro)
- `.env.example`:
  - `NEXT_PUBLIC_SITE_URL` — **confirmar o domínio final** (por omissão `https://audiovisual.viralizahost.com`, usado em canonical/sitemap/OG).
  - `CONTACT_WEBHOOK_URL` — opcional; o formulário de contacto envia JSON para este webhook (ex.: fluxo n8n que envia e-mail). Sem ele, o formulário oferece WhatsApp/e-mail com a mensagem preenchida.

Reserva e orçamentos são enviados por **WhatsApp** (`wa.me/244973581978`) com os dados organizados. A reserva é sempre um **pedido sujeito a confirmação** — não existe agenda real.

## Estrutura

```
src/
  animation/   timeline GSAP, fases, estado partilhado, matemática/easing
  scene/       cena WebGL: driver, Assemble, modelos (câmara, iluminação, estúdio, adereços), câmara virtual, ambiente
  components/  hero (banner + overlays + fallbacks), layout, sections, forms, ui
  content/     textos e listas editáveis
  config/      contactos e preços
  lib/         formatação, validação, WhatsApp, qualidade
tests/         unitários (tsx --test) e e2e (Playwright)
```
