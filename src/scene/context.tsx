"use client";

import { createContext, use, useContext, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { createTextures, loadBrandImages, type SceneTextures } from "./assets";
import { createMaterials, type SceneMaterials } from "./materials";

type Assets = { tex: SceneTextures; mat: SceneMaterials };
const AssetsCtx = createContext<Assets | null>(null);

/** Carrega o logotipo + fontes (suspende) e cria texturas/materiais uma única vez. */
export function SceneAssetsProvider({ children }: { children: ReactNode }) {
  const images = use(loadBrandImages());
  const assets = useMemo(() => {
    const tex = createTextures(images);
    const mat = createMaterials(tex);
    return { tex, mat };
  }, [images]);

  useEffect(
    () => () => {
      Object.values(assets.tex).forEach((t) => (t as THREE.Texture).dispose());
      Object.values(assets.mat).forEach((m) => (m as THREE.Material).dispose());
    },
    [assets],
  );

  return <AssetsCtx.Provider value={assets}>{children}</AssetsCtx.Provider>;
}

export function useAssets(): Assets {
  const a = useContext(AssetsCtx);
  if (!a) throw new Error("useAssets fora de SceneAssetsProvider");
  return a;
}
