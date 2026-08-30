# SWAGFAG SKELLY CLUB — site

Static site. No framework, no build step, no dependencies. Three source files
(`index.html`, `css/style.css`, `js/app.js`) plus generated assets.

## Run it

```bash
python -m http.server 5173 --directory site
```

Then open <http://localhost:5173>. It must be served over HTTP — opening
`index.html` as a `file://` URL will block the `fetch()` calls that load the
registry data.

## Deploy

Upload the contents of `site/` to any static host (Vercel, Netlify, Cloudflare
Pages, GitHub Pages, S3). There is nothing to build and nothing to configure.
Total weight is ~19 MB, almost all of it lazy-loaded gallery images.

## Layout

```
site/
  index.html          the whole page
  css/style.css       all styling
  js/app.js           gate, vault, ledger, grammar, forge
  data/
    traits.json       every trait value + supply count + percentage
    gallery.json      the sampled plates with their traits and ranks
    hero.json         ids used for the large front-matter plate
  assets/
    gallery/          340px plates, one per sampled seat
    hero/             900px plates
    traits/           540px transparent layers, used by the Forge
    ui/               mascot
  tools/
    build_index.py    reads the 3,000 metadata JSONs → rarity.json
    build_assets.py   rarity.json + source art → everything under assets/ and data/
```

## Regenerating assets

Both scripts read from the original art folder
(`../SWAGFAG SKELLY CLUB/`) and only need Pillow:

```bash
python -m pip install Pillow
```

Then, in order:

```bash
python site/tools/build_index.py
```

```bash
python site/tools/build_assets.py
```

Knobs at the top of `build_assets.py`:

| Name | Default | What it does |
|---|---|---|
| `GALLERY_N` | `360` | How many seats end up in the registry. The first 60 are the 60 rarest; the rest are a seeded random sample. Raise to `3000` for the full collection (~115 MB). |
| `TRAIT_PX` | `540` | Forge layer resolution. |
| `GALLERY_PX` | `340` | Registry thumbnail resolution. |
| `HERO_PX` | `900` | Front-matter plate resolution. |
| `OMIT` | 6 entries | Trait values kept out of the Forge picker and the registry sample. |

### About `OMIT`

Six trait values are excluded — three shirts, one decal, one sticker, one
pattern. They were picked by eye from contact sheets of every text-bearing
layer, not from filenames, because several filenames do not describe what is
actually printed on the art.

They are excluded because the artwork itself carries racial or ethnic slurs or
hate imagery, which sits differently from the rest of the collection's shock
humour — a picker that offers them is the site choosing to render them, which
is a different act from the collection containing them.

The underlying data still covers all 3,000 — only what the site *displays* is
narrowed.

Empty the set to ship everything:

```python
OMIT = set()
```

Then rerun `build_assets.py`. Nothing else needs to change.

## Design notes

Almost no words. The whole page carries about **80 words of prose** — four
fragments and some UI labels. The plates do the work.

Everything is **sealed at rest**: grayscaled, darkened, blurred behind a woven
scrim. A plate resolves only while somebody is actively holding it, and re-seals
on release. Nothing is ever laid out as a contact sheet.

- **Gate** — one-time terminal boot per session. Entry is instant; the typing is
  decoration and never blocks it. Fails open if the script dies.
- **Plate I** — full-bleed 16:9 (4:5 on phones). Hold to look.
- **The Wall** — nine large sealed plates, drawn from a pool of 24. Each holds
  and reveals independently.
- **Interstitials** — the only prose. One line, alone, with air around it.
- **The Vault** — name a seat number or draw blind; one plate develops out of
  the seal. Bringing one up puts the last one away.
- **The ledger** — folded shut. Held seats are legible, the rest struck through.
- **The Forge** — the real trait layers in the real paint order. The one place
  shown unveiled, because what it makes are ghosts.

### Dials

- Seal strength — the `filter` on `.veil img`.
- Scrim weave — the three gradients on `.veil .scrim`.
- Develop speed — `transition` durations on `.veil img` / `.veil .scrim`.
- Wall size — the `.slice(0, 9)` in `buildWall()` and `grid-template-columns`
  on `.wall-grid`.
- To make plates stay open once looked at, drop the `close` listeners in
  `holdToLook()`.

### Cache

CSS and JS are linked with `?v=`. Bump it when you edit either, or browsers
serve the old file. The HTML itself is not versioned — hard-refresh
(`Ctrl+Shift+R`) after markup changes.

### The writing

Four fragments, in `index.html` as `.interstitial` paragraphs. They are a
placeholder voice, not yours — swap them for your own lines. Everything else on
the page is a UI label.
