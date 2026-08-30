import json, os, re
from PIL import Image

ROOT = r"C:\Users\dejes\OneDrive\Desktop\CURSOR\WEB3\SWAGFAGS\SWAGFAG SKELLY CLUB"
ASSETS = os.path.join(ROOT, "ASSETS")
ORDER = ["BACKGROUND","TOP DECAL","BL STICKER","BR STICKER","LEGS","ARMS","BODY","HEAD","EYES"]

def norm(s): return re.sub(r"[^a-z0-9]+", "", s.lower())

# index every asset file by normalised name
idx = {}
for cat in ORDER:
    idx[cat] = {}
    for f in os.listdir(os.path.join(ASSETS, cat)):
        if f.lower().endswith(".png"):
            idx[cat][norm(os.path.splitext(f)[0])] = os.path.join(ASSETS, cat, f)

meta = json.load(open(os.path.join(ROOT, "FULL COLLECTION", "deep_fried", "1000.json"), encoding="utf-8"))
attrs = {a["trait_type"]: a["value"] for a in meta["attributes"]}

canvas = None
for cat in ORDER:
    v = attrs[cat]
    p = idx[cat].get(norm(v))
    print(f"{cat:12} {v!r:30} -> {os.path.basename(p) if p else 'MISSING'}")
    if not p: continue
    layer = Image.open(p).convert("RGBA")
    canvas = layer if canvas is None else Image.alpha_composite(canvas.resize(layer.size), layer)

canvas.convert("RGB").save(r"C:\Users\dejes\AppData\Local\Temp\claude\C--Users-dejes-OneDrive-Desktop-CURSOR-WEB3-SWAGFAGS\a18593de-e2d6-4fc1-b8e4-36f8b1e362a2\scratchpad\layertest.png")
print("size:", canvas.size)
