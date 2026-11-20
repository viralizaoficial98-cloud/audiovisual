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

### Fase LUZ: montagem robótica magnética do kit de iluminação (3D real)

Módulos em `src/scene/models/lighting/`: `kitLayout.ts` (posições finais = Luzes-Parte2, flat-lay = Luzes-Parte1, janelas), `equipment.tsx` (modelos), `LightingKit.tsx` (montagem com `MagneticPart`) e `effects.tsx` (luz de trabalho, reflexos, onda magnética, acendimento, parede de fundo). ~30 peças independentes:

| Fase LUZ | Progresso de cena | O que acontece |
|---|---|---|
| F1 0–15% | 0,400–0,4225 | Tudo desmontado no chão (flat-lay); reflexo dourado a percorrer as peças; a câmara chega ao tripé |
| F2 15–30% | 0,4225–0,445 | Onda de energia magnética; adaptadores, rodas, fontes e restantes peças levitam |
| F3 30–50% | 0,445–0,475 | Tripés chegam de pé, abrem as pernas (o tripé desce até os pés tocarem o chão), colunas telescópicas sobem; rodas encaixam no C-stand; adaptadores rodam e encaixam; girafa sobe e eleva o braço; mala e saco de areia |
| F4 50–75% | 0,475–0,5125 | Painéis LED descem nos espigões, abas encaixam e abrem; softbox abre o octógono e sobe para a girafa; difusor encaixa; ring light roda e encaixa; telemóvel, controlador, comando, fontes; cabos desenhados até às ligações |
| F5 75–90% | 0,5125–0,535 | Acendimento sequencial (LED esq., LED dir., ring light, softbox) com luzes reais, reflexos nas estruturas, parede com moldura LED e logotipo sobe e acende |
| F6 90–100% | 0,535–0,55 | Afastamento da câmara para a composição de Luzes-Parte2 + pausa (5% do scroll) |

Durante a fase LUZ os painéis apontam para o centro do kit (faces visíveis, como na referência); quando o estúdio começa a ser construído rodam para o set de podcast e a parede de fundo recolhe para o chão.

O scroll está dividido em troços (`KNOTS` em `phases.ts`, banner de 1120vh / 905svh no mobile): câmara ≈ 370vh, LUZ ≈ 230vh + 45vh de pausa, estúdio ≈ 360vh, banner final ≈ 114vh. Os valores em vh da câmara e da LUZ são os mesmos das versões aprovadas. A timeline GSAP tem de durar exactamente 1 — há um aviso em desenvolvimento se algum tween ultrapassar o fim.

### Fase ESTÚDIO: montagem robótica magnética da sala de podcast (3D real)

Módulo `src/scene/models/studio/`: `studioLayout.ts` (planta = imagem oficial Podcast Parte3, flat-lay, onda de activação) e `PodcastStudio.tsx` (~70 peças com `MagneticPart`, fitas LED, acendimento progressivo e banner final). Reutiliza os modelos de `props.tsx` e do kit de iluminação.

| Estúdio | Progresso de cena | O que acontece |
|---|---|---|
| 0% | 0,55 | Sala vazia e escura; as paredes sobem; todas as peças desmontadas, pousadas no chão em filas organizadas |
| 6–24% | 0,571–0,634 | Onda de activação magnética: as peças levitam (por distância ao set) e esperam numa "nuvem" alta, a rodar |
| 25% | 0,6375 | Ripas acústicas, tecto acústico e espuma encaixam; prateleiras e tábuas a chegar |
| 50% | 0,725 | Tripés, softboxes, LEDs baixos, calha do tecto, painéis de identidade e ar condicionado; tapete, mesa e cadeirões |
| 75% | 0,8125 | Braços e microfones, câmara no tripé, mesa de produção e áudio, ecrã, decoração das prateleiras; os LEDs do kit são orientados para o set |
| 100% | 0,90 | Fitas LED douradas e iluminação final; o logotipo VIRALIZA é a última peça |
| Banner | 0,90–1 | Brilho dourado no logotipo, aproximação da câmara e estabilização; título e botões; o scroll segue para as secções |

Durante a montagem, as peças que esperam a meio ou à frente da sala sobem para uma nuvem alta (y ≥ 2,7 m) para nunca ficarem entre a câmara e o set. O tapete é a única peça que não voa: desenrola-se no lugar. Os focos do kit baixam durante a montagem e voltam ao máximo quando são reorientados para o set.

### Sequência completa

| Fase | Progresso de cena | O que acontece |
|---|---|---|
| 1–2 — Visão / Câmara | 0–40% | Montagem magnética da câmara (acima) |
| 3 — Luz | 40–55% | Montagem magnética do kit de iluminação (acima) |
| 4 — Estúdio | 55–90% | Montagem magnética da sala de podcast (acima) |
| 5 — Banner | 90–100% | Estúdio completo como banner final |
| 3 — Luz | 35–55% | A câmara viaja até ao tripé; tripés levantam-se do chão, abrem as pernas, colunas sobem; painéis LED encaixam e abrem as abas; softbox expande; cabos são passados; luzes reais acendem |
| 4 — Estúdio | 55–85% | 14 etapas: paredes, painéis acústicos, revestimentos, fitas LED, logotipo, TV, estantes, cadeiras/sofás, mesa, microfones, acessórios, câmaras, iluminação, mesa de produção, luz final |
| 5 — Revelação | 85–100% | Dolly-out, título, subtítulo, botões e preço |

- **Uma timeline GSAP** (`src/animation/heroTimeline.ts`) com `ScrollTrigger` + `scrub` anima o progresso global e os textos. É reversível por construção.
- **A cena 3D lê o progresso a cada frame** e calcula o estado de cada peça como função pura de `p` (`src/scene/parts/Assemble.tsx`) — scroll para cima produz exactamente o estado inverso.
- O palco usa `position: sticky` numa secção de ~6 ecrãs de altura: não há pin-spacer, logo não há saltos de layout quando a animação termina.
- **Todas as janelas de tempo** estão em `src/animation/phases.ts`. Os movimentos da câmara virtual estão em `src/scene/CameraRig.tsx`.

### Limitações (transparência)

- Estúdio: a composição final segue a Podcast Parte3 (mesmos elementos, nas mesmas zonas), mas o render 3D é menos exuberante que a imagem: menos brilho e detalhe nas prateleiras, câmaras dos extremos mais pequenas no enquadramento, tapete sem pêlo, plantas estilizadas. A softbox da girafa (montada na fase LUZ aprovada) fica entre o set e o ecrã, onde a referência mostra o centro limpo. Não há passagem para a fotografia no fim: a cena 3D é o próprio banner.
- Kit de iluminação: geometria 3D coerente com as imagens + texturas recortadas da imagem oficial (mala, controlador, saco de areia, base do ring light). A softbox aponta para o set de podcast (vemos o lado de trás e não o difusor de frente como em Luzes-Parte2), não há plantas na fase LUZ e o render é mais escuro e menos fotorrealista do que a imagem de referência.
- A câmara é **3D procedural** revestida com texturas das fotografias oficiais. Para fotorrealismo total (detalhes finos, cabos, parafusos reais, materiais PBR) seria necessário um modelo GLB modelado à mão (Blender) com as mesmas peças separadas — o motor `MagneticPart` aceita-o sem alterações.
- **Não havia modelos 3D (GLB) nos anexos** — só imagens PNG/WebP, que não têm geometria. Por isso, a câmara, as luzes e o estúdio foram **modelados proceduralmente em Three.js** (primitivas, texturas geradas em canvas com o logotipo real). A montagem é 3D real, com peças individuais, mas o nível de detalhe é de *motion design* estilizado, não fotorrealista como os renders.
- Para aproximar ao fotorrealismo dos renders, o passo seguinte é encomendar/criar modelos GLB (Blender) com as peças separadas e com os mesmos nomes; o motor de montagem (`Assemble`) mantém-se igual — basta trocar a geometria em `src/scene/models/`.
- O **logotipo** foi recortado do anexo `PodCast-Parte1` (sem redesenho), com fundo removido. A resolução de origem é limitada (~1160 px); recomenda-se substituir `public/brand/*.png` pelo ficheiro vectorial oficial quando disponível.
- As imagens do estúdio estão identificadas no site como **visualizações conceptuais**.

### Desempenho e acessibilidade

- 3 níveis de qualidade detectados automaticamente (`src/lib/quality.ts`; forçar com `?quality=high|medium|low`): resolução, sombras, bloom, chão reflector, cones de luz e densidade de adereços. A detecção usa núcleos/memória, tipo de ecrã e o **nome da GPU** (renderização por software → `low`; GPU integrada Intel/AMD APU → `medium`, sem sombras; GPU dedicada/Apple Silicon → `high`). A sequência de montagem é igual em todos os níveis — só muda o custo de renderização.
- **Resolução adaptativa** (`AdaptiveResolution` em `HeroScene.tsx`): mede o ritmo real dos frames só enquanto a animação avança e baixa/sobe o devicePixelRatio em degraus; a mudança só é aplicada com o scroll parado (nunca redimensiona o canvas a meio de um gesto).
- Render pausa quando o banner sai do ecrã; nos ecrãs tácteis só desenha quando o progresso muda.
- Sem WebGL → sequência de imagens sincronizada com o scroll (fallback 2D assumido). `prefers-reduced-motion` → banner estático, sem WebGL.
- No mobile: secção mais curta, FOV adaptado a ecrãs verticais e enquadramento centrado no set de podcast.

### Carregamento progressivo e fluidez (optimização de desempenho)

**Primeiro ecrã imediato.** O HTML já traz a imagem inicial (`public/hero/poster-*.avif|webp`, 13–27 KB): um render da *própria cena 3D* em p = 0, em versão horizontal e vertical. O motor 3D (three.js + cena, chunk separado) descarrega em segundo plano; quando o primeiro frame 3D real está desenhado, a imagem desvanece (700 ms) — sem flash preto nem salto de layout. O "A PREPARAR O ESTÚDIO" passou a ser um indicador discreto (canto superior esquerdo) que não bloqueia o menu, o scroll nem o botão "Saltar introdução", e só desaparece quando a cena está mesmo pronta (sem temporizadores).

**Carregamento por fases** (`HeroScene.tsx`):

| Estágio | O quê | Quando |
|---|---|---|
| 0 | câmara + ambiente | logo (é o que se vê no 1.º ecrã) |
| 1 | kit de iluminação + texturas | em tempo ocioso após o 1.º frame, ou já se o scroll passar p = 0.22 |
| 2 | estúdio de podcast | em tempo ocioso após o estágio 1, ou já se o scroll passar p = 0.42 |

**Porque havia congelamentos na 1.ª visita.** Medido com perfis de CPU (Chrome DevTools Protocol) em contextos novos, cache vazia, CPU normal e 4× mais lenta. Explica porque o problema "desaparecia" depois de percorrer o site: na 2.ª passagem os shaders já estavam compilados (e o navegador guarda-os em cache).
1. *Shaders compilados a meio do scroll.* O número de luzes visíveis faz parte de cada shader do three.js; ao entrar nas fases LUZ (10 → 17 luzes) e ESTÚDIO (→ 22) todos os materiais precisavam de novas variantes, compiladas no próprio frame. A pré-compilação antiga só cobria o estado "tudo visível" e, com pós-processamento, compilava as variantes do ecrã em vez das do render target.
2. *Mudanças de resolução durante o gesto.* O `PerformanceMonitor` mudava o devicePixelRatio (e realocava o canvas e os buffers do pós-processamento) a meio do scroll — e, no modo "a pedido" dos telemóveis, interpretava os frames em repouso como FPS baixo.
3. *Primeiro uso de geometria/texturas* (≈ 380 geometrias enviadas para a GPU só quando apareciam).
4. *A própria preparação em blocos grandes* (versão anterior): o "aquecimento" compilava e desenhava uma fase inteira numa só tarefa — sem compilação paralela, um bloqueio de 0.6–1.8 s — e, se o banner saísse do ecrã, parava.

**O que mudou.**
- *Luzes constantes* (revisão "1.ª visita"): as luzes reais do kit (`KitLights`, em `lighting/effects.tsx`) e do estúdio (`StudioLights`, em `studio/PodcastStudio.tsx`) são montadas desde o 1.º frame, fora dos grupos escondidos, com intensidade 0 até à sua fase (mesmas fórmulas de antes — a imagem não muda). O número de luzes da cena nunca muda, logo **nenhuma mudança de fase recompila shaders**, e cada material precisa de uma única variante (62 → 28 programas). Custo: na fase da câmara cada pixel avalia também as luzes ainda apagadas (+≈ 48 % de custo de desenho medido nessa fase), sem passar o custo da fase do estúdio, que fica igual.
- *Preparação da GPU em fatias* (`Preparer` em `HeroScene.tsx`): uma fila por estágio com tarefas pequenas — compilar um material, concluir a ligação de um programa, enviar uma textura (`initTexture`), desenho de aquecimento de ~24 malhas (render target 4×4 px, ou 1 pixel do ecrã com scissor, antes do frame real) — com orçamento por frame (16 ms atrás da imagem inicial; 12 ms se a fase seguinte estiver próxima; 8 ms com o scroll parado; 4 ms durante o scroll). Sem `KHR_parallel_shader_compile`, no máximo 1 programa novo por passo; com ela, no máximo 3 em curso e a ligação só é concluída quando o driver diz que está pronta (sem esperas na main thread). A preparação continua por temporizador quando o banner sai do ecrã.
- *Cada fase só aparece depois de preparada*: se o visitante lá chegar antes, o scroll continua normalmente e a fase surge já no estado do progresso actual (sem recompilar nada a meio do scroll).
- *Atrás da imagem inicial o canvas não desenha nada* (câmara sem camadas até o estágio 0 estar pronto): a main thread e a GPU ficam livres para a preparação e para o scroll.
- *Scroll sem medições de layout*: o cabeçalho e o botão de WhatsApp mediam a altura do banner em cada evento de scroll (forçando layout síncrono); agora medem só quando o layout muda (`ResizeObserver`).
- *Resolução adaptativa* nova (ver acima) em vez do `PerformanceMonitor`.
- *Resposta ao scroll*: suavização do scrub reduzida de 1 s → 0.5 s (desktop) e 0.6 s → 0.35 s (toque).
- *Partículas douradas*: um sprite pré-desenhado em vez de 70 gradientes criados por frame.
- *Recursos*: removida uma textura de 88 KB que nenhuma peça usava; logótipos da cena em WebP (247 KB → 79 KB); texturas fotográficas da câmara a meia resolução em ecrãs tácteis/nível `low` (438 KB → 146 KB); peças magnéticas libertam os seus recursos GPU ao desmontar.
- Diagnóstico: `?perf` expõe o renderer em `window.__viralizaGL`; `window.__viralizaHero.prepared` indica as fases já preparadas.

**Métricas antes → depois** (medidas, não estimadas). Ambiente: Chromium headless **sem GPU** (WebGL por software/SwiftShader, 4 núcleos → nível `low`), build de produção local. O SwiftShader compila shaders e desenha muitíssimo mais devagar do que uma GPU real, por isso os tempos de cena e os FPS absolutos **não representam dispositivos reais** — servem para comparar antes/depois no mesmo ambiente. Scripts de medição: protocolo CDP (marcos de pintura, long tasks, bytes por tipo, chamadas WebGL contadas por instrumentação).

| Métrica | Antes | Depois |
|---|---|---|
| 1.º conteúdo visual (FCP/LCP), desktop | 184 ms — ecrã preto do loader | 144–180 ms — imagem da cena |
| 1.º conteúdo visual, telemóvel em "Slow 4G" + CPU 4× | 1.07 s — ecrã preto | 0.96 s — imagem da cena |
| Loader bloqueante no ecrã, desktop / telemóvel | 10.4 s / 8.5 s | nenhum (indicador discreto) |
| Cena 3D pronta, telemóvel / telemóvel "Slow 4G" | 8.5 s / 17.8 s | 5.4 s / 11.9 s |
| Programas de shader compilados até ao 1.º frame 3D | 55 | 18 |
| Long tasks até à cena pronta (soma), telemóvel | 10.2 s | 6.2 s |
| Bytes transferidos (página inicial completa) | 1448 KB | 965 KB (imagens 785 → 301 KB) |
| Shaders compilados durante o scroll, após preparação | 2–3 por fase + compilações a cada entrada de fase | **0** (teste e2e) |
| Pior frame de JS no estúdio (1.ª passagem), telemóvel | 65 ms | 14 ms |
| Pior long task no estúdio (1.ª passagem), telemóvel | 1564 ms | 326 ms |
| Geometrias GPU após 8 saídas/regressos ao banner | +18 (fuga pré-existente, medida antes da correcção) | +0 |

**1.ª visita — antes → depois da revisão "luzes constantes + preparação em fatias"** (contexto novo, cache vazia, scroll real com a roda: banner inteiro em ~12 s, depois inverso rápido e avanço rápido em ~1.5 s cada; versão anterior = commit `0287e42`). Para separar *congelamentos* do custo de desenho da GPU emulada, as janelas são pequenas (256×144 e 640×360); "buraco" = tempo sem frames na main thread.

| Configuração | Pior buraco com a cena 3D já visível (durante a animação) | Todas as fases preparadas | Maior tarefa longa | Tempo bloqueado a ligar shaders |
|---|---|---|---|---|
| Desktop `low`, CPU 1× | 3 978 ms → **438 ms** | 45.8 s → **10.5 s** | 970 → 434 ms | 2 641 → 135 ms |
| Desktop `medium` (pós-processamento), CPU 1× | 3 016 ms → **367 ms** | 42.6 s → **11.7 s** | 1 208 → 591 ms | 2 465 → 1 269 ms |
| Telemóvel, CPU 4× | 3 130 ms → **564 ms** | 42.7 s → **22.2 s** | 422 → 508 ms | 612 → 885 ms |
| Telemóvel, CPU 4× + "Slow 4G" | 3 695 ms → **420 ms** | 49.6 s → **19.0 s** | 1 071 → 404 ms | 2 645 → 364 ms |
| Desktop `medium` 640×360, CPU 1× | 2 033 ms → **585 ms** | 42.4 s → **20.3 s** | 1 405 → 539 ms | 735 → 1 088 ms |

Os ~0.4–0.6 s que restam são o tempo de desenho de um frame no SwiftShader (p95 ≈ 0.3 s em ambas as versões), não congelamentos. Outras medições: 28 programas de shader no total (antes 62); 0 shaders compilados durante o scroll depois da preparação (teste e2e); 7 commits React num scroll completo (nenhum por frame); listeners `wheel`/`touchmove` todos passivos. Custos honestos: a cena 3D substitui a imagem inicial ~1 s mais tarde (a preparação é fatiada); na fase da câmara o desenho custa mais (luzes constantes) — no teste mais pesado em GPU (640×360 `medium`) houve mais frames acima de 250 ms (190 → 410); continua a existir um bloqueio na inicialização (atrás da imagem inicial, 1–4 s no SwiftShader) causado pela criação do contexto WebGL, do mapa de ambiente (PMREM) e dos passes de pós-processamento, que compilam os seus shaders no primeiro frame.

Limitações honestas: (1) não houve acesso a dispositivos reais nem ao site publicado a partir deste ambiente — FPS reais, aquecimento e Lighthouse em produção ficam por medir num telemóvel/PC reais (sugestão: Chrome DevTools → Performance com "CPU 4× slowdown" e Lighthouse mobile em `https://audiovisual.viralizahost.com/`); (2) se o visitante chegar a uma fase antes de ela estar preparada (scroll muito rápido logo na 1.ª visita), o scroll continua normalmente mas essa fase só aparece quando a preparação termina (surge já no estado do progresso actual, sem recompilar nada); (3) Safari/iPhone: não foi possível confirmar se o WebKit expõe `KHR_parallel_shader_compile` — sem ela cada programa novo custa o seu tempo de compilação, mas no máximo um por passo; (4) os listeners `touchstart`/`pointer*` a nível de `window`/`document` vêm das bibliotecas (React Three Fiber/GSAP); o Chrome trata-os como passivos por omissão nesses alvos, mas não foi verificado em dispositivos reais.


### Mobile (iOS Safari / Chrome Android)

- É a **mesma cena 3D** e a mesma timeline do desktop (não há slides): o toque no ecrã faz scroll e o scroll comanda a montagem, em ambos os sentidos.
- Enquadramento vertical: em ecrãs com proporção < 1 a câmara recua (`CameraRig`, curva `pow(rest, lerp(1.0, 0.12, inRoom))`) para a câmara montada e o kit de luz caberem inteiros; no estúdio o recuo diminui para mostrar o set.
- GPU/bateria: em dispositivos de toque o Canvas usa `frameloop="demand"` — só renderiza quando o progresso muda (e no máximo ~15 fps em repouso para as animações de idle); partículas a ~30 fps; luzes pontuais reduzidas em retrato; nível de qualidade `low/medium`, resolução adaptativa e texturas da câmara a meia resolução.
- `ScrollTrigger.config({ ignoreMobileResize: true })`: a barra de endereço do iOS/Android a aparecer/desaparecer não recalcula a timeline (sem saltos).
- Sem WebGL → sequência de imagens; **"Reduzir movimento" activo no sistema → banner estático** (por desenho). Se no telemóvel aparecer só a imagem fixa, verifique esta definição de acessibilidade.
- Testado em emulação Chromium (iPhone 13, Pixel 7) com gestos de toque reais via CDP; **não foi testado em dispositivos físicos nem no WebKit do Safari** — FPS e aquecimento reais ainda por medir.

## Preços e pré-reserva da sala de podcast

Fonte única: `src/content/pricing.ts` (tabela, formulário, mensagem de WhatsApp e testes leem daqui).

- **Modalidade A — Gravação bruta** (sem edição): 1h 40.000 Kz · 2h 80.000 Kz · 3h 120.000 Kz · hora adicional 40.000 Kz. Mostra o aviso obrigatório de que não inclui edição/montagem/pós-produção.
- **Modalidade B — Gravação + edição**: Essencial 100.000 Kz (3 vídeos), **Profissional 200.000 Kz (6 vídeos, destacado)**, Premium 300.000 Kz (9), Empresarial 400.000 Kz (12). Duração, revisões e prazos **não** são indicados — ficam sujeitos a confirmação comercial.
- Os botões **Reservar** da tabela seleccionam a modalidade no formulário (`planBus.ts`), actualizam o resumo e levam até ao formulário. O preço do pacote é fixo (**nunca multiplicado pelas horas**); só a gravação bruta é `horas × 40.000 Kz`.
- O envio abre o WhatsApp com a mensagem estruturada (`src/lib/booking.ts`): cliente, contacto, modalidade/pacote, valor de referência, data/hora, participantes e observações — sempre como **pedido de pré-reserva**.

## Identidade visual Silver

- O banner cinematográfico mantém preto + dourado. Depois dele, uma faixa de transição (`.silver-transition`) passa do preto ao prata e todo o conteúdo (`#conteudo` + rodapé) usa `.theme-silver`: prata #C0C0C0 / #E5E7EB / #A8ADB4, texto grafite #252525, dourado #FFCC00 como marcador nos títulos (`.mark-gold`), botões e destaques.
- Classes em `src/app/globals.css` (`@layer components`): `text-muted/soft/faint`, `silver-band` (faixas alternadas), `card`/`field` reescritos para prata, `package*`, `price-table`, `btn-reserve`, `booking-summary`, `notice`.
- Botão **Saltar introdução** sempre visível durante a sequência.

## Conteúdos e configuração

- Contactos, preço por hora e URL: `src/config/site.ts`
- Tabela de preços e pacotes: `src/content/pricing.ts`
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
