"""Larger plates for the wall and the vault. Additive — leaves data/ alone."""
import json, os, random
from PIL import Image

ROOT  = r"C:\Users\dejes\OneDrive\Desktop\CURSOR\WEB3\SWAGFAGS\SWAGFAG SKELLY CLUB"
SITE  = r"C:\Users\dejes\OneDrive\Desktop\CURSOR\WEB3\SWAGFAGS\site"
FRIED = os.path.join(ROOT, "FULL COLLECTION", "deep_fried")

WALL_N, WALL_PX = 24, 800
GALLERY_PX      = 480

gal = json.load(open(os.path.join(SITE, "data", "gallery.json"), encoding="utf-8"))
ids = [i["id"] for i in gal["items"]]

def out(*p):
    d = os.path.join(SITE, *p); os.makedirs(d, exist_ok=True); return d

# wall: a fixed, seeded selection of large plates
random.seed(88)
wall = random.sample(ids, WALL_N)
wdest = out("assets", "wall")
for n, i in enumerate(wall):
    Image.open(os.path.join(FRIED, f"{i}.png")).convert("RGB") \
        .resize((WALL_PX, WALL_PX), Image.LANCZOS) \
        .save(os.path.join(wdest, f"{i}.webp"), "WEBP", quality=84, method=4)
    if n % 8 == 0: print("wall", n, flush=True)
json.dump(wall, open(os.path.join(SITE, "data", "wall.json"), "w"))
print("wall done:", len(wall), flush=True)

# gallery re-encoded larger so the vault plate is crisp
gdest = out("assets", "gallery")
for n, i in enumerate(ids):
    Image.open(os.path.join(FRIED, f"{i}.png")).convert("RGB") \
        .resize((GALLERY_PX, GALLERY_PX), Image.LANCZOS) \
        .save(os.path.join(gdest, f"{i}.webp"), "WEBP", quality=80, method=4)
    if n % 60 == 0: print("gallery", n, flush=True)
print("gallery done:", len(ids), flush=True)
