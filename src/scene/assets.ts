"use client";

import * as THREE from "three";
import { hash } from "@/animation/math";

/**
 * Assets de marca: o logotipo original da Viraliza (recortado dos anexos, sem redesenho)
 * é desenhado em canvas para gerar as texturas dos equipamentos — painel lateral da
 * câmara, ecrãs, parede do estúdio, balcão de recepção, etc.
 */
export type BrandImages = {
  logo: HTMLImageElement;
  mark: HTMLImageElement;
  word: HTMLImageElement;
  banner: HTMLImageElement;
};

let brandPromise: Promise<BrandImages> | null = null;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = src;
  });
}

export function loadBrandImages(): Promise<BrandImages> {
  if (!brandPromise) {
    brandPromise = (async () => {
      const fonts = typeof document !== "undefined" && document.fonts
        ? Promise.all([
            document.fonts.load('700 64px "Sora Variable"'),
            document.fonts.load('600 32px "Inter Variable"'),
          ]).catch(() => undefined)
        : Promise.resolve();
      const [logo, mark, word, banner] = await Promise.all([
        loadImage("/brand/viraliza-logo.png"),
        loadImage("/brand/viraliza-mark.png"),
        loadImage("/brand/viraliza-wordmark.png"),
        loadImage("/textures/banner.webp"),
        fonts,
      ]);
      return { logo, mark, word, banner };
    })();
  }
  return brandPromise;
}

const DISPLAY = '"Sora Variable", "Sora", system-ui, sans-serif';
const BODY = '"Inter Variable", "Inter", system-ui, sans-serif';
const Y = "#FFCC00";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTex(w: number, h: number, draw: Draw, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  return t;
}

function fitImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, w: number) {
  const h = (img.height / img.width) * w;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  return h;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // canvas.letterSpacing não existe em todos os browsers: desenha letra a letra, centrado.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = align;
}

function soundBars(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, dir: 1 | -1, scale = 1) {
  ctx.fillStyle = Y;
  for (let i = 0; i < n; i++) {
    const hgt = (10 + Math.abs(Math.sin(i * 1.9)) * 34) * scale;
    ctx.fillRect(x + dir * i * 9 * scale, y - hgt / 2, 4 * scale, hgt);
  }
}

export function createTextures(img: BrandImages) {
  const logo = new THREE.Texture(img.logo);
  logo.colorSpace = THREE.SRGBColorSpace;
  logo.anisotropy = 8;
  logo.needsUpdate = true;
  const mark = new THREE.Texture(img.mark);
  mark.colorSpace = THREE.SRGBColorSpace;
  mark.anisotropy = 8;
  mark.needsUpdate = true;
  const banner = new THREE.Texture(img.banner);
  banner.colorSpace = THREE.SRGBColorSpace;
  banner.anisotropy = 8;
  banner.needsUpdate = true;

  /** Painel lateral da câmara (lado direito, como nos renders de referência). */
  const sidePanel = canvasTex(1024, 720, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#151517");
    g.addColorStop(1, "#070708");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // moldura amarela com corte em chanfro (linguagem visual dos renders)
    ctx.strokeStyle = Y;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(150, 40);
    ctx.lineTo(w - 40, 40);
    ctx.lineTo(w - 40, h - 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 150, h - 40);
    ctx.lineTo(40, h - 40);
    ctx.lineTo(40, 150);
    ctx.stroke();
    ctx.fillStyle = Y;
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(210, 30);
    ctx.lineTo(30, 210);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9;
    fitImage(ctx, img.mark, w / 2, 190, 150);
    ctx.globalAlpha = 1;
    fitImage(ctx, img.word, w / 2, 350, 600);
    ctx.fillStyle = "#e8e8e8";
    ctx.font = `500 38px ${BODY}`;
    ctx.textAlign = "center";
    ctx.fillText("Soluções Digitais e Audiovisuais", w / 2, 445);
    // selo 4K
    ctx.strokeStyle = Y;
    ctx.lineWidth = 6;
    roundRect(ctx, w - 330, h - 250, 240, 150, 14);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `800 92px ${DISPLAY}`;
    ctx.fillText("4K", w - 210, h - 150);
    ctx.font = `700 26px ${BODY}`;
    ctx.fillText("ULTRA HD", w - 210, h - 115);
  });

  /** Placa de circuito impresso com pistas douradas. */
  const pcb = canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = "#0c3324";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9a14a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const x = hash(i) * w;
      const y = hash(i + 100) * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const horiz = hash(i + 7) > 0.5;
      const len = 30 + hash(i + 9) * 120;
      ctx.lineTo(horiz ? x + len : x, horiz ? y : y + len);
      ctx.lineTo(horiz ? x + len + 18 : x + 18, horiz ? y + 18 : y + len + 18);
      ctx.stroke();
      ctx.fillStyle = "#e0bb5c";
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    const chips: Array<[number, number, number, number]> = [
      [60, 60, 120, 90],
      [230, 40, 90, 90],
      [350, 170, 110, 80],
      [80, 230, 70, 100],
      [210, 250, 100, 60],
    ];
    chips.forEach(([x, y, cw, ch]) => {
      ctx.fillStyle = "#111";
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = "#555";
      ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
      ctx.fillStyle = "#bbb";
      for (let k = 0; k < cw; k += 10) {
        ctx.fillRect(x + k + 3, y - 6, 4, 6);
        ctx.fillRect(x + k + 3, y + ch, 4, 6);
      }
    });
  });

  /** Ecrã do monitor da câmara. */
  const monitor = canvasTex(512, 352, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, "#3b2a10");
    g.addColorStop(1, "#060606");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    fitImage(ctx, img.logo, w / 2, h / 2, 280);
    ctx.fillStyle = "#ff2b2b";
    ctx.beginPath();
    ctx.arc(30, 30, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 24px ${BODY}`;
    ctx.fillText("REC", 46, 39);
    ctx.textAlign = "right";
    ctx.fillText("4K  25p", w - 20, 39);
    ctx.textAlign = "center";
    ctx.font = `600 26px ${BODY}`;
    ctx.fillText("00:00:08:12", w / 2, h - 24);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.12, h * 0.15, w * 0.76, h * 0.68);
  });

  /** Grelha de LEDs (painéis de iluminação) — usada como emissiveMap. */
  const ledGrid = canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    const cols = 16;
    const rows = 12;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = (i + 0.5) * (w / cols);
        const y = (j + 0.5) * (h / rows);
        const r = ctx.createRadialGradient(x, y, 0, x, y, 13);
        r.addColorStop(0, "#ffffff");
        r.addColorStop(0.45, "#ffe9b8");
        r.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = r;
        ctx.fillRect(x - 15, y - 15, 30, 30);
      }
  });

  /** Ecrã da televisão do estúdio. */
  const tv = canvasTex(1024, 576, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0a0a0a");
    g.addColorStop(1, "#1d1606");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,204,0,.75)";
    for (let i = 0; i < 5; i++) {
      ctx.lineWidth = 3 - i * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.85 - i * 18);
      ctx.bezierCurveTo(w * 0.3, h * 0.55 - i * 20, w * 0.6, h * 1.05 - i * 12, w, h * 0.45 - i * 22);
      ctx.stroke();
    }
    fitImage(ctx, img.mark, w * 0.36, h * 0.3, 120);
    fitImage(ctx, img.word, w * 0.36, h * 0.5, 420);
    ctx.fillStyle = Y;
    roundRect(ctx, w * 0.36 - 120, h * 0.6, 240, 64, 32);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("PODCAST", w * 0.36, h * 0.6 + 46);
    // microfone estilizado
    const mx = w * 0.76;
    const my = h * 0.42;
    const mg = ctx.createLinearGradient(mx - 60, 0, mx + 60, 0);
    mg.addColorStop(0, "#444");
    mg.addColorStop(0.5, "#ddd");
    mg.addColorStop(1, "#333");
    ctx.fillStyle = mg;
    roundRect(ctx, mx - 55, my - 120, 110, 190, 55);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = 2;
    for (let k = -100; k < 60; k += 12) {
      ctx.beginPath();
      ctx.moveTo(mx - 50, my + k);
      ctx.lineTo(mx + 50, my + k);
      ctx.stroke();
    }
    ctx.fillStyle = Y;
    ctx.fillRect(mx - 56, my + 30, 112, 10);
    ctx.fillStyle = "#222";
    ctx.fillRect(mx - 8, my + 70, 16, 90);
    ctx.fillRect(mx - 50, my + 155, 100, 12);
  });

  /** Painel de parede com o logotipo e "AUDIOVISUAL & PODCAST". Fundo transparente. */
  const logoWall = canvasTex(1024, 560, (ctx, w) => {
    fitImage(ctx, img.mark, w / 2, 130, 200);
    fitImage(ctx, img.word, w / 2, 300, 660);
    ctx.fillStyle = "#fff";
    ctx.font = `600 50px ${BODY}`;
    ctx.textAlign = "center";
    spacedText(ctx, "AUDIOVISUAL & PODCAST", w / 2, 420, 6);
    soundBars(ctx, w / 2 - 370, 404, 9, -1, 1.1);
    soundBars(ctx, w / 2 + 370, 404, 9, 1, 1.1);
  });

  /** Painéis verticais com ícones (Audiovisual / Podcast / Produção). */
  const iconPanel = (kind: "camera" | "mic" | "headphones", label: string) =>
    canvasTex(256, 512, (ctx, w, h) => {
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = Y;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const cx = w / 2;
      const cy = 200;
      ctx.beginPath();
      if (kind === "camera") {
        roundRect(ctx, cx - 70, cy - 45, 100, 90, 12);
        ctx.moveTo(cx + 30, cy - 15);
        ctx.lineTo(cx + 72, cy - 40);
        ctx.lineTo(cx + 72, cy + 40);
        ctx.lineTo(cx + 30, cy + 15);
        ctx.moveTo(cx - 52, cy - 60);
        ctx.arc(cx - 40, cy - 72, 14, Math.PI * 0.6, Math.PI * 2.6);
      } else if (kind === "mic") {
        roundRect(ctx, cx - 30, cy - 90, 60, 120, 30);
        ctx.moveTo(cx - 55, cy - 5);
        ctx.arc(cx, cy - 5, 55, Math.PI, 0, true);
        ctx.moveTo(cx, cy + 50);
        ctx.lineTo(cx, cy + 90);
        ctx.moveTo(cx - 35, cy + 90);
        ctx.lineTo(cx + 35, cy + 90);
      } else {
        ctx.arc(cx, cy, 70, Math.PI, 0);
        ctx.moveTo(cx - 70, cy);
        ctx.lineTo(cx - 70, cy + 40);
        ctx.moveTo(cx + 70, cy);
        ctx.lineTo(cx + 70, cy + 40);
        roundRect(ctx, cx - 88, cy + 10, 36, 70, 12);
        roundRect(ctx, cx + 52, cy + 10, 36, 70, 12);
      }
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `700 26px ${DISPLAY}`;
      ctx.textAlign = "center";
      ctx.fillText(label, cx, 380);
      ctx.strokeStyle = Y;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    });

  const iconAudiovisual = iconPanel("camera", "AUDIOVISUAL");
  const iconPodcast = iconPanel("mic", "PODCAST");
  const iconProducao = iconPanel("headphones", "PRODUÇÃO");

  /** Ripas verticais luminosas da mesa central do podcast. */
  const tableStripes = canvasTex(
    256,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      for (let x = 4; x < w; x += 16) {
        const g = ctx.createLinearGradient(x, 0, x + 6, 0);
        g.addColorStop(0, "rgba(255,190,40,0)");
        g.addColorStop(0.5, "#ffd257");
        g.addColorStop(1, "rgba(255,190,40,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 6, h);
      }
    },
    { repeat: [3, 1] },
  );

  /** Frente do balcão de recepção / showcase. */
  const reception = canvasTex(1024, 380, (ctx, w, h) => {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);
    fitImage(ctx, img.logo, 250, h / 2 - 10, 380);
    ctx.fillStyle = Y;
    ctx.fillRect(492, 70, 4, h - 140);
    ctx.fillStyle = "#fff";
    ctx.font = `600 34px ${BODY}`;
    ctx.textAlign = "left";
    ["SOLUÇÕES DIGITAIS", "AUDIOVISUAL & PODCAST", "MARKETING DIGITAL", "AUTOMAÇÃO COM IA"].forEach((t, i) => {
      ctx.fillStyle = Y;
      ctx.fillRect(530, 92 + i * 62, 18, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(t, 566, 110 + i * 62);
    });
    ctx.fillStyle = Y;
    ctx.fillRect(0, h - 10, w, 10);
  });

  /** Superfície da mesa de mistura. */
  const mixer = canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1c1c1e";
    ctx.fillRect(0, 0, w, h);
    const colors = ["#ff3b3b", "#ffcc00", "#3bd16f", "#3b8bff", "#c46bff", "#ff8a00"];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 40 + i * 42;
        const y = 34 + j * 34;
        ctx.fillStyle = "#0b0b0b";
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors[(i + j) % colors.length];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 14, Math.PI * 0.8, Math.PI * (0.8 + 0.4 + hash(i * 3 + j)));
        ctx.stroke();
      }
      ctx.fillStyle = "#050505";
      ctx.fillRect(38 + i * 42, 140, 5, 100);
      ctx.fillStyle = "#e6e6e6";
      ctx.fillRect(28 + i * 42, 150 + hash(i) * 70, 24, 12);
    }
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = colors[(i * 3 + j) % colors.length];
        roundRect(ctx, 380 + i * 30, 120 + j * 36, 24, 28, 5);
        ctx.fill();
      }
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(380, 30, 110, 70);
    ctx.fillStyle = Y;
    ctx.font = `700 18px ${BODY}`;
    ctx.fillText("LIVE  -12 dB", 392, 72);
  });

  /** Ecrã de produção (edição/streaming). */
  const production = canvasTex(512, 320, (ctx, w, h) => {
    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#16181f";
    ctx.fillRect(10, 10, 300, 170);
    const g = ctx.createLinearGradient(10, 10, 310, 180);
    g.addColorStop(0, "#2b2109");
    g.addColorStop(1, "#0b0b0b");
    ctx.fillStyle = g;
    ctx.fillRect(14, 14, 292, 162);
    fitImage(ctx, img.logo, 160, 95, 170);
    ctx.fillStyle = "#16181f";
    ctx.fillRect(320, 10, 182, 170);
    ctx.fillStyle = Y;
    for (let i = 0; i < 26; i++) {
      const hh = 8 + Math.abs(Math.sin(i * 0.9)) * 50;
      ctx.fillRect(330 + i * 6.5, 95 - hh / 2, 3.5, hh);
    }
    const clip = ["#3b8bff", "#ffcc00", "#c46bff", "#3bd16f"];
    for (let r = 0; r < 4; r++) {
      let x = 14;
      while (x < w - 20) {
        const cw = 40 + hash(x + r * 99) * 90;
        ctx.fillStyle = clip[r];
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x, 196 + r * 28, Math.min(cw, w - 20 - x), 22);
        x += cw + 6;
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(200, 190, 2, 124);
  });

  const onAir = canvasTex(256, 96, (ctx, w, h) => {
    ctx.fillStyle = "#c4121a";
    roundRect(ctx, 0, 0, w, h, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `800 52px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("ON AIR", w / 2, h / 2 + 18);
  });

  const rug = canvasTex(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#3c3b39";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = 40 + Math.floor(hash(i) * 70);
        ctx.fillStyle = `rgb(${v},${v - 2},${v - 5})`;
        ctx.fillRect(hash(i + 3) * w, hash(i + 5) * h, 2, 2);
      }
    },
    { repeat: [3, 3] },
  );

  const grooves = canvasTex(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#050505";
      for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 6, h);
    },
    { repeat: [6, 1] },
  );

  return {
    logo,
    mark,
    banner,
    sidePanel,
    pcb,
    monitor,
    ledGrid,
    tv,
    logoWall,
    iconAudiovisual,
    iconPodcast,
    iconProducao,
    tableStripes,
    reception,
    mixer,
    production,
    onAir,
    rug,
    grooves,
  };
}

export type SceneTextures = ReturnType<typeof createTextures>;
