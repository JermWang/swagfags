import json, os, re, random, shutil
from PIL import Image, ImageSequence

SITE   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT   = os.path.join(SITE, "SWAGFAG SKELLY CLUB")

ASSETS = os.path.join(ROOT, "ASSETS")
FRIED  = os.path.join(ROOT, "FULL COLLECTION", "deep_fried")

ORDER = ["BACKGROUND","TOP DECAL","BL STICKER","BR STICKER","LEGS","ARMS","BODY","HEAD","EYES"]

# --- Values omitted from the FORGE picker and the curated gallery sample. -------
# Verified by eye against contact sheets of every text-bearing layer, not by
# filename. These carry racial/ethnic slurs or hate imagery in the artwork
# itself, which is a different thing from the collection's general shock humour.
# Empty this set to expose every trait the collection actually ships with.
OMIT = {
    ("BODY",      "gucci"),        # logo lockup spells a racial slur
    ("BODY",      "balenci"),      # "BALENCIBEANER"
    ("BODY",      "jews"),         # antisemitic caricature
    ("BODY",      "racism"),
    ("TOP DECAL", "niggalodeon"),
    ("BR STICKER","hitler"),
}
# -------------------------------------------------------------------------------

GALLERY_N   = 360
TRAIT_PX    = 540
GALLERY_PX  = 340
HERO_PX     = 900

def norm(s):  return re.sub(r"[^a-z0-9]+", "", s.lower())
def slug(s):  return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def out(*p):
    d = os.path.join(SITE, *p); os.makedirs(d, exist_ok=True); return d

rar = json.load(open(os.path.join(SITE, "tools", "rarity.json"), encoding="utf-8"))
total = rar["total"]

# ---------- 1. trait layers ----------
manifest = {"order": ORDER, "total": total, "categories": {}}
for cat in ORDER:
    files = {norm(os.path.splitext(f)[0]): f
             for f in os.listdir(os.path.join(ASSETS, cat)) if f.lower().endswith(".png")}
    dest, entries = out("assets", "traits", slug(cat)), []
    for value, count in rar["categories"][cat].items():
        if (cat, value) in OMIT:      continue
        fn = files.get(norm(value))
        if not fn:
            print(f"  !! no file for {cat}/{value}"); continue
        im = Image.open(os.path.join(ASSETS, cat, fn)).convert("RGBA")
        if im.width > TRAIT_PX: im = im.resize((TRAIT_PX, TRAIT_PX), Image.LANCZOS)
        s = slug(value)
        im.save(os.path.join(dest, s + ".webp"), "WEBP", quality=88, method=4)
        entries.append({"v": value, "s": s, "n": count, "p": round(count / total * 100, 2)})
    manifest["categories"][cat] = entries
    print(f"traits {cat}: {len(entries)}")

json.dump(manifest, open(os.path.join(out("data"), "traits.json"), "w", encoding="utf-8"))

# ---------- 2. gallery ----------
omit_ids = {i for i, t in rar["tokens"].items()
            if any((k, v) in OMIT for k, v in t["traits"].items())}
pool = [i for i in rar["tokens"] if i not in omit_ids]
random.seed(1337)
by_rank = sorted(pool, key=lambda i: rar["tokens"][i]["rank"])
picks   = by_rank[:60] + random.sample(by_rank[60:], GALLERY_N - 60)
random.shuffle(picks)

gdest, gal = out("assets", "gallery"), []
for n, i in enumerate(picks):
    im = Image.open(os.path.join(FRIED, f"{i}.png")).convert("RGB")
    im.resize((GALLERY_PX, GALLERY_PX), Image.LANCZOS)\
      .save(os.path.join(gdest, f"{i}.webp"), "WEBP", quality=80, method=4)
    t = rar["tokens"][i]
    gal.append({"id": int(i), "rank": t["rank"], "traits": t["traits"]})
    if n % 60 == 0: print(f"  gallery {n}/{len(picks)}")

gal.sort(key=lambda x: x["rank"])
json.dump({"total": total, "shown": len(gal), "items": gal},
          open(os.path.join(SITE, "data", "gallery.json"), "w", encoding="utf-8"))
print("gallery:", len(gal))

# ---------- 3. heroes ----------
hdest = out("assets", "hero")
for i in by_rank[:6]:
    Image.open(os.path.join(FRIED, f"{i}.png")).convert("RGB")\
        .resize((HERO_PX, HERO_PX), Image.LANCZOS)\
        .save(os.path.join(hdest, f"{i}.webp"), "WEBP", quality=86, method=4)
json.dump([int(i) for i in by_rank[:6]],
          open(os.path.join(SITE, "data", "hero.json"), "w", encoding="utf-8"))

# ---------- 4. mascot + small animated banner ----------
Image.open(os.path.join(ROOT, "skelly-for-animation.png")).convert("RGBA")\
     .resize((520, 520), Image.LANCZOS)\
     .save(os.path.join(out("assets", "ui"), "skelly.webp"), "WEBP", quality=90)

src_gif = os.path.join(ROOT, "swagfag-art-preview.gif")
frames = []
for f in ImageSequence.Iterator(Image.open(src_gif)):
    frames.append(f.convert("RGBA").resize((240, 240), Image.LANCZOS))
    if len(frames) >= 48: break
frames[0].save(os.path.join(SITE, "assets", "ui", "banner.webp"), "WEBP",
               save_all=True, append_images=frames[1:], duration=90, loop=0, quality=70)
print("banner frames:", len(frames))
