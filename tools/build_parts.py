"""
Isolated art only — no square NFT plates anywhere.

  members/  the character composited WITHOUT its background layer, cropped to
            its own silhouette. A cut-out skelly, not a plate.
  parts/    single trait layers cropped to their bounding box, for ornament.
"""
import json, os, re
from PIL import Image

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TR   = os.path.join(SITE, "assets", "traits")

# the character only — decal and stickers belong to the plate, not the body
BODY_ORDER = ["LEGS", "ARMS", "BODY", "HEAD", "EYES"]
PART_CATS  = ["HEAD", "EYES", "BL STICKER", "BR STICKER", "LEGS", "BODY"]

slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

traits  = json.load(open(os.path.join(SITE, "data", "traits.json"), encoding="utf-8"))
gallery = json.load(open(os.path.join(SITE, "data", "gallery.json"), encoding="utf-8"))

def out(*p):
    d = os.path.join(SITE, *p); os.makedirs(d, exist_ok=True); return d

cache = {}
def layer(cat, value):
    key = (cat, value)
    if key not in cache:
        p = os.path.join(TR, slug(cat), slug(value) + ".webp")
        cache[key] = Image.open(p).convert("RGBA") if os.path.exists(p) else None
    return cache[key]

# ---------- 1. cut-out members ----------
mdest = out("assets", "member")
made = []
for n, item in enumerate(gallery["items"]):
    canvas = None
    ok = True
    for cat in BODY_ORDER:
        v = item["traits"].get(cat)
        im = layer(cat, v) if v else None
        if im is None: ok = False; break
        canvas = im.copy() if canvas is None else Image.alpha_composite(canvas, im)
    if not ok or canvas is None: continue
    bb = canvas.getbbox()
    if not bb: continue
    canvas = canvas.crop(bb)
    # normalise onto a tall transparent field so every skelly shares a baseline
    W = 420
    h = max(1, int(canvas.height * W / canvas.width))
    canvas = canvas.resize((W, h), Image.LANCZOS)
    canvas.save(os.path.join(mdest, f"{item['id']}.webp"), "WEBP", quality=86, method=4)
    made.append(item["id"])
    if n % 80 == 0: print("member", n, flush=True)

json.dump(made, open(os.path.join(SITE, "data", "member.json"), "w"))
print("members:", len(made), flush=True)

# ---------- 2. isolated parts ----------
index = {}
for cat in PART_CATS:
    dest = out("assets", "parts", slug(cat))
    got = []
    for row in traits["categories"][cat]:
        v = row["v"]
        if re.fullmatch(r"none2?|no decal", v, re.I): continue
        im = layer(cat, v)
        if im is None: continue
        bb = im.getbbox()
        if not bb: continue
        c = im.crop(bb)
        H = 260
        w = max(1, int(c.width * H / c.height))
        if w > 520:                       # wide banners scale by width instead
            w, H = 520, max(1, int(c.height * 520 / c.width))
        c.resize((w, H), Image.LANCZOS).save(
            os.path.join(dest, slug(v) + ".webp"), "WEBP", quality=88, method=4)
        got.append({"v": v, "s": slug(v)})
    index[cat] = got
    print(f"parts {cat}: {len(got)}", flush=True)

json.dump(index, open(os.path.join(SITE, "data", "parts.json"), "w"))
print("done", flush=True)
