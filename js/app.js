/* ===================================================================
   SWAGFAG SKELLY CLUB
   Ported from the Claude Design artboard. No dependencies, no build step.
   =================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pick = a => a[Math.floor(Math.random() * a.length)];

const state = { traits: null, gallery: null, hero: null, filtered: [] };

/* ───────────────────────── REGISTRY ───────────────────────── */

const cutout = id => `assets/member/${id}.webp`;   // no background, no plate

/* Exactly one plate is ever up. Bringing one up puts the last one away. */

let vaultTimer = null;

function shutVault(message) {
  clearTimeout(vaultTimer);
  const v = $('#vault');
  v.classList.add('shut');
  $('#veil').classList.remove('open');
  $('#vaultImg').removeAttribute('src');
  $('#vaultCap').textContent = 'closed';
  $('#vaultTraits').textContent = '';
  $('#vaultHint').textContent = message || 'name one, or draw blind';
}

function bringUp(item) {
  clearTimeout(vaultTimer);
  const v = $('#vault'), veil = $('#veil'), img = $('#vaultImg');

  v.classList.remove('shut');
  veil.classList.remove('open');           // always re-seal before developing
  img.src = cutout(item.id);
  img.alt = `Source plate ${item.id}`;

  $('#vaultCap').textContent  = `№ ${item.id}`;
  $('#vaultHint').textContent = 'it will not stay up';

  const tbl = $('#vaultTraits');
  tbl.textContent = '';
  state.traits.order.forEach(cat => {
    const val = item.traits[cat];
    if (val === undefined) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${cat}</th><td>${val}</td>`;
    tbl.appendChild(tr);
  });

  // let it develop, then seal it again — nothing stays on display
  vaultTimer = setTimeout(() => veil.classList.add('open'), 90);
  state.lastUp = item;
}

function findSeat(raw) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return { err: 'not a source plate number' };
  if (n < 0 || n >= state.gallery.total)
    return { err: `no source plate numbered ${n}` };
  const item = state.gallery.items.find(i => i.id === n);
  if (!item) return { err: `source plate № ${n} is not cached here` };
  return { item };
}

function divine() {
  const cat = $('#fCat').value, val = $('#fVal').value;
  state.filtered = (cat && val)
    ? state.gallery.items.filter(i => i.traits[cat] === val)
    : state.gallery.items;
}

function buildFilters() {
  const fCat = $('#fCat'), fVal = $('#fVal');

  state.traits.order.forEach(cat => fCat.appendChild(new Option(cat, cat)));

  const refreshValues = () => {
    fVal.textContent = '';
    fVal.appendChild(new Option('— mark —', ''));
    const cat = fCat.value;
    if (!cat) return;
    state.traits.categories[cat].forEach(t =>
      fVal.appendChild(new Option(t.v, t.v)));
  };

  fCat.addEventListener('change', () => { refreshValues(); divine(); });
  fVal.addEventListener('change', divine);

  const summon = () => {
    const raw = $('#fId').value.trim();
    if (!raw) { shutVault('name one first'); return; }
    const { item, err } = findSeat(raw);
    if (err) { shutVault(err); return; }
    bringUp(item);
  };

  $('#fSummon').addEventListener('click', summon);
  $('#fId').addEventListener('keydown', e => { if (e.key === 'Enter') summon(); });

  $('#fRandom').addEventListener('click', () => {
    const pool = state.filtered.length ? state.filtered : state.gallery.items;
    if (!pool.length) { shutVault('nothing here wears that'); return; }
    const item = pick(pool);
    $('#fId').value = item.id;
    bringUp(item);
  });
}

/* The ledger: 3,000 numbers, most of them struck. */
function buildLedger() {
  const held = new Set(state.gallery.items.map(i => i.id));
  const byId = new Map(state.gallery.items.map(i => [i.id, i]));
  const frag = document.createDocumentFragment();

  for (let n = 0; n < state.gallery.total; n++) {
    if (held.has(n)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.addEventListener('click', () => {
        $('#fId').value = n;
        bringUp(byId.get(n));
        $('#vault').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      frag.appendChild(b);
    } else {
      const s = document.createElement('span');
      s.textContent = n;
      frag.appendChild(s);
    }
  }
  $('#ledger').appendChild(frag);
}

/* ───────────────────────── DOSSIER MODAL ───────────────────────── */


/* ───────────────────────── THE FORGE ───────────────────────── */

// Character strata only. Background, decal and stickers belong to the plate,
// and this site does not show plates.
const FORGE_STRATA = ['LEGS', 'ARMS', 'BODY', 'HEAD', 'EYES'];

const forge = {
  ctx: null,
  sel: {},           // cat -> trait row
  cache: new Map(),

  layerSrc(cat, s) { return `assets/traits/${slug(cat)}/${s}.webp`; },

  load(src) {
    if (this.cache.has(src)) return this.cache.get(src);
    const p = new Promise(res => {
      const img = new Image();
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
    this.cache.set(src, p);
    return p;
  },

  async draw() {
    const cats = FORGE_STRATA;
    const imgs = await Promise.all(
      cats.map(c => this.load(this.layerSrc(c, this.sel[c].s))));

    const { ctx } = this;
    const W = ctx.canvas.width;
    ctx.clearRect(0, 0, W, W);

    imgs.forEach(im => { if (im) ctx.drawImage(im, 0, 0, W, W); });

    $('#forgeScore').textContent = 'not in the ledger';
  },

  set(cat, value) {
    this.sel[cat] = state.traits.categories[cat].find(t => t.v === value);
    const s = $(`#fg-${slug(cat)}`);
    if (s && s.value !== value) s.value = value;
    this.draw();
  },

  roll() {
    FORGE_STRATA.forEach(cat => {
      const rows = state.traits.categories[cat];
      this.sel[cat] = pick(rows);
      const sel = $(`#fg-${slug(cat)}`);
      if (sel) sel.value = this.sel[cat].v;
    });
    this.draw();
  },

  save() {
    const a = document.createElement('a');
    a.download = 'swagfag-forged.png';
    a.href = this.ctx.canvas.toDataURL('image/png');
    a.click();
  },
};

function buildForge() {
  forge.ctx = $('#forgeCanvas').getContext('2d');
  const ctl = $('#forgeCtl');

  FORGE_STRATA.forEach(cat => {
    const row = document.createElement('label');
    row.className = 'forge-row';
    const sel = document.createElement('select');
    sel.id = 'fg-' + slug(cat);
    state.traits.categories[cat].forEach(t => {
      sel.appendChild(new Option(t.v, t.v));
    });
    sel.addEventListener('change', () => forge.set(cat, sel.value));
    row.innerHTML = `<span>${cat}</span>`;
    row.appendChild(sel);
    ctl.appendChild(row);
  });

  $('#fgRandom').addEventListener('click', () => forge.roll());
  $('#fgSave').addEventListener('click', () => forge.save());
  forge.roll();
}

/* ═════════════════════════ THE DESIGN ═════════════════════════
   Ported from the Claude Design artboard. Constants, easing and
   magic numbers are kept exactly as authored there. */

const FIGURES = [1795, 1862, 1370, 2193, 1874, 1056, 2266, 1826];

/* Base distortion per figure — nobody is at true proportion until you reach them. */
const WARP = [
  [0.46, 1.78], [1.55, 0.78], [0.34, 1.86], [1.22, 0.90],
  [0.58, 1.52], [1.90, 0.66], [0.40, 1.70], [1.38, 0.82],
];

const DECALS = [
  'assets/decal/bando-world-order.webp',
  'assets/decal/grifter.webp',
  'assets/decal/cokefiend.webp',
  'assets/mark/wordmark.webp',
  'assets/decal/ak47.webp',
  'assets/decal/cashgrabber.webp',
];

/* Dusk, in the collection's own colours: violet → magenta → ember → sun. */
const SKY = [[14,2,48],[44,6,104],[112,14,152],[222,38,148],[255,116,98],[255,208,138]];

/* value noise ---------------------------------------------------------- */
const PERM = new Uint8Array(512);
(() => {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const fade = t => t * t * (3 - 2 * t);
const hash = (a, b) => PERM[(PERM[a & 255] + (b & 255)) & 511] * 0.00392156862745098;

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const c8 = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ── the sky ──────────────────────────────────────────────────────────
   One procedural dusk, drawn small and resampled up smoothly: advecting
   cloud strata, a heat shimmer that bends every row, and a downward
   cascade in the lower half. Perfectly still on the landing screen;
   comes apart on the way down. */

const sky = {
  init() {
    this.canvas = $('#sky');
    if (!this.canvas) return;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });

    this.t0 = performance.now();
    this.last = 0;
    const loop = now => {
      this.raf = requestAnimationFrame(loop);
      if (now - this.last < 33) return;              // ~30fps is plenty
      this.last = now;
      this.paint((now - this.t0) / 1000);
    };
    if (this.reduced) this.paint(0);
    else this.raf = requestAnimationFrame(loop);
  },

  resize() {
    const c = this.canvas;
    if (!c) return;
    c.width = innerWidth; c.height = innerHeight;
    const S = 3;
    this.bw = Math.max(40, Math.ceil(innerWidth / S));
    this.bh = Math.max(40, Math.ceil(innerHeight / S));
    this.buf = document.createElement('canvas');
    this.buf.width = this.bw; this.buf.height = this.bh;
    this.bctx = this.buf.getContext('2d');
    this.img = this.bctx.createImageData(this.bw, this.bh);
    this.ctx = c.getContext('2d');
    if (this.reduced) this.paint(0);
  },

  paint(t) {
    const bw = this.bw, bh = this.bh, img = this.img;
    if (!img) return;
    const px = img.data;
    /* Read the scroll from whichever element is actually the scroller —
       depending on the host it is the window OR the body. */
    const se = document.scrollingElement || document.documentElement;
    const y0 = scrollY || se.scrollTop || document.body.scrollTop || 0;
    const maxY = Math.max(1, Math.max(se.scrollHeight, document.body.scrollHeight) - innerHeight);

    const drift = y0 * 0.0012;                       // the plane keeps moving as you go down
    const prog = clamp01(y0 / maxY);
    const warp = prog * prog * 2.6;                  // exactly nothing at the top

    for (let y = 0; y < bh; y++) {
      const v = y / bh;
      const seg = Math.pow(v, 1.08) * (SKY.length - 1);   // horizon low in frame
      const i0 = Math.min(SKY.length - 2, seg | 0);
      const ft = seg - i0;
      const c0 = SKY[i0], c1 = SKY[i0 + 1];
      const br = lerp(c0[0], c1[0], ft), bg = lerp(c0[1], c1[1], ft), bb = lerp(c0[2], c1[2], ft);
      /* shimmer: every row is displaced. Zero at the landing screen,
         heavy by the bottom of the page. */
      const sh = (0.021 * Math.sin(v * 19 + t * 1.15)
                + 0.011 * Math.sin(v * 47 - t * 0.72)
                + 0.026 * prog * Math.sin(v * 88 + t * 2.15)
                + 0.018 * prog * Math.sin(v * 151 - t * 1.6)) * warp;
      const cascadeMask = clamp01((v - 0.42) / 0.58) * prog;

      for (let x = 0; x < bw; x++) {
        const u = x / bw + sh;

        /* cloud strata, advecting sideways and thinning with altitude */
        let cl = vnoise(u * 4.4 + t * 0.05, v * 9.0 + drift) * 0.50
               + vnoise(u * 10.2 - t * 0.03, v * 20.5 + drift) * 0.32
               + vnoise(u * 23.0 + t * 0.02, v * 44.0 + drift) * 0.18;
        cl = clamp01((cl - 0.30) * 2.6) * (0.42 + v * 0.86);

        /* the waterfall: noise falling straight down, forever */
        const wv = vnoise(u * 8.4, v * 26.0 - t * 1.35);
        const cascade = cascadeMask * clamp01((wv - 0.44) * 2.7);

        let r = br + (252 - br) * cl * 0.9;
        let g = bg + (240 - bg) * cl * 0.9;
        let b = bb + (255 - bb) * cl * 0.9;
        r += cascade * (168 - r) * 0.74;
        g += cascade * (248 - g) * 0.74;
        b += cascade * (255 - b) * 0.74;

        const i = (y * bw + x) << 2;
        px[i] = c8(r); px[i + 1] = c8(g); px[i + 2] = c8(b); px[i + 3] = 255;
      }
    }

    this.bctx.putImageData(img, 0, 0);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;                // soft, not blocky
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height);
  },
};

/* ── the reactive layer ──────────────────────────────────────────────
   Pointer X drives the chromatic split on the mark and the knockout;
   pointer X over the row un-warps whichever figure you reach. */

const view = { mx: 0.5, rowX: null, scroll: 0 };
let viewRaf = null;

function paintView() {
  viewRaf = null;
  const { mx, rowX, scroll } = view;
  const k = (mx - 0.5) * 2;
  const sy = 1.34 + Math.abs(k) * 0.34;
  const skew = -k * 5.2;

  const mark = $('#mark'), gA = $('#ghostA'), gB = $('#ghostB');
  if (mark) mark.style.transform = 'scaleY(' + sy.toFixed(3) + ') skewX(' + skew.toFixed(2) + 'deg)';
  if (gA) {
    gA.style.filter = 'hue-rotate(' + ((150 + k * 40) | 0) + 'deg) saturate(3.4)';
    gA.style.transform = 'translate(' + (-11 - k * 9).toFixed(1) + 'px,' + (7 + k * 3).toFixed(1) + 'px) '
      + 'scaleY(' + (sy * 1.045).toFixed(3) + ') skewX(' + (skew * 1.5).toFixed(2) + 'deg)';
  }
  if (gB) {
    gB.style.filter = 'hue-rotate(' + ((300 - k * 50) | 0) + 'deg) saturate(3.4)';
    gB.style.transform = 'translate(' + (12 - k * 9).toFixed(1) + 'px,' + (-6 + k * 3).toFixed(1) + 'px) '
      + 'scaleY(' + (sy * 0.965).toFixed(3) + ') skewX(' + (skew * 0.5).toFixed(2) + 'deg)';
  }

  /* the mark stretched until the letterforms stop being type and become
     architecture — cropped hard by the viewport on both sides */
  const sm = $('#stretchMark');
  if (sm) sm.style.transform =
    'scaleY(' + (3.1 + Math.abs(k) * 0.5).toFixed(2) + ') skewX(' + (skew * 0.35).toFixed(2) + 'deg)';

  const hole = $('#hole');
  if (hole) hole.style.transform = 'scaleY(' + (0.72 + Math.abs(k) * 0.26).toFixed(3) + ')';

  $$('#figureRow img').forEach((img, i) => {
    const centre = (i + 0.5) / FIGURES.length;
    const t = rowX === null
      ? 0.06 + 0.06 * Math.sin(scroll / 190 + i)
      : clamp01(1 - Math.abs(rowX - centre) * 4.2);
    const w = WARP[i] || [1, 1];
    const fx = lerp(w[0], 1, t), fy = lerp(w[1], 1, t);
    img.style.transform = 'scale(' + fx.toFixed(3) + ',' + fy.toFixed(3) + ')';
    img.style.filter = 'saturate(' + (1.25 + t * 0.75).toFixed(2) + ') '
      + 'contrast(' + (1.04 + t * 0.14).toFixed(2) + ') '
      + 'drop-shadow(0 ' + ((10 + t * 22) | 0) + 'px ' + ((20 + t * 26) | 0) + 'px rgba(7,0,12,.72))';
  });
}

const queueView = () => { if (!viewRaf) viewRaf = requestAnimationFrame(paintView); };

function buildDesign() {
  const row = $('#figureRow');
  if (row) {
    FIGURES.forEach(id => {
      const cell = document.createElement('div');
      const img = document.createElement('img');
      img.src = cutout(id); img.alt = ''; img.loading = 'lazy';
      cell.appendChild(img);
      row.appendChild(cell);
    });
    row.addEventListener('pointermove', e => {
      const r = row.getBoundingClientRect();
      view.rowX = clamp01((e.clientX - r.left) / r.width);
      queueView();
    });
    row.addEventListener('pointerleave', () => { view.rowX = null; queueView(); });
  }

  const runA = DECALS.concat(DECALS);
  const runB = DECALS.slice().reverse().concat(DECALS.slice().reverse());
  [['#runA', runA], ['#runB', runB]].forEach(pair => {
    const host = $(pair[0]);
    if (!host) return;
    pair[1].forEach(src => {
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      host.appendChild(img);
    });
  });

  addEventListener('pointermove', e => {
    view.mx = clamp01(e.clientX / (innerWidth || 1));
    queueView();
  }, { passive: true });

  addEventListener('scroll', () => {
    const se = document.scrollingElement || document.documentElement;
    view.scroll = scrollY || se.scrollTop || document.body.scrollTop || 0;
    queueView();
  }, { passive: true });

  paintView();
}

/* ───────────────────────── BOOT ───────────────────────── */

async function boot() {
  sky.init();
  buildDesign();

  const results = await Promise.all([
    fetch('data/traits.json').then(r => r.json()),
    fetch('data/gallery.json').then(r => r.json()),
  ]);
  Object.assign(state, { traits: results[0], gallery: results[1] });

  buildFilters();
  divine();
  shutVault();
  buildLedger();
  buildForge();
}

boot().catch(err => {
  console.error(err);
  const hint = $('#vaultHint');
  if (hint) hint.textContent = 'archive unreachable — must be served over http';
});
