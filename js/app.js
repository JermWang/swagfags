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





const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ── the sky ──────────────────────────────────────────────────────────
   A real photographed dusk (CC0), distorted on the GPU.

   The technique is the one remilia.net uses on its login background, read
   off their bundle and reimplemented here rather than copied: a real sky
   texture is cover-fitted into the viewport, then displaced by its OWN
   luminance, so bright cloud refracts harder than dark cloud and the image
   appears to bend through itself. On top of that a chromatic split samples
   R and B either side of G, and the result is graded.

   Everything that distorts rides scroll: dead calm at the landing screen,
   coming apart on the way down. Pointer X widens the chromatic split, so
   the sky reacts to the same input as the mark. */

const SKY_SRC = 'assets/sky/dusk.webp';

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform vec2  uRes;
uniform float uTime;
uniform float uTexAspect;
uniform float uProg;     // scroll 0..1
uniform float uMx;       // pointer x 0..1
out vec4 outColor;

/* CSS background-size:cover, in UV space — crop the long axis, never stretch */
vec2 coverFit(vec2 uv, float texA, float vpA){
  vec2 r = uv;
  if (vpA > texA) r.y = (uv.y - 0.5) * (texA / vpA) + 0.5;
  else            r.x = (uv.x - 0.5) * (vpA / texA) + 0.5;
  return r;
}

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;

  vec2 s = coverFit(uv, uTexAspect, uRes.x / uRes.y);

  /* the weather keeps moving even when the page is still */
  s.x += uTime * 0.0045;

  /* ripple, gated on scroll so the landing screen is perfectly calm */
  float w = uProg * uProg;
  s.x += sin(s.y * 17.0 + uTime * 0.55) * 0.011 * w;
  s.y += sin(s.x * 23.0 - uTime * 0.42) * 0.007 * w;

  /* self-displacement: the sky refracts through its own brightness */
  float g = luma(texture(uTex, s).rgb);
  vec2 disp = vec2(g * 0.014 * (1.0 + w * 2.6));
  vec2 du = s + disp;

  /* chromatic split — widens as you scroll and as the pointer leaves centre */
  float ch = 0.0012 + w * 0.0065 + abs(uMx - 0.5) * 0.0045;
  vec3 col = vec3(
    texture(uTex, du + vec2(ch, 0.0)).r,
    texture(uTex, du).g,
    texture(uTex, du - vec2(ch, 0.0)).b
  );

  /* grade */
  col = mix(vec3(luma(col)), col, 1.22);   // saturation
  col = (col - 0.5) * 1.16 + 0.5;          // contrast
  col *= 1.03;                             // brightness

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const sky = {
  init() {
    this.canvas = $('#sky');
    if (!this.canvas) return;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.img = new Image();
    this.img.onload = () => this.start();
    this.img.onerror = () => { this.failed = true; };
    this.img.src = SKY_SRC;
  },

  start() {
    if (!this.initGL()) { this.init2D(); return; }
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });

    this.t0 = performance.now();
    this.last = 0;
    const loop = now => {
      this.raf = requestAnimationFrame(loop);
      if (now - this.last < 33) return;          // ~30fps is plenty
      this.last = now;
      this.paint((now - this.t0) / 1000);
    };
    if (this.reduced) this.paint(0);
    else this.raf = requestAnimationFrame(loop);

    // rAF is paused while the tab is hidden; redraw the moment it returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.paint((performance.now() - this.t0) / 1000);
    });
    // Paint synchronously on scroll rather than relying on the rAF loop.
    // rAF is throttled or paused whenever the page is not being composited,
    // and a WebGL surface with nothing redrawing it reads as black — so the
    // scroll-driven distortion has to drive its own repaint.
    addEventListener('scroll', () => {
      const now = performance.now();
      if (now - (this._lastScrollPaint || 0) < 33) return;
      this._lastScrollPaint = now;
      this.paint((now - this.t0) / 1000);
    }, { passive: true });
  },

  initGL() {
    const gl = this.canvas.getContext('webgl2', {
      antialias: false, alpha: false, depth: false, stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,   // a single draw has to survive compositing
    });
    if (!gl) return false;
    this.gl = gl;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('sky shader:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('sky link:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    this.prog = prog;

    // full-screen triangle pair
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    // repeat on x so the horizontal drift never runs out of texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.u = {
      res:    gl.getUniformLocation(prog, 'uRes'),
      time:   gl.getUniformLocation(prog, 'uTime'),
      aspect: gl.getUniformLocation(prog, 'uTexAspect'),
      prog:   gl.getUniformLocation(prog, 'uProg'),
      mx:     gl.getUniformLocation(prog, 'uMx'),
    };
    gl.uniform1f(this.u.aspect, this.img.width / this.img.height);

    this.canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault(); cancelAnimationFrame(this.raf);
    });
    this.canvas.addEventListener('webglcontextrestored', () => this.start());

    return true;
  },

  resize() {
    const c = this.canvas;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    c.width = Math.round(innerWidth * dpr);
    c.height = Math.round(innerHeight * dpr);
    if (this.gl) {
      this.gl.viewport(0, 0, c.width, c.height);
      this.gl.uniform2f(this.u.res, c.width, c.height);
    } else if (this.ctx2d) {
      this.draw2D();
    }
    if (this.reduced) this.paint(0);
  },

  paint(t) {
    const gl = this.gl;
    if (!gl) return;
    const se = document.scrollingElement || document.documentElement;
    const y = scrollY || se.scrollTop || document.body.scrollTop || 0;
    const maxY = Math.max(1, Math.max(se.scrollHeight, document.body.scrollHeight) - innerHeight);

    gl.uniform1f(this.u.time, t);
    gl.uniform1f(this.u.prog, clamp01(y / maxY));
    gl.uniform1f(this.u.mx, view ? view.mx : 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },

  /* no WebGL2: still show the real sky, just undistorted */
  init2D() {
    this.ctx2d = this.canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
  },

  draw2D() {
    const c = this.canvas, ctx = this.ctx2d, im = this.img;
    if (!ctx || !im.width) return;
    const scale = Math.max(c.width / im.width, c.height / im.height);
    const w = im.width * scale, h = im.height * scale;
    ctx.drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h);
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
