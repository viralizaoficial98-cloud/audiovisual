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

### Introdução: montagem magnética da câmara (3D real)

Uma **única câmara 3D** (`src/scene/models/CinemaCamera.tsx`) com ~35 peças independentes. Cada peça usa `MagneticPart` (`src/scene/parts/MagneticPart.tsx`) e percorre, como função pura do scroll:

chão (pousada, altura de repouso calculada pela caixa envolvente) → vibração → levitação → constelação → atracção em curva Bézier com orientação progressiva e oscilação amortecida → inserção ao longo do eixo de encaixe → acoplamento (ex.: conjunto óptico desliza para o corpo) → micro-impacto com faísca dourada. Linhas-guia douradas ligam cada peça ao seu destino durante o voo.

| Progresso de cena | Etapa (`ASSEMBLY` em `phases.ts`) |
|---|---|
| 0–6% | Peças pousadas no chão (poça de luz dourada, campo magnético) |
| 6–12,5% | Levitação para a constelação (estado "desmontado" das referências) |
| 12–18% | Estrutura: núcleo, base, molduras metálicas, calhas |
| 18–24% | Sensor, placa electrónica, ventoinha, cartões 256GB, módulo áudio |
| 24–30% | Óptica: anel de encaixe, elementos ópticos e anéis a rodar, objectiva, pára-sol, acoplamento ao corpo |
| 30–36,2% | Painéis (esquerdo, superior, VIRALIZA/4K), bateria, pega, monitor, microfone, parafusos a roscar |
| 36,2–40% | Revelação: varrimento dourado, logotipo em destaque, rotação para a frente, reflexo óptico na lente |

As superfícies visíveis usam **texturas recortadas das 4 imagens oficiais** (`scripts/extract-camera-textures.py` → `public/textures/camera/`): painel VIRALIZA/4K, microfone com logotipo, objectiva (AF/MF, STABILIZER), vidro da lente, placa, sensor, monitor, cartões, bateria e ventoinha. As fotografias já não são usadas como slides; continuam nas secções do site e no fallback sem WebGL (uma imagem única).

### Sequência completa

| Fase | Progresso de cena | O que acontece |
|---|---|---|
| 1–2 — Visão / Câmara | 0–40% | Montagem magnética da câmara (acima) |
| 3 — Luz | 35–55% | A câmara viaja até ao tripé; tripés levantam-se do chão, abrem as pernas, colunas sobem; painéis LED encaixam e abrem as abas; softbox expande; cabos são passados; luzes reais acendem |
| 4 — Estúdio | 55–85% | 14 etapas: paredes, painéis acústicos, revestimentos, fitas LED, logotipo, TV, estantes, cadeiras/sofás, mesa, microfones, acessórios, câmaras, iluminação, mesa de produção, luz final |
| 5 — Revelação | 85–100% | Dolly-out, título, subtítulo, botões e preço |

- **Uma timeline GSAP** (`src/animation/heroTimeline.ts`) com `ScrollTrigger` + `scrub` anima o progresso global e os textos. É reversível por construção.
- **A cena 3D lê o progresso a cada frame** e calcula o estado de cada peça como função pura de `p` (`src/scene/parts/Assemble.tsx`) — scroll para cima produz exactamente o estado inverso.
- O palco usa `position: sticky` numa secção de ~6 ecrãs de altura: não há pin-spacer, logo não há saltos de layout quando a animação termina.
- **Todas as janelas de tempo** estão em `src/animation/phases.ts`. Os movimentos da câmara virtual estão em `src/scene/CameraRig.tsx`.

### Limitações (transparência)

- A câmara é **3D procedural** revestida com texturas das fotografias oficiais. Para fotorrealismo total (detalhes finos, cabos, parafusos reais, materiais PBR) seria necessário um modelo GLB modelado à mão (Blender) com as mesmas peças separadas — o motor `MagneticPart` aceita-o sem alterações.
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
