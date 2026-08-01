/* ══════════════════════════════════════════════
   Menú de casa — app.js
   ══════════════════════════════════════════════ */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── Categorías de súper ─────────────────── */
const CATS = [
  { id: 'verduras',   label: 'Fruta y verdura',    color: '#4E8C4A' },
  { id: 'carne',      label: 'Carne',              color: '#C0392B' },
  { id: 'pescado',    label: 'Pescado y marisco',  color: '#3C6E9F' },
  { id: 'lacteos',    label: 'Lácteos y huevos',   color: '#D8A62E' },
  { id: 'panaderia',  label: 'Pan y cereales',     color: '#B07A3E' },
  { id: 'despensa',   label: 'Despensa',           color: '#7A6A55' },
  { id: 'congelados', label: 'Congelados',         color: '#5C9BB0' },
  { id: 'bebidas',    label: 'Bebidas',            color: '#8A5FA8' },
  { id: 'otros',      label: 'Otros',              color: '#6B7280' },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

const UNITS = ['g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta', 'pizca', 'diente', 'manojo', 'lata', 'paquete', 'al gusto'];

const GUESS = {
  verduras: ['tomate','cebolla','ajo','patata','zanahoria','pimiento','lechuga','espinaca','calabacin','berenjena','brocoli','coliflor','pepino','puerro','champinon','seta','limon','naranja','manzana','platano','fresa','aguacate','perejil','apio','calabaza','judia','guisante','esparrago','rucula','canonigo','mandarina','pera','uva','melon','sandia','kiwi','higo','albaricoque','ciruela','col','acelga','rabanito','remolacha','jengibre','chalota','alcachofa','nectarina','melocoton','arandano','frambuesa'],
  carne: ['pollo','ternera','cerdo','cordero','pavo','jamon','chorizo','salchicha','bacon','panceta','lomo','costilla','solomillo','albondiga','butifarra','fuet','sobrasada','longaniza','conejo','carne picada','hamburguesa','embutido','beicon'],
  pescado: ['salmon','merluza','atun','bacalao','gamba','langostino','mejillon','calamar','pulpo','sepia','sardina','boqueron','dorada','lubina','rape','almeja','anchoa','trucha','marisco','pescado'],
  lacteos: ['leche','queso','yogur','nata','mantequilla','huevo','requeson','mozzarella','parmesano','feta','crema','mascarpone','kefir','cuajada','burrata','ricotta'],
  panaderia: ['pan','harina','pasta','arroz','espagueti','macarron','fideo','cuscus','quinoa','avena','tortilla de trigo','baguette','pan rallado','levadura','galleta','cereal','tostada','molde','lasana','noodle','bulgur','polenta'],
  despensa: ['aceite','vinagre','sal','pimienta','azucar','miel','tomate frito','conserva','garbanzo','lenteja','alubia','judia blanca','caldo','especia','oregano','comino','pimenton','curry','canela','laurel','mostaza','mayonesa','ketchup','soja','tahini','cacao','chocolate','frutos secos','almendra','nuez','pipa','sesamo','pasas','maiz','aceituna','alcaparra','curcuma','nuez moscada','vainilla','maicena','bicarbonato'],
  congelados: ['congelado','helado','guisante congelado','verdura congelada','pizza','nugget','croqueta'],
  bebidas: ['agua','vino','cerveza','zumo','refresco','cafe','te','infusion','leche vegetal','bebida','cava','sidra','kombucha'],
};

/* ── Utilidades ──────────────────────────── */
const norm = s => (s || '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function guessCat(name) {
  const n = norm(name);
  if (!n) return 'otros';
  for (const [cat, words] of Object.entries(GUESS)) {
    if (words.some(w => n.includes(w))) return cat;
  }
  return 'otros';
}

function fmtQty(n) {
  if (n == null || !isFinite(n) || n === 0) return '';
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/* ── Fechas ──────────────────────────────── */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7;          // 0 = lunes
  d.setDate(d.getDate() - diff);
  return d;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function weekKey(monday) {
  const t = new Date(monday);
  t.setDate(t.getDate() + 3);                 // jueves de esa semana (ISO)
  const jan1 = new Date(t.getFullYear(), 0, 1);
  const w = Math.ceil((((t - jan1) / 86400000) + 1) / 7);
  return `${t.getFullYear()}-S${String(w).padStart(2, '0')}`;
}

function weekRange(monday) {
  const sun = addDays(monday, 6);
  const dm = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  const a = dm.format(monday).replace('.', '');
  const b = dm.format(sun).replace('.', '');
  return `${a} – ${b}`;
}

const dayName = d => new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(d);
const dayShort = d => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(d).replace('.', '');

/* ── Estado ──────────────────────────────── */
const KEY = 'menu-de-casa-v1';
const MEALS = [['comida', 'Comida'], ['cena', 'Cena']];

let S = {
  recipes: [],
  plan: {},          // "2026-08-03": { comida:{recipeId,servings}, cena:{...} }
  checked: {},       // "2026-S32::clave": true
  extras: [],        // { id, name, qty, unit, cat, week }
  sb: { url: '', key: '', casa: '' },
  updatedAt: 0,
};

let monday = mondayOf(new Date());
let editing = null;   // receta en edición
let picking = null;   // { date, meal }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(S, JSON.parse(raw));
  } catch (e) { console.warn('No se pudo leer el almacenamiento', e); }
}

function save(touch = true) {
  if (touch) S.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No hay espacio para guardar en este dispositivo'); }
  if (touch) queuePush();
}

/* ── Toast ───────────────────────────────── */
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2400);
}

/* ══════════════════════════════════════════
   VISTA: SEMANA
   ══════════════════════════════════════════ */
function renderWeek() {
  $('#weekRange').textContent = weekRange(monday);
  const onThisWeek = iso(monday) === iso(mondayOf(new Date()));
  $('#todayBtn').style.display = onThisWeek ? 'none' : '';

  const today = iso(new Date());
  const box = $('#days');
  box.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const key = iso(d);
    const entry = S.plan[key] || {};
    const fill = MEALS.filter(([m]) => entry[m]).length;

    const day = document.createElement('div');
    day.className = 'day' + (key === today ? ' is-today' : '');
    day.innerHTML = `
      <div class="day-spine" data-fill="${fill}"></div>
      <div class="day-body">
        <div class="day-head">
          <span class="day-name">${dayName(d)}</span>
          <span class="day-date">${dayShort(d)}</span>
        </div>
        <div class="slots"></div>
      </div>`;

    const slots = $('.slots', day);
    for (const [meal, label] of MEALS) {
      const set = entry[meal];
      const rec = set ? S.recipes.find(r => r.id === set.recipeId) : null;
      const wrap = document.createElement('div');
      wrap.className = 'slot-wrap';

      if (rec) {
        wrap.innerHTML = `
          <button class="slot full" data-date="${key}" data-meal="${meal}">
            <span class="slot-lbl">${label}</span>
            <span class="slot-txt">${rec.emoji || '🍽️'} ${esc(rec.name)}</span>
            <span class="slot-meta">${set.servings} rac.</span>
          </button>
          <button class="slot-clear" data-clear="${key}" data-meal="${meal}" aria-label="Quitar ${label} del ${dayShort(d)}">×</button>`;
      } else {
        wrap.innerHTML = `
          <button class="slot empty" data-date="${key}" data-meal="${meal}">
            <span class="slot-lbl">${label}</span>
            <span class="slot-txt">+ Añadir</span>
          </button>`;
      }
      slots.appendChild(wrap);
    }
    box.appendChild(day);
  }
  updateBadge();
}

const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ══════════════════════════════════════════
   VISTA: RECETAS
   ══════════════════════════════════════════ */
function renderRecipes() {
  const q = norm($('#recipeSearch').value);
  const box = $('#recipeList');
  const list = S.recipes
    .filter(r => !q || norm(r.name).includes(q) || (r.ingredients || []).some(i => norm(i.name).includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  if (!list.length) {
    box.innerHTML = S.recipes.length
      ? `<div class="empty"><strong>Nada con esa búsqueda</strong><p>Prueba con otro nombre o con un ingrediente.</p></div>`
      : `<div class="empty"><strong>Aún no hay recetas</strong><p>Crea la primera y ya podrás ponerla en cualquier día de la semana.</p></div>`;
    return;
  }

  box.innerHTML = list.map(r => {
    const n = (r.ingredients || []).length;
    return `<button class="rec" data-rec="${r.id}">
      <span class="rec-emoji">${r.emoji || '🍽️'}</span>
      <span class="rec-txt">
        <span class="rec-name">${esc(r.name)}</span>
        <span class="rec-sub">${n} ingrediente${n === 1 ? '' : 's'} · ${r.servings} rac.</span>
      </span>
      <span class="rec-chev">›</span>
    </button>`;
  }).join('');
}

/* ══════════════════════════════════════════
   VISTA: COMPRA
   ══════════════════════════════════════════ */
function buildShopping() {
  const wk = weekKey(monday);
  const map = new Map();

  const push = (name, qty, unit, cat, from) => {
    if (!norm(name)) return;
    const k = norm(name) + '|' + norm(unit);
    let e = map.get(k);
    if (!e) {
      e = { key: k, name: name.trim(), unit: (unit || '').trim(), qty: 0, hasQty: false, cat: cat || 'otros', from: [] };
      map.set(k, e);
    }
    if (qty != null && isFinite(qty) && qty > 0) { e.qty += qty; e.hasQty = true; }
    if (from && !e.from.includes(from)) e.from.push(from);
  };

  for (let i = 0; i < 7; i++) {
    const key = iso(addDays(monday, i));
    const entry = S.plan[key] || {};
    for (const [meal] of MEALS) {
      const set = entry[meal];
      if (!set) continue;
      const rec = S.recipes.find(r => r.id === set.recipeId);
      if (!rec) continue;
      const base = Number(rec.servings) || 1;
      const factor = (Number(set.servings) || base) / base;
      for (const ing of rec.ingredients || []) {
        if (!norm(ing.name)) continue;
        const q = Number(ing.qty);
        push(ing.name, isFinite(q) && q > 0 ? q * factor : null, ing.unit, ing.cat, rec.name);
      }
    }
  }

  for (const x of S.extras.filter(e => e.week === wk)) {
    push(x.name, Number(x.qty) || null, x.unit, x.cat, null);
    const k = norm(x.name) + '|' + norm(x.unit);
    const e = map.get(k);
    if (e) e.extraId = x.id;
  }

  const items = [...map.values()];
  const groups = CATS
    .map(c => ({ ...c, items: items.filter(i => i.cat === c.id).sort((a, b) => a.name.localeCompare(b.name, 'es')) }))
    .filter(g => g.items.length);

  return { wk, items, groups };
}

function renderShopping() {
  const { wk, items, groups } = buildShopping();
  $('#shopWeek').textContent = weekRange(monday);
  $('#ticketSub').textContent = `Semana del ${weekRange(monday)}`;

  const box = $('#shopList');
  if (!items.length) {
    box.innerHTML = `<div class="empty"><strong>La lista está vacía</strong><p>Pon recetas en el calendario de la semana y aquí aparecerá todo lo que hay que comprar.</p></div>`;
    $('#shopTotal').textContent = '0 artículos';
    updateBadge();
    return;
  }

  box.innerHTML = groups.map(g => `
    <div class="cat-block">
      <div class="cat-head">
        <span class="cat-swatch" style="background:${g.color}"></span>
        <span class="cat-name">${g.label}</span>
        <span class="cat-rule"></span>
      </div>
      ${g.items.map(it => {
        const done = !!S.checked[wk + '::' + it.key];
        const qty = it.hasQty ? `${fmtQty(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}` : esc(it.unit || '');
        const from = it.from.length
          ? `<span class="item-from">${esc(it.from.slice(0, 2).join(', '))}${it.from.length > 2 ? ` +${it.from.length - 2}` : ''}</span>` : '';
        return `<button class="item${done ? ' done' : ''}" data-item="${esc(it.key)}">
          <span class="box">✓</span>
          <span class="item-name">${esc(it.name)}${from}</span>
          <span class="item-qty">${qty}</span>
          ${it.extraId ? `<span class="item-extra" data-del-extra="${it.extraId}">×</span>` : ''}
        </button>`;
      }).join('')}
    </div>`).join('');

  const pending = items.filter(i => !S.checked[wk + '::' + i.key]).length;
  $('#shopTotal').textContent = `${pending} de ${items.length} por comprar`;
  updateBadge({ wk, items });
}

function updateBadge(data) {
  const { wk, items } = data || buildShopping();
  const pending = items.filter(i => !S.checked[wk + '::' + i.key]).length;
  const b = $('#tabBadge');
  b.textContent = pending > 99 ? '99+' : pending;
  b.classList.toggle('on', pending > 0);
}

/* ══════════════════════════════════════════
   HOJA: elegir receta para un hueco
   ══════════════════════════════════════════ */
function openPick(date, meal) {
  picking = { date, meal };
  const d = new Date(date + 'T12:00:00');
  const label = MEALS.find(m => m[0] === meal)[1];
  $('#pickTitle').textContent = `${label} · ${dayName(d)} ${dayShort(d)}`;
  const cur = (S.plan[date] || {})[meal];
  $('#pickServings').value = cur ? cur.servings : 2;
  $('#pickSearch').value = '';
  renderPick();
  openSheet('#sheetPick');
}

function renderPick() {
  const q = norm($('#pickSearch').value);
  const list = S.recipes
    .filter(r => !q || norm(r.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const box = $('#pickList');
  box.innerHTML = list.length
    ? list.map(r => `<button class="pick" data-pick="${r.id}">
        <span class="rec-emoji">${r.emoji || '🍽️'}</span>
        <span><strong>${esc(r.name)}</strong><small>${(r.ingredients || []).length} ingr. · base ${r.servings} rac.</small></span>
      </button>`).join('')
    : `<div class="empty"><p>No hay recetas todavía. Crea una y vuelve aquí.</p></div>`;
}

/* ══════════════════════════════════════════
   HOJA: editor de recetas
   ══════════════════════════════════════════ */
const EMOJIS = ['🍽️','🥘','🍲','🍝','🍕','🥗','🍚','🍜','🌮','🥪','🍳','🥩','🐟','🍤','🍗','🥔','🍅','🥦','🫕','🍛','🥟','🧆','🌯','🥧','🍠','🫘','🥕','🧀','🍞','🥐','🍰','🥞','🍢','🫙'];

function openRecipe(id) {
  editing = id
    ? JSON.parse(JSON.stringify(S.recipes.find(r => r.id === id)))
    : { id: uid(), name: '', emoji: '🍽️', servings: 2, notes: '', ingredients: [] };

  const old = $('#emojiGrid'); if (old) old.remove();
  $('#recipeTitle').textContent = id ? 'Editar receta' : 'Nueva receta';
  $('#recName').value = editing.name;
  $('#recServings').value = editing.servings;
  $('#recNotes').value = editing.notes || '';
  $('#recEmoji').textContent = editing.emoji || '🍽️';
  $('#delRecipe').style.display = id ? '' : 'none';
  if (!editing.ingredients.length) editing.ingredients.push(blankIng());
  renderIngs();
  openSheet('#sheetRecipe');
  if (!id) setTimeout(() => $('#recName').focus(), 300);
}

const blankIng = () => ({ id: uid(), name: '', qty: '', unit: 'g', cat: 'otros' });

function renderIngs() {
  const box = $('#ingList');
  box.innerHTML = editing.ingredients.map((ing, idx) => `
    <div class="ing" data-idx="${idx}">
      <div class="ing-top">
        <input class="i-name" type="text" value="${esc(ing.name)}" placeholder="Ingrediente" autocomplete="off">
        <button class="ing-del" data-del="${idx}" aria-label="Quitar ingrediente">×</button>
      </div>
      <div class="ing-bot">
        <input class="i-qty" type="text" inputmode="decimal" value="${esc(String(ing.qty ?? ''))}" placeholder="Cant.">
        <select class="i-unit">${UNITS.map(u => `<option value="${u}"${u === ing.unit ? ' selected' : ''}>${u}</option>`).join('')}</select>
        <select class="i-cat">${CATS.map(c => `<option value="${c.id}"${c.id === ing.cat ? ' selected' : ''}>${c.label}</option>`).join('')}</select>
      </div>
    </div>`).join('');
}

function collectIngs() {
  editing.ingredients = $$('#ingList .ing').map(row => {
    const i = Number(row.dataset.idx);
    const prev = editing.ingredients[i] || blankIng();
    return {
      id: prev.id,
      name: $('.i-name', row).value.trim(),
      qty: $('.i-qty', row).value.replace(',', '.').trim(),
      unit: $('.i-unit', row).value,
      cat: $('.i-cat', row).value,
    };
  });
}

/* ══════════════════════════════════════════
   HOJAS (bottom sheets)
   ══════════════════════════════════════════ */
function openSheet(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
function closeSheet(el) { el.hidden = true; document.body.style.overflow = ''; }

document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) closeSheet(c.closest('.sheet'));
});

/* ══════════════════════════════════════════
   SINCRONIZACIÓN CON SUPABASE
   ══════════════════════════════════════════ */
const TABLE = 'menu_casa';

function sb() {
  if (!S.sb) S.sb = { url: '', key: '', casa: '' };
  if (!S.sb.casa) { S.sb.casa = 'casa-' + Math.random().toString(36).slice(2, 10); save(false); }
  return S.sb;
}
const sbReady = () => { const b = sb(); return !!(b.url && b.key && b.casa); };
const sbBase = () => sb().url.trim().replace(/\/+$/, '') + '/rest/v1/' + TABLE;

/* Las claves nuevas (sb_publishable_…) NO son JWT: van solo en apikey.
   Las antiguas (eyJ…) sí lo son y van también en Authorization. */
function sbHead(extra) {
  const key = sb().key.trim();
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key;
  return Object.assign(h, extra || {});
}

async function sbError(r) {
  let msg = 'error ' + r.status;
  try { const j = await r.json(); msg = j.message || j.hint || j.error || msg; } catch (e) {}
  if (/JWT/i.test(msg)) msg = 'la clave no la acepta el servidor';
  if (r.status === 401 || r.status === 403) msg = 'clave incorrecta o falta la política SQL';
  if (r.status === 404) msg = 'falta la tabla menu_casa (ejecuta el SQL)';
  return msg;
}

let pushT, pendiente = false, ultimoStamp = null;
function queuePush() {
  if (!sbReady()) return;
  pendiente = true;
  clearTimeout(pushT);
  pushT = setTimeout(() => pushRemote(true), 1200);
}

/* Envía ya lo que estuviera en cola (al cerrar o esconder la app). */
function flushPush() {
  if (!pendiente || !sbReady()) return;
  clearTimeout(pushT);
  pushRemote(true);
}

function setDot(state, msg) {
  $('#syncDot').dataset.state = state;
  if (msg) $('#syncMsg').textContent = msg;
}

const hora = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

async function pushRemote(silent) {
  if (!sbReady()) { if (!silent) toast('Rellena los tres campos de Supabase'); return; }
  setDot('busy', 'Enviando…');
  const stamp = new Date().toISOString();
  try {
    const r = await fetch(sbBase(), {
      method: 'POST',
      headers: sbHead({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        casa: sb().casa.trim(),
        datos: { recipes: S.recipes, plan: S.plan, checked: S.checked, extras: S.extras, updatedAt: S.updatedAt },
        actualizado_en: stamp,
      }),
    });
    if (!r.ok) throw new Error(await sbError(r));
    pendiente = false;
    ultimoStamp = stamp;              // lo acabamos de escribir nosotros
    setDot('ok', 'Guardado · ' + hora());
    if (!silent) toast('Enviado a Supabase');
  } catch (err) {
    setDot('err', 'No se pudo enviar: ' + err.message);
    if (!silent) toast('No se pudo enviar: ' + err.message);
  }
}

/* Comprobación barata: pide solo la marca de tiempo, no todo el menú.
   Si ha cambiado respecto a lo último que vimos, hace la descarga completa. */
async function checkRemote() {
  if (!sbReady() || document.hidden || pendiente) return;
  try {
    const url = `${sbBase()}?casa=eq.${encodeURIComponent(sb().casa.trim())}&select=actualizado_en`;
    const r = await fetch(url, { headers: sbHead(), cache: 'no-store' });
    if (!r.ok) return;
    const rows = await r.json();
    if (!rows.length) return;
    const stamp = rows[0].actualizado_en;
    /* Primera comprobación: puede que el pull de arranque fallara (sin
       cobertura), así que descargamos de verdad en vez de solo anotar. */
    if (ultimoStamp === null || stamp !== ultimoStamp) {
      ultimoStamp = stamp;
      pullRemote(true);
    }
  } catch (e) { /* sin conexión: se reintenta al siguiente ciclo */ }
}

async function pullRemote(silent) {
  if (!sbReady()) { if (!silent) toast('Rellena los tres campos de Supabase'); return; }
  setDot('busy', 'Trayendo…');
  try {
    const url = `${sbBase()}?casa=eq.${encodeURIComponent(sb().casa.trim())}&select=datos,actualizado_en`;
    const r = await fetch(url, { headers: sbHead(), cache: 'no-store' });
    if (!r.ok) throw new Error(await sbError(r));
    const rows = await r.json();

    if (!rows.length) {
      setDot('ok', 'Esta casa aún no tiene datos. Pulsa Enviar.');
      if (!silent) toast('No hay nada guardado con ese código de casa');
      return;
    }

    ultimoStamp = rows[0].actualizado_en;
    const remote = rows[0].datos || {};
    const rTime = Number(remote.updatedAt) || 0;

    if (!silent && rTime < S.updatedAt) {
      if (!confirm('En Supabase hay datos más antiguos que los de este móvil. ¿Traerlos igualmente y sustituir lo de aquí?')) {
        setDot('ok', 'Sin cambios'); return;
      }
    } else if (silent && rTime <= S.updatedAt) {
      /* Lo de aquí es igual o más nuevo. Si es estrictamente más nuevo,
         el servidor se quedó atrás (dos móviles editaron a la vez):
         lo reenviamos para que todos acaben con la última versión. */
      if (rTime < S.updatedAt) { setDot('busy', 'Reenviando…'); pushRemote(true); }
      else setDot('ok', 'Al día · ' + hora());
      return;
    }

    const yaHabia = S.updatedAt > 0;
    S.recipes = remote.recipes || [];
    S.plan    = remote.plan    || {};
    S.checked = remote.checked || {};
    S.extras  = remote.extras  || [];
    S.updatedAt = rTime;
    save(false);
    renderAll();
    setDot('ok', 'Actualizado · ' + hora());
    if (!silent) toast('Traído de Supabase');
    else if (yaHabia) toast('Alguien ha hecho cambios');
  } catch (err) {
    setDot('err', 'No se pudo traer: ' + err.message);
    if (!silent) toast('No se pudo traer: ' + err.message);
  }
}

/* ══════════════════════════════════════════
   EVENTOS
   ══════════════════════════════════════════ */
function renderAll() { renderWeek(); renderRecipes(); renderShopping(); }

/* Pestañas */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.remove('is-active'));
  t.classList.add('is-active');
  $$('.view').forEach(v => v.classList.remove('is-active'));
  $('#view-' + t.dataset.view).classList.add('is-active');
  if (t.dataset.view === 'compra') renderShopping();
  window.scrollTo({ top: 0 });
}));

/* Semana */
$('#prevWeek').addEventListener('click', () => { monday = addDays(monday, -7); renderWeek(); renderShopping(); });
$('#nextWeek').addEventListener('click', () => { monday = addDays(monday, 7); renderWeek(); renderShopping(); });
$('#todayBtn').addEventListener('click', () => { monday = mondayOf(new Date()); renderWeek(); renderShopping(); });

$('#days').addEventListener('click', e => {
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    const { clear: date, meal } = clear.dataset;
    if (S.plan[date]) { delete S.plan[date][meal]; if (!Object.keys(S.plan[date]).length) delete S.plan[date]; }
    save(); renderWeek(); renderShopping();
    return;
  }
  const slot = e.target.closest('.slot');
  if (slot) openPick(slot.dataset.date, slot.dataset.meal);
});

$('#copyPrev').addEventListener('click', () => {
  const prev = addDays(monday, -7);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const from = S.plan[iso(addDays(prev, i))];
    if (from) { S.plan[iso(addDays(monday, i))] = JSON.parse(JSON.stringify(from)); n++; }
  }
  save(); renderWeek(); renderShopping();
  toast(n ? `Copiados ${n} días` : 'La semana anterior está vacía');
});

$('#clearWeek').addEventListener('click', () => {
  if (!confirm('¿Vaciar todas las comidas y cenas de esta semana?')) return;
  for (let i = 0; i < 7; i++) delete S.plan[iso(addDays(monday, i))];
  save(); renderWeek(); renderShopping();
  toast('Semana vaciada');
});

/* Elegir receta */
$('#pickSearch').addEventListener('input', renderPick);
$('#pickList').addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (!b || !picking) return;
  const servings = Math.max(1, Number($('#pickServings').value) || 2);
  S.plan[picking.date] = S.plan[picking.date] || {};
  S.plan[picking.date][picking.meal] = { recipeId: b.dataset.pick, servings };
  save();
  closeSheet($('#sheetPick'));
  renderWeek(); renderShopping();
});
$('#pickNew').addEventListener('click', () => { closeSheet($('#sheetPick')); openRecipe(null); });

/* Recetas */
$('#newRecipe').addEventListener('click', () => openRecipe(null));
$('#recipeSearch').addEventListener('input', renderRecipes);
$('#recipeList').addEventListener('click', e => {
  const b = e.target.closest('[data-rec]');
  if (b) openRecipe(b.dataset.rec);
});

$('#addIng').addEventListener('click', () => {
  collectIngs();
  editing.ingredients.push(blankIng());
  renderIngs();
  const rows = $$('#ingList .ing');
  $('.i-name', rows[rows.length - 1]).focus();
});

$('#ingList').addEventListener('click', e => {
  const d = e.target.closest('[data-del]');
  if (!d) return;
  collectIngs();
  editing.ingredients.splice(Number(d.dataset.del), 1);
  if (!editing.ingredients.length) editing.ingredients.push(blankIng());
  renderIngs();
});

/* Auto-categoría al escribir el nombre del ingrediente */
$('#ingList').addEventListener('blur', e => {
  if (!e.target.classList.contains('i-name')) return;
  const row = e.target.closest('.ing');
  const sel = $('.i-cat', row);
  if (sel.value === 'otros' && e.target.value.trim()) sel.value = guessCat(e.target.value);
}, true);

/* Selector de icono */
$('#recEmoji').addEventListener('click', () => {
  let grid = $('#emojiGrid');
  if (grid) { grid.remove(); return; }
  grid = document.createElement('div');
  grid.id = 'emojiGrid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin-top:9px';
  grid.innerHTML = EMOJIS.map(e => `<button type="button" data-e="${e}" style="font-size:22px;padding:7px 0;background:var(--card);border:1px solid var(--line);border-radius:7px">${e}</button>`).join('');
  $('.name-row').after(grid);
  grid.addEventListener('click', ev => {
    const b = ev.target.closest('[data-e]');
    if (!b) return;
    editing.emoji = b.dataset.e;
    $('#recEmoji').textContent = b.dataset.e;
    grid.remove();
  });
});

$('#saveRecipe').addEventListener('click', () => {
  const name = $('#recName').value.trim();
  if (!name) { toast('Ponle un nombre a la receta'); $('#recName').focus(); return; }
  collectIngs();
  editing.name = name;
  editing.servings = Math.max(1, Number($('#recServings').value) || 2);
  editing.notes = $('#recNotes').value.trim();
  editing.ingredients = editing.ingredients.filter(i => i.name.trim());

  const i = S.recipes.findIndex(r => r.id === editing.id);
  if (i >= 0) S.recipes[i] = editing; else S.recipes.push(editing);
  save();
  closeSheet($('#sheetRecipe'));
  const g = $('#emojiGrid'); if (g) g.remove();
  renderAll();
  toast('Receta guardada');
});

$('#delRecipe').addEventListener('click', () => {
  if (!confirm(`¿Borrar “${editing.name}”? También se quitará de los días donde esté puesta.`)) return;
  S.recipes = S.recipes.filter(r => r.id !== editing.id);
  for (const date of Object.keys(S.plan)) {
    for (const [meal] of MEALS) {
      if (S.plan[date][meal] && S.plan[date][meal].recipeId === editing.id) delete S.plan[date][meal];
    }
    if (!Object.keys(S.plan[date]).length) delete S.plan[date];
  }
  save();
  closeSheet($('#sheetRecipe'));
  renderAll();
  toast('Receta borrada');
});

/* Compra */
$('#shopList').addEventListener('click', e => {
  const del = e.target.closest('[data-del-extra]');
  if (del) {
    e.stopPropagation();
    S.extras = S.extras.filter(x => x.id !== del.dataset.delExtra);
    save(); renderShopping();
    return;
  }
  const it = e.target.closest('[data-item]');
  if (!it) return;
  const k = weekKey(monday) + '::' + it.dataset.item;
  if (S.checked[k]) delete S.checked[k]; else S.checked[k] = true;
  save(); renderShopping();
});

$('#addExtra').addEventListener('click', () => {
  const raw = prompt('Escríbelo con la cantidad al final.\nPor ejemplo: Papel de cocina 2 ud');
  if (!raw || !raw.trim()) return;
  const { name, qty, unit } = parseExtra(raw.trim());
  if (!name) return;
  S.extras.push({ id: uid(), name, qty, unit, cat: guessCat(name), week: weekKey(monday) });
  save(); renderShopping();
  toast('Añadido a la lista');
});

function parseExtra(raw) {
  const m = raw.match(/^(.*?)[\s]+([\d]+(?:[.,][\d]+)?)\s*([\p{L}]*)$/u);
  if (m && m[1].trim()) {
    return { name: m[1].trim(), qty: Number(m[2].replace(',', '.')), unit: m[3].trim() };
  }
  return { name: raw, qty: null, unit: '' };
}

$('#uncheckAll').addEventListener('click', () => {
  const wk = weekKey(monday);
  for (const k of Object.keys(S.checked)) if (k.startsWith(wk + '::')) delete S.checked[k];
  save(); renderShopping();
  toast('Todo desmarcado');
});

$('#shareList').addEventListener('click', async () => {
  const { wk, groups } = buildShopping();
  if (!groups.length) { toast('No hay nada que compartir'); return; }
  let txt = `LISTA DE LA COMPRA · ${weekRange(monday)}\n`;
  for (const g of groups) {
    txt += `\n${g.label.toUpperCase()}\n`;
    for (const it of g.items) {
      const done = S.checked[wk + '::' + it.key] ? '✓ ' : '· ';
      const q = it.hasQty ? ` — ${fmtQty(it.qty)}${it.unit ? ' ' + it.unit : ''}` : (it.unit ? ` — ${it.unit}` : '');
      txt += `${done}${it.name}${q}\n`;
    }
  }
  try {
    if (navigator.share) await navigator.share({ title: 'Lista de la compra', text: txt });
    else { await navigator.clipboard.writeText(txt); toast('Lista copiada'); }
  } catch (err) { /* cancelado por el usuario */ }
});

/* Ajustes */
$('#btnSettings').addEventListener('click', () => {
  const b = sb();
  $('#sbUrl').value = b.url || '';
  $('#sbKey').value = b.key || '';
  $('#sbCasa').value = b.casa;
  openSheet('#sheetSettings');
});

function readCfg() {
  const b = sb();
  b.url  = $('#sbUrl').value.trim();
  b.key  = $('#sbKey').value.trim();
  b.casa = $('#sbCasa').value.trim() || b.casa;
  save(false);
  setDot(sbReady() ? 'ok' : 'off', sbReady() ? 'Conexión guardada' : 'Faltan datos de conexión');
}
['#sbUrl', '#sbKey', '#sbCasa'].forEach(s => $(s).addEventListener('change', readCfg));
$('#pushNow').addEventListener('click', () => { readCfg(); pushRemote(false); });
$('#pullNow').addEventListener('click', () => { readCfg(); pullRemote(false); });

$('#shareCfg').addEventListener('click', async () => {
  readCfg();
  if (!sbReady()) { toast('Rellena los tres campos primero'); return; }
  const code = btoa(encodeURIComponent(JSON.stringify(sb())));
  const link = location.origin + location.pathname + '#c=' + code;
  try {
    if (navigator.share) await navigator.share({ title: 'Menú de casa', text: 'Abre este enlace para conectar la app:', url: link });
    else { await navigator.clipboard.writeText(link); toast('Enlace copiado'); }
  } catch (e) { /* cancelado */ }
});

$('#exportJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `menu-de-casa-${iso(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#importJson').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    S = Object.assign(S, d);
    save();
    renderAll();
    closeSheet($('#sheetSettings'));
    toast('Copia restaurada');
  } catch (err) { toast('Ese archivo no vale'); }
  e.target.value = '';
});
$('#wipe').addEventListener('click', () => {
  if (!confirm('Se borran recetas, planificación y lista de este dispositivo. ¿Seguro?')) return;
  localStorage.removeItem(KEY);
  location.reload();
});

/* ══════════════════════════════════════════
   ARRANQUE
   ══════════════════════════════════════════ */
load();

/* Conexión recibida por enlace: #c=… */
if (location.hash.startsWith('#c=')) {
  try {
    const cfg = JSON.parse(decodeURIComponent(atob(location.hash.slice(3))));
    if (cfg && cfg.url && cfg.key) {
      S.sb = { url: cfg.url, key: cfg.key, casa: cfg.casa || '' };
      save(false);
      toast('Conexión configurada');
    }
  } catch (e) { /* enlace inválido */ }
  history.replaceState(null, '', location.pathname);
}

renderAll();
setDot(sbReady() ? 'ok' : 'off', sbReady() ? 'Listo para sincronizar' : 'Sin sincronizar');
if (sbReady()) pullRemote(true);

/* ── Mantener los móviles al día ──────────── */

/* No interrumpir mientras se edita una receta o se elige en una hoja. */
const editando = () => $$('.sheet').some(s => !s.hidden);

/* Cada 15 s, comprobación barata (solo la marca de tiempo). */
setInterval(() => { if (!editando()) checkRemote(); }, 15000);

/* Al volver a la app: enviar lo pendiente y mirar si hay novedades. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushPush();
  else if (!editando()) checkRemote();
});

/* Al cerrar la hoja de edición, comprobar de nuevo. */
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) setTimeout(checkRemote, 400);
});

/* Al cerrar o cambiar de app, no perder lo que estuviera en cola. */
window.addEventListener('pagehide', flushPush);
window.addEventListener('online', () => { flushPush(); checkRemote(); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
