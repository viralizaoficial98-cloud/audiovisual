"""
Extrai texturas das 4 imagens oficiais da câmara VIRALIZA para revestir as peças 3D.
Uso: python3 -I scripts/extract-camera-textures.py
As regiões foram medidas sobre public/images/camera/*.webp (coordenadas em píxeis).
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "images", "camera")
OUT = os.path.join(ROOT, "public", "textures", "camera")
os.makedirs(OUT, exist_ok=True)

p1 = Image.open(os.path.join(SRC, "parte1-desmontada.webp")).convert("RGB")
p3 = Image.open(os.path.join(SRC, "parte3-montada.webp")).convert("RGB")
p4 = Image.open(os.path.join(SRC, "parte4-frontal.webp")).convert("RGB")


def save(img, name, size=None, q=88):
    if size:
        img = img.resize(size, Image.LANCZOS)
    img.save(os.path.join(OUT, name), quality=q, method=6)
    print(name, img.size)


def quad(img, pts, size):
    """Rectifica um quadrilátero (TL, BL, BR, TR) para um rectângulo."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = pts
    return img.transform(size, Image.QUAD, (x0, y0, x1, y1, x2, y2, x3, y3), Image.BICUBIC)


# Painel lateral VIRALIZA / 4K (Parte 3) — face +Z do corpo
save(quad(p3, [(915, 330), (915, 805), (1500, 805), (1500, 322)], (1024, 820)), "side-panel.webp")

# Microfone com logotipo (Parte 3) — rodado para enrolar no eixo do cilindro
mic = quad(p3, [(125, 108), (125, 300), (662, 300), (662, 108)], (1024, 360))
save(mic.rotate(-90, expand=True), "mic.webp")

# Lateral da objectiva: anel amarelo, anel de focagem, AF/MF, STABILIZER (Parte 3)
barrel = quad(p3, [(478, 372), (478, 868), (935, 868), (935, 372)], (900, 980))
save(barrel.rotate(-90, expand=True), "lens-barrel.webp")

# Vidro frontal da lente (Parte 4) com máscara circular suave
c = (718, 600)
r = 205
glass = p4.crop((c[0] - r, c[1] - r, c[0] + r, c[1] + r)).resize((768, 768), Image.LANCZOS)
m = Image.new("L", glass.size, 0)
ImageDraw.Draw(m).ellipse((6, 6, 762, 762), fill=255)
glass.putalpha(m.filter(ImageFilter.GaussianBlur(4)))
glass.save(os.path.join(OUT, "lens-glass.webp"), quality=90, method=6)
print("lens-glass.webp", glass.size)

# Interior do pára-sol (aneis) — Parte 4, faixa da moldura
save(p4.crop((420, 360, 1010, 870)), "hood-front.webp", (768, 664))

# Módulo superior com logotipo (Parte 4)
save(p4.crop((692, 158, 926, 292)), "top-module.webp", (512, 292))

# Componentes internos (Parte 1)
save(quad(p1, [(990, 290), (985, 532), (1118, 520), (1115, 285)], (360, 640)), "pcb.webp")
save(p1.crop((792, 352, 896, 480)), "sensor.webp", (256, 316))
save(quad(p1, [(1132, 603), (1112, 758), (1392, 768), (1405, 612)], (768, 432)), "monitor.webp")
save(p1.crop((1326, 806, 1418, 926)), "sd-card.webp", (184, 240))
save(p1.crop((40, 708, 226, 890)), "battery.webp", (372, 364))
save(p1.crop((398, 778, 548, 912)), "fan.webp", (300, 268))

# ---------------- Kit de iluminação (Luzes-Parte2, imagem oficial do kit montado) ----------------
L2 = Image.open(os.path.join(ROOT, "public", "images", "iluminacao", "parte2-montada.webp")).convert("RGB")
OUT_L = os.path.join(ROOT, "public", "textures", "lighting")
os.makedirs(OUT_L, exist_ok=True)


def save_l(img, name, size):
    img = img.resize(size, Image.LANCZOS)
    img.save(os.path.join(OUT_L, name), quality=88, method=6)
    print("lighting/" + name, img.size)


save_l(quad(L2, [(490, 742), (492, 940), (868, 936), (868, 742)], (760, 400)), "case-front.webp", (760, 400))
save_l(quad(L2, [(576, 640), (576, 708), (796, 708), (796, 640)], (440, 136)), "controller.webp", (440, 136))
save_l(quad(L2, [(1124, 772), (1124, 896), (1278, 896), (1278, 772)], (308, 248)), "sandbag.webp", (308, 248))
save_l(quad(L2, [(390, 596), (390, 634), (458, 634), (458, 596)], (272, 152)), "ring-base.webp", (272, 152))
