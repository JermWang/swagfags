/* ===================================================================
   SWAGFAG SKELLY CLUB — archive terminal
   No dependencies. No build step. Just like they used to make them.
   =================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pick = a => a[Math.floor(Math.random() * a.length)];

const state = { traits: null, gallery: null, hero: null, filtered: [] };

/* ───────────────────────── GATE ───────────────────────── */

const GATE_LINES = [
  'BOOTING ROTTEN JPEG .............. ok',
  'MOUNTING JUNK DRAWER ............. ok',
  'READING GUESTBOOK ................ mostly lies',
  'LOADING GLITTER CURSOR ........... dangerous',
  'MONETIZATION MODULE .............. not found',
  '',
  'This is an art site. Nothing here is an investment.',
  'Everything may be dragged. Most things should not be trusted.',
  '',
  'You may enter.',
];

function runGate() {
  const gate = $('#gate');
  if (sessionStorage.getItem('sfsc.entered') === '1') { gate.remove(); return; }

  gate.hidden = false;
  const log = $('#gateLog');
  const btn = $('#gateBtn');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let timer = null;

  // The animation is flavour. It must never gate entry — the button is live
  // from the first frame, and anything that enters also stops the typing.
  const enter = () => {
    clearTimeout(timer);
    sessionStorage.setItem('sfsc.entered', '1');
    gate.classList.add('dismissed');
    document.removeEventListener('keydown', onKey);
  };

  const onKey = e => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
  };

  gate.addEventListener('click', enter);
  document.addEventListener('keydown', onKey);

  const full = GATE_LINES.join('\n');

  if (reduced) {
    log.textContent = full;
  } else {
    // Type whole lines rather than characters — the per-character version ran
    // over 20 seconds once timer clamping was accounted for. This lands in ~2.
    let i = 0;
    const tick = () => {
      log.textContent = GATE_LINES.slice(0, ++i).join('\n') + (i < GATE_LINES.length ? '\n█' : '');
      if (i < GATE_LINES.length) timer = setTimeout(tick, 190);
    };
    tick();
  }

  btn.focus();
}

/* ───────────────────────── CHROME ───────────────────────── */

function ticker() {
  if (!$('#tickerText')) return;
  const items = [
    'RIGHT CLICK — <b>SAVE AS</b>',
    'COMPRESSION IS NOT DAMAGE',
    'PNG IS A SPIRITUAL MEDIUM',
    'NO ROADMAP — <b>NO MARKET — NO UTILITY</b>',
    'THE FRY IS PERMANENT',
    'DRAG THE JUNK',
    'THE EYES GO ON LAST',
    'BEST VIEWED AT 1024×768 OR WORSE',
    'SIGN MY GUESTBOOK',
    'LURK MORE',
  ];
  const run = items.join(' ♦ ') + ' ♦ ';
  $('#tickerText').innerHTML = run + run;   // doubled so the -50% loop is seamless
}

function hitCounter() {
  const el = $('#hitCounter');
  if (!el) return;
  const KEY = 'sfsc.hits';
  let n = parseInt(localStorage.getItem(KEY) || '0', 10);
  if (!n) n = 141000 + Math.floor(Math.random() * 900);
  n += 1;
  localStorage.setItem(KEY, String(n));
  el.textContent = String(n).padStart(7, '0');
}

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

/* ───────────────────────── THE RANK ─────────────────────────
   Cut-out members standing on the page's own ground. No square plates,
   no frames — just the characters. */

function buildRank() {
  const host = $('#rankRow');
  if (!host || !state.member) return;
  const chosen = [...state.member].sort(() => Math.random() - 0.5).slice(0, 7);
  chosen.forEach((id, i) => {
    const fig = document.createElement('figure');
    fig.className = 'unit';
    fig.style.setProperty('--i', i);
    fig.innerHTML = `<img loading="lazy" decoding="async" src="${cutout(id)}" alt="">` +
                    `<figcaption>№ ${id}</figcaption>`;
    host.appendChild(fig);
  });
}

/* ───────────────────────── ORNAMENTS ───────────────────────── */

/* Hold to look. Release and the seal closes again. */
function holdToLook(el) {
  const open  = () => el.classList.add('open');
  const close = () => el.classList.remove('open');
  el.addEventListener('pointerdown', open);
  el.addEventListener('pointerup', close);
  el.addEventListener('pointerleave', close);
  el.addEventListener('pointercancel', close);
  // keyboard equivalent, so this isn't pointer-only
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  el.addEventListener('keyup', close);
  el.addEventListener('blur', close);
}

function ornaments() {
  const img = $('#heroImg');
  if (!img || !state.member) return;
  const id = pick(state.member);
  img.src = cutout(id);
  const cap = $('#heroCap');
  if (cap) cap.textContent = `№ ${id}`;
}

/* ───────────────────────── INTERNET RELIQUARY ───────────────────────── */

function initReliquary() {
  const shell = $('#reliquary');
  const field = $('#relicField');
  if (!shell || !field) return;

  const relics = $$('.relic', field);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let z = 6;
  let drag = null;
  let trailAt = 0;
  let popupReturn = null;

  const move = (el, x, y) => {
    const maxX = Math.max(0, field.clientWidth - el.offsetWidth);
    const maxY = Math.max(0, field.clientHeight - el.offsetHeight);
    const nextX = clamp(x, 0, maxX);
    const nextY = clamp(y, 0, maxY);
    el.style.left = nextX + 'px';
    el.style.top = nextY + 'px';
    el.dataset.x = String(nextX);
    el.dataset.y = String(nextY);
  };

  const raise = el => {
    z += 1;
    el.style.zIndex = String(z);
  };

  const placeHome = () => {
    relics.forEach(el => {
      const x = (Number(el.dataset.homeX) / 100) * Math.max(0, field.clientWidth - el.offsetWidth);
      const y = (Number(el.dataset.homeY) / 100) * Math.max(0, field.clientHeight - el.offsetHeight);
      el.style.setProperty('--rz', (Number(el.dataset.r) || 0) + 'deg');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--scale', '1');
      move(el, x, y);
    });
  };

  relics.forEach(el => {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const rect = field.getBoundingClientRect();
      const x = Number(el.dataset.x) || 0;
      const y = Number(el.dataset.y) || 0;
      drag = { el, dx: e.clientX - rect.left - x, dy: e.clientY - rect.top - y };
      raise(el);
      el.classList.add('is-dragging');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener('pointermove', e => {
      if (drag && drag.el === el) {
        const rect = field.getBoundingClientRect();
        move(el, e.clientX - rect.left - drag.dx, e.clientY - rect.top - drag.dy);
        return;
      }
      if (reduced || e.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      el.style.setProperty('--ry', ((px - .5) * 15).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
    });

    const drop = e => {
      if (!drag || drag.el !== el) return;
      el.classList.remove('is-dragging');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      drag = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
    el.addEventListener('pointerleave', () => {
      if (drag) return;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });

    el.addEventListener('focus', () => raise(el));
    el.addEventListener('keydown', e => {
      const amount = e.shiftKey ? 20 : 6;
      const x = Number(el.dataset.x) || 0;
      const y = Number(el.dataset.y) || 0;
      const delta = {
        ArrowLeft: [-amount, 0], ArrowRight: [amount, 0],
        ArrowUp: [0, -amount], ArrowDown: [0, amount],
      }[e.key];
      if (!delta) return;
      e.preventDefault();
      move(el, x + delta[0], y + delta[1]);
    });
  });

  $('#relicWorse').addEventListener('click', () => {
    shell.classList.add('is-worse');
    relics.forEach(el => {
      const x = Math.random() * Math.max(0, field.clientWidth - el.offsetWidth);
      const y = Math.random() * Math.max(0, field.clientHeight - el.offsetHeight);
      move(el, x, y);
      el.style.setProperty('--rz', (Math.random() * 26 - 13).toFixed(1) + 'deg');
      el.style.setProperty('--scale', (.88 + Math.random() * .25).toFixed(2));
      raise(el);
    });
  });

  $('#relicReset').addEventListener('click', () => {
    shell.classList.remove('is-worse');
    placeHome();
  });

  const popup = $('#badPopup');
  const closePopup = () => {
    popup.hidden = true;
    if (popupReturn) popupReturn.focus();
  };
  $('#guestbookButton').addEventListener('click', e => {
    popupReturn = e.currentTarget;
    popup.hidden = false;
    $('#badPopupOkay').focus();
  });
  $('#badPopupClose').addEventListener('click', closePopup);
  $('#badPopupOkay').addEventListener('click', closePopup);
  popup.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

  field.addEventListener('pointermove', e => {
    if (reduced || e.pointerType !== 'mouse' || performance.now() - trailAt < 72) return;
    trailAt = performance.now();
    const rect = field.getBoundingClientRect();
    const crumb = document.createElement('span');
    crumb.className = 'cursor-crumb';
    crumb.textContent = pick(['✦', '+', '☠', '♡', '※']);
    crumb.style.left = (e.clientX - rect.left) + 'px';
    crumb.style.top = (e.clientY - rect.top) + 'px';
    field.appendChild(crumb);
    crumb.addEventListener('animationend', () => crumb.remove(), { once: true });
  });

  requestAnimationFrame(placeHome);
  window.addEventListener('load', placeHome, { once: true });
}
/* ───────────────────────── BOOT ───────────────────────── */

async function boot() {
  runGate();
  ticker();
  hitCounter();
  initReliquary();

  const [traits, gallery, member, parts] = await Promise.all([
    fetch('data/traits.json').then(r => r.json()),
    fetch('data/gallery.json').then(r => r.json()),
    fetch('data/member.json').then(r => r.json()).catch(() => []),
    fetch('data/parts.json').then(r => r.json()).catch(() => ({})),
  ]);
  Object.assign(state, { traits, gallery, member, parts });

  buildFilters();
  divine();
  shutVault();
  buildLedger();
  buildRank();
  buildForge();
  ornaments();
}

boot().catch(err => {
  console.error(err);
  const hint = document.querySelector('#vaultHint');
  if (hint) hint.textContent =
    'The archive is unreachable. This page must be served over HTTP, not opened as a file://.';
});
