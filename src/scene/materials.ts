"use client";

import * as THREE from "three";
import type { SceneTextures } from "./assets";

/**
 * Biblioteca de materiais partilhados. Partilhar materiais reduz trocas de shader e
 * mantém a GPU estável. Os materiais "animáveis" (emissivos das luzes) são instâncias
 * próprias para poderem ser ligados em momentos diferentes da timeline.
 */
export function createMaterials(tex: SceneTextures) {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const decal = (map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) =>
    std({ map, transparent: true, roughness: 0.5, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, ...extra });
  const glow = (color: string, map?: THREE.Texture) =>
    std({ color: "#050505", emissive: new THREE.Color(color), emissiveMap: map ?? null, emissiveIntensity: 0, roughness: 0.6, toneMapped: false });

  return {
    // --- equipamento ---
    body: std({ color: "#121214", roughness: 0.42, metalness: 0.4 }),
    matte: std({ color: "#0c0c0d", roughness: 0.78, metalness: 0.1 }),
    rubber: std({ color: "#0a0a0a", roughness: 0.95 }),
    grip: std({ color: "#1a1a1b", roughness: 0.65, metalness: 0.2 }),
    yellow: std({ color: "#FFCC00", roughness: 0.32, metalness: 0.25, emissive: "#3a2a00", emissiveIntensity: 0.25 }),
    gold: std({ color: "#c9a14a", roughness: 0.28, metalness: 1 }),
    metal: std({ color: "#a3a3a8", roughness: 0.28, metalness: 1 }),
    darkMetal: std({ color: "#3b3b40", roughness: 0.32, metalness: 0.9 }),
    red: std({ color: "#d01818", roughness: 0.3, emissive: "#600", emissiveIntensity: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#9fb7ff",
      roughness: 0.04,
      metalness: 0.2,
      transparent: true,
      opacity: 0.28,
      iridescence: 0.8,
      iridescenceIOR: 1.5,
      clearcoat: 1,
      envMapIntensity: 2.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    lensFront: new THREE.MeshPhysicalMaterial({
      color: "#07080b",
      roughness: 0.04,
      metalness: 0.7,
      iridescence: 1,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [200, 900],
      clearcoat: 1,
      envMapIntensity: 2.5,
    }),
    sensor: new THREE.MeshPhysicalMaterial({
      color: "#3b2a7a",
      roughness: 0.12,
      metalness: 0.85,
      iridescence: 1,
      iridescenceIOR: 2,
      envMapIntensity: 2.4,
      emissive: "#1a1040",
      emissiveIntensity: 0.4,
    }),
    pcb: std({ map: tex.pcb, roughness: 0.55, metalness: 0.3 }),
    foam: std({ color: "#151515", roughness: 1 }),
    sidePanel: std({ map: tex.sidePanel, roughness: 0.35, metalness: 0.3 }),
    monitorScreen: std({ color: "#000", emissive: "#ffffff", emissiveMap: tex.monitor, emissiveIntensity: 0.9, roughness: 0.2 }),
    logoDecal: decal(tex.logo),
    markDecal: decal(tex.mark),

    // --- iluminação (cada uma animável de forma independente) ---
    ledPanelL: glow("#fff1d6", tex.ledGrid),
    ledPanelR: glow("#fff1d6", tex.ledGrid),
    ledPanelX: glow("#fff1d6", tex.ledGrid),
    softboxFace: glow("#fff6e6"),
    softboxFaceX: glow("#fff6e6"),
    ringLight: glow("#fffaf0"),
    softboxShell: std({ color: "#0d0d0d", roughness: 0.85, side: THREE.DoubleSide }),
    diffuserCloth: std({ color: "#f2efe8", roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),

    // --- estúdio ---
    stripYellow: glow("#ffb800"),
    stripWarm: glow("#ffd27a"),
    ceilingSpot: glow("#fff3d6"),
    shelfLed: glow("#ffc94a"),
    iconGlow: glow("#ffcc00"),
    tableGlow: glow("#ffcc55", tex.tableStripes),
    tvScreen: std({ color: "#000", emissive: "#ffffff", emissiveMap: tex.tv, emissiveIntensity: 0, roughness: 0.25, metalness: 0.2 }),
    logoWall: std({ map: tex.logoWall, transparent: true, emissive: "#ffffff", emissiveMap: tex.logoWall, emissiveIntensity: 0.35, roughness: 0.5, depthWrite: false }),
    iconAudiovisual: std({ map: tex.iconAudiovisual, emissive: "#fff", emissiveMap: tex.iconAudiovisual, emissiveIntensity: 0, roughness: 0.4 }),
    iconPodcast: std({ map: tex.iconPodcast, emissive: "#fff", emissiveMap: tex.iconPodcast, emissiveIntensity: 0, roughness: 0.4 }),
    iconProducao: std({ map: tex.iconProducao, emissive: "#fff", emissiveMap: tex.iconProducao, emissiveIntensity: 0, roughness: 0.4 }),
    reception: std({ map: tex.reception, emissive: "#ffffff", emissiveMap: tex.reception, emissiveIntensity: 0.15, roughness: 0.35 }),
    mixer: std({ map: tex.mixer, roughness: 0.5, emissive: "#ffffff", emissiveMap: tex.mixer, emissiveIntensity: 0.25 }),
    production: std({ color: "#000", emissive: "#ffffff", emissiveMap: tex.production, emissiveIntensity: 0.9, roughness: 0.2 }),
    onAir: std({ color: "#300", emissive: "#ffffff", emissiveMap: tex.onAir, emissiveIntensity: 0, roughness: 0.3, toneMapped: false }),
    wallDark: std({ color: "#141414", roughness: 0.92 }),
    wallPanel: std({ color: "#1b1b1c", roughness: 0.75, metalness: 0.05 }),
    wallYellow: std({ color: "#d9a400", roughness: 0.8 }),
    ceiling: std({ color: "#0e0e0e", roughness: 0.95 }),
    acoustic: std({ map: tex.grooves, roughness: 1 }),
    foamTile: std({ color: "#111112", roughness: 1, flatShading: true }),
    wood: std({ color: "#6e4a2a", roughness: 0.62 }),
    floor: std({ color: "#121110", roughness: 0.32, metalness: 0.25 }),
    fabric: std({ color: "#6e6963", roughness: 0.97 }),
    leather: std({ color: "#111111", roughness: 0.38, metalness: 0.05 }),
    cushionYellow: std({ color: "#f2c200", roughness: 0.9 }),
    cushionBlack: std({ color: "#121212", roughness: 0.9 }),
    rug: std({ map: tex.rug, roughness: 1 }),
    plant: std({ color: "#2d6a2a", roughness: 0.75, side: THREE.DoubleSide }),
    plantLight: std({ color: "#4f9a3b", roughness: 0.75, side: THREE.DoubleSide }),
    potGold: std({ color: "#c7a24f", roughness: 0.25, metalness: 1 }),
    tvBezel: std({ color: "#050505", roughness: 0.3, metalness: 0.5 }),
    glassTop: std({ color: "#0b0b0b", roughness: 0.05, metalness: 0.6 }),
    white: std({ color: "#eeeeee", roughness: 0.4 }),
    book: std({ color: "#222", roughness: 0.7 }),
  };
}

export type SceneMaterials = ReturnType<typeof createMaterials>;
