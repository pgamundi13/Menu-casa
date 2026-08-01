/* ══════════════════════════════════════════════
   Menú de casa
   Les dades viuen a Supabase, una fila per recepta,
   per dia i per article. Realtime avisa la resta de mòbils.
   ══════════════════════════════════════════════ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const db = createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

/* ── Seccions del súper ─────────────────────── */
const CATS = [
  { id: 'verduras',   label: 'Fruita i verdura', emoji: '🥬' },
  { id: 'carne',      label: 'Carn',             emoji: '🥩' },
  { id: 'pescado',    label: 'Peix i marisc',    emoji: '🐟' },
  { id: 'lacteos',    label: 'Làctics i ous',    emoji: '🧀' },
  { id: 'panaderia',  label: 'Pa i cereals',     emoji: '🍞' },
  { id: 'despensa',   label: 'Rebost',           emoji: '🫙' },
  { id: 'congelados', label: 'Congelats',        emoji: '🧊' },
  { id: 'bebidas',    label: 'Begudes',          emoji: '🥤' },
  { id: 'otros',      label: 'Altres',           emoji: '🧺' },
];

const UNITS = ['g','kg','ml','l','unitat','cullerada','culleradeta','pessic','gra','manat','llauna','paquet','al gust'];

/* Formes antigues o en castellà que volen dir el mateix. Es
   normalitzen en llegir, perquè "6 u" i "2 unitats" se sumin. */
const ALIES = { u:'unitat', ud:'unitat', uds:'unitat', unitats:'unitat', unidad:'unitat', unidades:'unitat',
                cda:'cullerada', cdta:'culleradeta', pizca:'pessic', diente:'gra', manojo:'manat',
                lata:'llauna', paquete:'paquet', 'al gusto':'al gust' };

const normUnitat = u => ALIES[norm(u)] || (u || '').trim();

/* "1 unitat" pero "6 unitats". */
function mostraUnitat(u, q) {
  if (u === 'unitat') return q === 1 ? 'unitat' : 'unitats';
  return u;
}

/* Paraules per endevinar la secció. Sense accents: el text es
   normalitza abans de comparar. Català i castellà barrejats,
   que a casa s'escriu de les dues maneres. */
const GUESS = {
  verduras: ['tomaquet','tomate','ceba','cebolla','all','ajo','patata','pastanaga','zanahoria','pebrot','pimiento','enciam','lechuga','espinac','espinaca','carbasso','calabacin','alberginia','berenjena','broquil','brocoli','col-i-flor','coliflor','cogombre','pepino','porro','puerro','xampinyo','champinon','bolet','seta','llimona','limon','taronja','naranja','poma','manzana','platan','platano','maduixa','fresa','alvocat','aguacate','julivert','perejil','api','apio','carbassa','calabaza','mongeta','judia','pesol','guisante','esparrec','esparrago','ruca','rucula','canonge','canonigo','mandarina','pera','raim','uva','melo','melon','sindria','sandia','kiwi','figa','higo','albercoc','albaricoque','pruna','ciruela','col','bleda','acelga','rave','rabanito','remolatxa','remolacha','gingebre','jengibre','escalunya','chalota','carxofa','alcachofa','nectarina','pressec','melocoton','nabiu','arandano','gerd','frambuesa','herbes','verdura','fruita'],
  carne: ['pollastre','pollo','vedella','ternera','porc','cerdo','xai','cordero','gall dindi','pavo','pernil','jamon','xorico','chorizo','salsitxa','salchicha','cansalada','bacon','panceta','llom','lomo','costella','costilla','filet','solomillo','mandonguilla','albondiga','botifarra','butifarra','fuet','sobrassada','sobrasada','llonganissa','longaniza','conill','conejo','carn picada','carne picada','hamburguesa','embotit','embutido','beicon'],
  pescado: ['salmo','salmon','lluc','merluza','tonyina','atun','bacalla','bacalao','gamba','llagosti','langostino','musclo','mejillon','calamar','pop','pulpo','sipia','sepia','sardina','seito','boqueron','orada','dorada','llobarro','lubina','rap','rape','cloissa','almeja','anxova','anchoa','truita de riu','trucha','marisc','marisco','peix'],
  lacteos: ['llet','leche','formatge','queso','iogurt','yogur','nata','mantega','mantequilla','ou','huevo','mato','requeson','mozzarella','parmesa','parmesano','feta','crema','mascarpone','quefir','kefir','burrata','ricotta'],
  panaderia: ['pa ratllat','pan rallado','pa','pan','farina','harina','pasta','arros','arroz','espagueti','macarro','macarron','fideu','fideo','tallarines','tallarina','cuscus','quinoa','civada','avena','baguet','baguette','llevat','levadura','galeta','galleta','cereal','torrada','tostada','motlle','molde','lasanya','lasana','noodle','bulgur','polenta','tortilla de blat','tortilla de trigo'],
  despensa: ['oli','aceite','vinagre','sal','pebre','pimienta','sucre','azucar','mel','miel','tomaquet fregit','tomate frito','conserva','cigro','garbanzo','llentia','lenteja','mongeta seca','alubia','brou','caldo','especia','orenga','oregano','comi','comino','pebre vermell','pimenton','curri','curry','canyella','canela','llorer','laurel','mostassa','mostaza','maionesa','mayonesa','quetxup','ketchup','soja','tahini','cacau','cacao','xocolata','chocolate','fruita seca','frutos secos','ametlla','almendra','nou','nuez','pipa','sesam','sesamo','panses','pasas','blat de moro','maiz','oliva','aceituna','tapera','alcaparra','curcuma','nou moscada','nuez moscada','vainilla','maizena','maicena','bicarbonat','bicarbonato'],
  congelados: ['congelat','congelada','congelats','congelades','congelado','congelada','congelados','gelat','helado','pizza','croqueta','nugget'],
  bebidas: ['aigua','agua','vi','vino','cervesa','cerveza','suc','zumo','refresc','refresco','cafe','te','infusio','infusion','beguda','bebida','cava','sidra','kombucha'],
};

/* ── Utilitats ──────────────────────────────── */
const norm = s => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esc  = s => (s || '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/* Terminacions que fan plural o diminutiu: "ous", "cigrons", "llucet". */
const SUFIX = ['', 's', 'es', 'os', 'ns', 'et', 'ets', 'eta', 'etes'];

/* Totes les formes d'una paraula. El català canvia la lletra en
   alguns plurals: taronja→taronges, figa→figues, oca→oques. */
function formes(w) {
  const f = SUFIX.map(s => w + s);
  if (w.endsWith('ja')) f.push(w.slice(0, -2) + 'ges');
  else if (w.endsWith('ga')) f.push(w.slice(0, -2) + 'gues');
  else if (w.endsWith('ca')) f.push(w.slice(0, -2) + 'ques');
  else if (w.endsWith('ça')) f.push(w.slice(0, -2) + 'ces');
  else if (w.endsWith('a'))  f.push(w.slice(0, -1) + 'es');
  return f;
}

function apareix(n, tokens, w) {
  if (w.includes(' ')) return n.indexOf(w);
  const v = formes(w);
  for (const t of tokens) if (v.includes(t)) return n.indexOf(t);
  return -1;
}

/* Compara per paraules senceres, no per trossos: així "cavall" no
   acaba a les begudes per culpa de "cava". Quan encaixa més d'una
   paraula, mana la que surt abans: a "gelat de vainilla" el que
   compta és el gelat, no la vainilla. */
function guessCat(nom) {
  const n = norm(nom);
  if (!n) return 'otros';
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);

  /* El congelador mana: uns "pèsols congelats" no van amb la verdura
     fresca encara que la paraula "pèsol" surti primer. */
  if (GUESS.congelados.some(w => apareix(n, tokens, w) >= 0)) return 'congelados';

  let millor = null;
  for (const [cat, words] of Object.entries(GUESS)) {
    for (const w of words) {
      const pos = apareix(n, tokens, w);
      if (pos < 0) continue;
      if (!millor || pos < millor.pos || (pos === millor.pos && w.length > millor.len)) {
        millor = { cat, pos, len: w.length };
      }
    }
  }
  return millor ? millor.cat : 'otros';
}

function fmtQty(n) {
  if (n == null || !isFinite(n) || n === 0) return '';
  return (Math.round(n * 100) / 100).toLocaleString('ca-ES', { maximumFractionDigits: 2 });
}

/* ── Dates ──────────────────────────────────── */
const MESOS = ['gen','feb','març','abr','maig','juny','jul','ago','set','oct','nov','des'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay()+6) % 7));
  return d;
}

function weekKey(monday) {
  const t = addDays(monday, 3);
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return `${t.getFullYear()}-S${String(Math.ceil((((t-jan1)/86400000)+1)/7)).padStart(2,'0')}`;
}

const dayShort  = d => `${d.getDate()} ${MESOS[d.getMonth()]}`;
const dayName   = d => new Intl.DateTimeFormat('ca-ES', { weekday:'long' }).format(d);
const weekRange = m => `${dayShort(m)} – ${dayShort(addDays(m,6))}`;

/* ── Estat en memòria (mirall de la base) ───── */
const MEALS = [['comida','Dinar'], ['cena','Sopar']];
const CACHE = 'menu-casa-cache';

let recetas = [], menu = [], extras = [], marcados = [];
let monday = mondayOf(new Date());
let editing = null, picking = null;

function guardarCache() {
  try { localStorage.setItem(CACHE, JSON.stringify({ recetas, menu, extras, marcados })); } catch (e) {}
}
function llegirCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (!d) return false;
    recetas = d.recetas || []; menu = d.menu || [];
    extras = d.extras || []; marcados = d.marcados || [];
    return true;
  } catch (e) { return false; }
}

/* ── Avisos ─────────────────────────────────── */
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2600);
}

function setDot(state, msg) {
  $('#syncDot').dataset.state = state;
  if (msg) $('#syncMsg').textContent = msg;
}

function fallada(err, quePassava) {
  console.error(quePassava, err);
  const m = (err && err.message) || '';
  let txt = 'No s\u2019ha pogut ' + quePassava;
  if (/Failed to fetch|NetworkError|network/i.test(m)) txt = 'Sense connexió. Torna-ho a provar d\u2019aquí una estona.';
  else if (/does not exist|relation/i.test(m)) txt = 'Falta preparar la base de dades (executa el SQL)';
  else if (/row-level security|policy/i.test(m)) txt = 'La base de dades no deixa escriure. Revisa el SQL.';
  else if (m) txt += ': ' + m;
  toast(txt);
  setDot('err', txt);
}

const ara = () => new Date().toLocaleTimeString('ca-ES', { hour:'2-digit', minute:'2-digit' });

/* ══════════════════════════════════════════════
   CÀRREGA
   ══════════════════════════════════════════════ */
async function carregarTot() {
  setDot('busy', 'Carregant…');
  const [r1, r2, r3, r4] = await Promise.all([
    db.from('recetas').select('*').order('nombre'),
    db.from('menu').select('*'),
    db.from('extras').select('*'),
    db.from('marcados').select('*'),
  ]);
  const err = r1.error || r2.error || r3.error || r4.error;
  if (err) throw err;
  recetas = r1.data || []; menu = r2.data || [];
  extras = r3.data || []; marcados = r4.data || [];
  guardarCache();
  renderAll();
  setDot('ok', 'Al dia · ' + ara());
}

async function recarregar(taula) {
  const { data, error } = await db.from(taula).select('*');
  if (error) return;
  if (taula === 'recetas') recetas = data.sort((a,b) => a.nombre.localeCompare(b.nombre,'ca'));
  if (taula === 'menu') menu = data;
  if (taula === 'extras') extras = data;
  if (taula === 'marcados') marcados = data;
  guardarCache();
  renderAll();
}

/* ══════════════════════════════════════════════
   SETMANA
   ══════════════════════════════════════════════ */
const enSlot = (dia, moment) => menu.find(m => m.dia === dia && m.momento === moment);
const recepta = id => recetas.find(r => r.id === id);

function renderWeek() {
  $('#weekRange').textContent = weekRange(monday);
  $('#todayBtn').style.display = iso(monday) === iso(mondayOf(new Date())) ? 'none' : '';

  const avui = iso(new Date());
  const box = $('#days');
  box.innerHTML = '';
  let posats = 0;

  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i), key = iso(d);
    let plens = 0;

    const day = document.createElement('div');
    day.className = 'day' + (key === avui ? ' is-today' : '');
    day.innerHTML = `<div class="day-spine"></div>
      <div class="day-body">
        <div class="day-head"><span class="day-name">${dayName(d)}</span><span class="day-date">${dayShort(d)}</span></div>
        <div class="slots"></div>
      </div>`;

    const slots = $('.slots', day);
    for (const [meal, label] of MEALS) {
      const set = enSlot(key, meal);
      const rec = set ? recepta(set.receta_id) : null;
      const wrap = document.createElement('div');
      wrap.className = 'slot-wrap';
      if (rec) {
        plens++; posats++;
        wrap.innerHTML = `<button class="slot full" data-date="${key}" data-meal="${meal}">
            <span class="slot-lbl">${label}</span>
            <span class="slot-txt">${rec.emoji || '🍽️'} ${esc(rec.nombre)}</span>
            <span class="slot-meta">${set.raciones} rac.</span></button>
          <button class="slot-clear" data-clear="${key}" data-meal="${meal}" aria-label="Treure el ${label.toLowerCase()} del ${dayShort(d)}">×</button>`;
      } else {
        wrap.innerHTML = `<button class="slot empty" data-date="${key}" data-meal="${meal}">
            <span class="slot-lbl">${label}</span><span class="slot-txt">+ Afegir</span></button>`;
      }
      slots.appendChild(wrap);
    }
    $('.day-spine', day).dataset.fill = plens;
    box.appendChild(day);
  }

  $('#wkCount').textContent = `${posats}/14 posats`;
  $('#wkFill').style.width = Math.round(posats / 14 * 100) + '%';
}

/* ══════════════════════════════════════════════
   RECEPTES
   ══════════════════════════════════════════════ */
function renderRecipes() {
  const q = norm($('#recipeSearch').value);
  const box = $('#recipeList');
  const list = recetas.filter(r => !q || norm(r.nombre).includes(q)
    || (r.ingredientes || []).some(i => norm(i.nombre).includes(q)));

  if (!list.length) {
    box.innerHTML = recetas.length
      ? `<div class="empty"><div class="empty-mark">🔍</div><strong>Cap resultat</strong><p>Prova amb un altre nom o amb un ingredient.</p></div>`
      : `<div class="empty"><div class="empty-mark">📖</div><strong>El receptari és buit</strong><p>Crea la primera recepta i ja la podràs posar a qualsevol dia de la setmana.</p></div>`;
    return;
  }

  box.innerHTML = list.map(r => {
    const n = (r.ingredientes || []).length;
    return `<button class="rec" data-rec="${r.id}">
      <span class="rec-emoji">${r.emoji || '🍽️'}</span>
      <span class="rec-txt"><span class="rec-name">${esc(r.nombre)}</span>
        <span class="rec-sub">${n} ingredient${n===1?'':'s'} · ${r.raciones} rac.</span></span>
      <span class="rec-chev">›</span></button>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   COMPRA
   ══════════════════════════════════════════════ */
function buildShopping() {
  const wk = weekKey(monday);
  const map = new Map();

  const push = (nom, quant, u, cat, de, extraId) => {
    if (!norm(nom)) return;
    const unitat = normUnitat(u);
    const k = norm(nom) + '|' + norm(unitat);
    let e = map.get(k);
    if (!e) { e = { key:k, name:nom.trim(), unit:unitat, qty:0, hasQty:false, cat:cat||'otros', from:[] }; map.set(k, e); }
    if (quant != null && isFinite(quant) && quant > 0) { e.qty += quant; e.hasQty = true; }
    if (de && !e.from.includes(de)) e.from.push(de);
    if (extraId) e.extraId = extraId;
  };

  for (let i = 0; i < 7; i++) {
    const key = iso(addDays(monday, i));
    for (const [meal] of MEALS) {
      const set = enSlot(key, meal);
      if (!set) continue;
      const rec = recepta(set.receta_id);
      if (!rec) continue;
      const base = Number(rec.raciones) || 1;
      const factor = (Number(set.raciones) || base) / base;
      for (const ing of rec.ingredientes || []) {
        const q = Number(ing.cantidad);
        push(ing.nombre, isFinite(q) && q > 0 ? q * factor : null, ing.unidad, ing.categoria, rec.nombre);
      }
    }
  }

  for (const x of extras.filter(e => e.semana === wk)) {
    push(x.nombre, x.cantidad == null ? null : Number(x.cantidad), x.unidad, x.categoria, null, x.id);
  }

  const items = [...map.values()];
  const groups = CATS
    .map(c => ({ ...c, items: items.filter(i => i.cat === c.id).sort((a,b) => a.name.localeCompare(b.name,'ca')) }))
    .filter(g => g.items.length);

  return { wk, items, groups };
}

const estaMarcat = (wk, key) => marcados.some(m => m.clave === wk + '::' + key);

function renderShopping() {
  const { wk, items, groups } = buildShopping();
  $('#shopWeek').textContent = weekRange(monday);
  $('#ticketSub').textContent = `Setmana del ${weekRange(monday)}`;

  const box = $('#shopList');
  if (!items.length) {
    box.innerHTML = `<div class="empty"><div class="empty-mark">🧺</div><strong>Encara no hi ha res per comprar</strong><p>Posa receptes al calendari i aquí sortirà la llista, ordenada per seccions del súper.</p></div>`;
    $('#shopTotal').textContent = '0 articles';
    updateBadge(0);
    return;
  }

  box.innerHTML = groups.map(g => `
    <div class="cat-block">
      <div class="cat-head">
        <span class="cat-emoji">${g.emoji}</span>
        <span class="cat-name">${g.label}</span>
        <span class="cat-rule"></span>
        <span class="cat-n">${g.items.length}</span>
      </div>
      ${g.items.map(it => {
        const fet = estaMarcat(wk, it.key);
        const u = mostraUnitat(it.unit, it.qty);
        const qty = it.hasQty ? `${fmtQty(it.qty)}${u ? ' ' + esc(u) : ''}` : esc(it.unit || '');
        const from = it.from.length
          ? `<span class="item-from">${esc(it.from.slice(0,2).join(', '))}${it.from.length > 2 ? ` +${it.from.length-2}` : ''}</span>` : '';
        return `<button class="item${fet?' done':''}" data-item="${esc(it.key)}">
          <span class="box">✓</span>
          <span class="item-name">${esc(it.name)}${from}</span>
          <span class="item-qty">${qty}</span>
          ${it.extraId ? `<span class="item-extra" data-del-extra="${it.extraId}">×</span>` : ''}
        </button>`;
      }).join('')}
    </div>`).join('');

  const pend = items.filter(i => !estaMarcat(wk, i.key)).length;
  $('#shopTotal').textContent = `${pend} de ${items.length} per comprar`;
  updateBadge(pend);
}

function updateBadge(pend) {
  const b = $('#tabBadge');
  b.textContent = pend > 99 ? '99+' : pend;
  b.classList.toggle('on', pend > 0);
}

function renderAll() { renderWeek(); renderRecipes(); renderShopping(); }

/* ══════════════════════════════════════════════
   FULLS
   ══════════════════════════════════════════════ */
function openSheet(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
function closeSheet(el) { el.hidden = true; document.body.style.overflow = ''; }
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) closeSheet(c.closest('.sheet'));
});

function openPick(dia, meal) {
  picking = { dia, meal };
  const d = new Date(dia + 'T12:00:00');
  $('#pickTitle').textContent = `${MEALS.find(m => m[0]===meal)[1]} · ${dayName(d)} ${dayShort(d)}`;
  const cur = enSlot(dia, meal);
  $('#pickServings').value = cur ? cur.raciones : 2;
  $('#pickSearch').value = '';
  renderPick();
  openSheet('#sheetPick');
}

function renderPick() {
  const q = norm($('#pickSearch').value);
  const list = recetas.filter(r => !q || norm(r.nombre).includes(q));
  $('#pickList').innerHTML = list.length
    ? list.map(r => `<button class="pick" data-pick="${r.id}">
        <span class="rec-emoji">${r.emoji || '🍽️'}</span>
        <span><strong>${esc(r.nombre)}</strong><small>${(r.ingredientes||[]).length} ingr. · base ${r.raciones} rac.</small></span>
      </button>`).join('')
    : `<div class="empty"><p>Encara no hi ha receptes. Crea'n una i torna aquí.</p></div>`;
}

const EMOJIS = ['🍽️','🥘','🍲','🍝','🍕','🥗','🍚','🍜','🌮','🥪','🍳','🥩','🐟','🍤','🍗','🥔','🍅','🥦','🫕','🍛','🥟','🧆','🌯','🥧','🍠','🫘','🥕','🧀','🍞','🥐','🍰','🥞','🍢','🫙'];
const blankIng = () => ({ nombre:'', cantidad:'', unidad:'g', categoria:'otros' });

function openRecipe(id) {
  const src = id ? recepta(id) : null;
  editing = src
    ? { id: src.id, nombre: src.nombre, emoji: src.emoji || '🍽️', raciones: src.raciones,
        notas: src.notas || '', ingredientes: JSON.parse(JSON.stringify(src.ingredientes || [])) }
    : { id: null, nombre:'', emoji:'🍽️', raciones:2, notas:'', ingredientes:[] };

  const g = $('#emojiGrid'); if (g) g.remove();
  $('#recipeTitle').textContent = id ? 'Editar recepta' : 'Nova recepta';
  $('#recName').value = editing.nombre;
  $('#recServings').value = editing.raciones;
  $('#recNotes').value = editing.notas;
  $('#recEmoji').textContent = editing.emoji;
  $('#delRecipe').style.display = id ? '' : 'none';
  if (!editing.ingredientes.length) editing.ingredientes.push(blankIng());
  renderIngs();
  openSheet('#sheetRecipe');
  if (!id) setTimeout(() => $('#recName').focus(), 300);
}

function renderIngs() {
  $('#ingList').innerHTML = editing.ingredientes.map((ing, idx) => {
    /* Les receptes antigues poden portar "u" o "ud": es passen a
       la forma actual perquè, en desar, quedin igualades. */
    const u = normUnitat(ing.unidad);
    const unitats = UNITS.includes(u) || !u ? UNITS : [u, ...UNITS];
    return `<div class="ing" data-idx="${idx}">
      <div class="ing-top">
        <input class="i-name" type="text" value="${esc(ing.nombre)}" placeholder="Ingredient" autocomplete="off">
        <button class="ing-del" data-del="${idx}" aria-label="Treure ingredient">×</button>
      </div>
      <div class="ing-bot">
        <input class="i-qty" type="text" inputmode="decimal" value="${esc(String(ing.cantidad ?? ''))}" placeholder="Quant.">
        <select class="i-unit">${unitats.map(x => `<option value="${esc(x)}"${x===u?' selected':''}>${esc(x)}</option>`).join('')}</select>
        <select class="i-cat">${CATS.map(c => `<option value="${c.id}"${c.id===ing.categoria?' selected':''}>${c.emoji} ${c.label}</option>`).join('')}</select>
      </div>
    </div>`;
  }).join('');
}

function collectIngs() {
  editing.ingredientes = $$('#ingList .ing').map(row => ({
    nombre: $('.i-name', row).value.trim(),
    cantidad: $('.i-qty', row).value.replace(',', '.').trim(),
    unidad: $('.i-unit', row).value,
    categoria: $('.i-cat', row).value,
  }));
}

/* ══════════════════════════════════════════════
   ESDEVENIMENTS
   ══════════════════════════════════════════════ */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.remove('is-active'));
  t.classList.add('is-active');
  $$('.view').forEach(v => v.classList.remove('is-active'));
  $('#view-' + t.dataset.view).classList.add('is-active');
  window.scrollTo({ top: 0 });
}));

$('#prevWeek').addEventListener('click', () => { monday = addDays(monday, -7); renderAll(); });
$('#nextWeek').addEventListener('click', () => { monday = addDays(monday, 7); renderAll(); });
$('#todayBtn').addEventListener('click', () => { monday = mondayOf(new Date()); renderAll(); });

$('#days').addEventListener('click', async e => {
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    const { clear: dia, meal } = clear.dataset;
    menu = menu.filter(m => !(m.dia === dia && m.momento === meal));
    renderAll();
    const { error } = await db.from('menu').delete().eq('dia', dia).eq('momento', meal);
    if (error) { fallada(error, 'treure la recepta'); recarregar('menu'); }
    return;
  }
  const slot = e.target.closest('.slot');
  if (slot) openPick(slot.dataset.date, slot.dataset.meal);
});

$('#pickSearch').addEventListener('input', renderPick);
$('#pickList').addEventListener('click', async e => {
  const b = e.target.closest('[data-pick]');
  if (!b || !picking) return;
  const raciones = Math.max(1, Number($('#pickServings').value) || 2);
  const fila = { dia: picking.dia, momento: picking.meal, receta_id: b.dataset.pick, raciones };
  closeSheet($('#sheetPick'));

  menu = menu.filter(m => !(m.dia === fila.dia && m.momento === fila.momento)).concat([fila]);
  renderAll();

  const { error } = await db.from('menu').upsert(fila, { onConflict: 'dia,momento' });
  if (error) fallada(error, 'desar la recepta del dia');
  recarregar('menu');
});
$('#pickNew').addEventListener('click', () => { closeSheet($('#sheetPick')); openRecipe(null); });

$('#newRecipe').addEventListener('click', () => openRecipe(null));
$('#recipeSearch').addEventListener('input', renderRecipes);
$('#recipeList').addEventListener('click', e => {
  const b = e.target.closest('[data-rec]');
  if (b) openRecipe(b.dataset.rec);
});

$('#addIng').addEventListener('click', () => {
  collectIngs();
  editing.ingredientes.push(blankIng());
  renderIngs();
  const rows = $$('#ingList .ing');
  $('.i-name', rows[rows.length-1]).focus();
});

$('#ingList').addEventListener('click', e => {
  const d = e.target.closest('[data-del]');
  if (!d) return;
  collectIngs();
  editing.ingredientes.splice(Number(d.dataset.del), 1);
  if (!editing.ingredientes.length) editing.ingredientes.push(blankIng());
  renderIngs();
});

/* La secció del súper es posa sola en escriure l'ingredient */
$('#ingList').addEventListener('blur', e => {
  if (!e.target.classList.contains('i-name')) return;
  const sel = $('.i-cat', e.target.closest('.ing'));
  if (sel.value === 'otros' && e.target.value.trim()) sel.value = guessCat(e.target.value);
}, true);

$('#recEmoji').addEventListener('click', () => {
  let grid = $('#emojiGrid');
  if (grid) { grid.remove(); return; }
  grid = document.createElement('div');
  grid.id = 'emojiGrid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin-top:9px';
  grid.innerHTML = EMOJIS.map(e => `<button type="button" data-e="${e}" style="font-size:22px;padding:7px 0;background:#fff;border:1px solid var(--line);border-radius:7px">${e}</button>`).join('');
  $('.name-row').after(grid);
  grid.addEventListener('click', ev => {
    const b = ev.target.closest('[data-e]');
    if (!b) return;
    editing.emoji = b.dataset.e;
    $('#recEmoji').textContent = b.dataset.e;
    grid.remove();
  });
});

$('#saveRecipe').addEventListener('click', async () => {
  const nombre = $('#recName').value.trim();
  if (!nombre) { toast('Posa-li un nom a la recepta'); $('#recName').focus(); return; }
  collectIngs();

  const fila = {
    nombre,
    emoji: editing.emoji,
    raciones: Math.max(1, Number($('#recServings').value) || 2),
    notas: $('#recNotes').value.trim(),
    ingredientes: editing.ingredientes.filter(i => i.nombre.trim()),
  };
  if (editing.id) fila.id = editing.id;

  const btn = $('#saveRecipe');
  btn.disabled = true; btn.textContent = 'Desant…';
  const { error } = await db.from('recetas').upsert(fila);
  btn.disabled = false; btn.textContent = 'Desar la recepta';

  if (error) { fallada(error, 'desar la recepta'); return; }
  closeSheet($('#sheetRecipe'));
  const g = $('#emojiGrid'); if (g) g.remove();
  await recarregar('recetas');
  toast('Recepta desada');
});

$('#delRecipe').addEventListener('click', async () => {
  if (!confirm(`Vols esborrar “${editing.nombre}”? També es traurà dels dies on estigui posada.`)) return;
  const { error } = await db.from('recetas').delete().eq('id', editing.id);
  if (error) { fallada(error, 'esborrar la recepta'); return; }
  closeSheet($('#sheetRecipe'));
  await Promise.all([recarregar('recetas'), recarregar('menu')]);
  toast('Recepta esborrada');
});

$('#copyPrev').addEventListener('click', async () => {
  const prev = addDays(monday, -7);
  const files = [];
  for (let i = 0; i < 7; i++) {
    const desde = iso(addDays(prev, i)), cap = iso(addDays(monday, i));
    for (const [meal] of MEALS) {
      const s = enSlot(desde, meal);
      if (s) files.push({ dia: cap, momento: meal, receta_id: s.receta_id, raciones: s.raciones });
    }
  }
  if (!files.length) { toast('La setmana anterior és buida'); return; }
  const { error } = await db.from('menu').upsert(files, { onConflict: 'dia,momento' });
  if (error) { fallada(error, 'copiar la setmana'); return; }
  await recarregar('menu');
  toast(`Copiats ${files.length} àpats`);
});

$('#clearWeek').addEventListener('click', async () => {
  if (!confirm('Vols buidar tots els dinars i sopars d\u2019aquesta setmana?')) return;
  const { error } = await db.from('menu').delete().gte('dia', iso(monday)).lte('dia', iso(addDays(monday,6)));
  if (error) { fallada(error, 'buidar la setmana'); return; }
  await recarregar('menu');
  toast('Setmana buidada');
});

$('#shopList').addEventListener('click', async e => {
  const del = e.target.closest('[data-del-extra]');
  if (del) {
    e.stopPropagation();
    const id = del.dataset.delExtra;
    extras = extras.filter(x => x.id !== id);
    renderShopping();
    const { error } = await db.from('extras').delete().eq('id', id);
    if (error) fallada(error, 'treure l\u2019article');
    return;
  }
  const it = e.target.closest('[data-item]');
  if (!it) return;

  const wk = weekKey(monday), clave = wk + '::' + it.dataset.item;
  const ja = estaMarcat(wk, it.dataset.item);
  marcados = ja ? marcados.filter(m => m.clave !== clave) : marcados.concat([{ clave, semana: wk }]);
  renderShopping();

  const { error } = ja
    ? await db.from('marcados').delete().eq('clave', clave)
    : await db.from('marcados').upsert({ clave, semana: wk });
  if (error) { fallada(error, 'marcar l\u2019article'); recarregar('marcados'); }
});

function parseExtra(raw) {
  const m = raw.match(/^(.*?)[\s]+([\d]+(?:[.,][\d]+)?)\s*([\p{L}]*)$/u);
  if (m && m[1].trim()) return { nombre: m[1].trim(), cantidad: Number(m[2].replace(',','.')), unidad: m[3].trim() };
  return { nombre: raw, cantidad: null, unidad: '' };
}

$('#addExtra').addEventListener('click', async () => {
  const raw = prompt('Escriu-ho amb la quantitat al final.\nPer exemple: Paper de cuina 2 unitats');
  if (!raw || !raw.trim()) return;
  const p = parseExtra(raw.trim());
  if (!p.nombre) return;
  p.unidad = normUnitat(p.unidad);
  const { error } = await db.from('extras').insert({ ...p, categoria: guessCat(p.nombre), semana: weekKey(monday) });
  if (error) { fallada(error, 'afegir l\u2019article'); return; }
  await recarregar('extras');
  toast('Afegit a la llista');
});

$('#uncheckAll').addEventListener('click', async () => {
  const { error } = await db.from('marcados').delete().eq('semana', weekKey(monday));
  if (error) { fallada(error, 'desmarcar'); return; }
  await recarregar('marcados');
  toast('Tot desmarcat');
});

$('#shareList').addEventListener('click', async () => {
  const { wk, groups } = buildShopping();
  if (!groups.length) { toast('No hi ha res per compartir'); return; }
  let txt = `LLISTA DE LA COMPRA · ${weekRange(monday)}\n`;
  for (const g of groups) {
    txt += `\n${g.emoji} ${g.label.toUpperCase()}\n`;
    for (const it of g.items) {
      const fet = estaMarcat(wk, it.key) ? '✓ ' : '· ';
      const u = mostraUnitat(it.unit, it.qty);
      const q = it.hasQty ? ` — ${fmtQty(it.qty)}${u ? ' ' + u : ''}` : (it.unit ? ` — ${it.unit}` : '');
      txt += `${fet}${it.name}${q}\n`;
    }
  }
  try {
    if (navigator.share) await navigator.share({ title: 'Llista de la compra', text: txt });
    else { await navigator.clipboard.writeText(txt); toast('Llista copiada'); }
  } catch (err) { /* cancel·lat */ }
});

$('#btnSettings').addEventListener('click', () => openSheet('#sheetSettings'));
$('#reloadNow').addEventListener('click', async () => {
  try { await carregarTot(); toast('Recarregat'); }
  catch (e) { fallada(e, 'recarregar'); }
});
$('#exportJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ recetas, menu, extras }, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `menu-de-casa-${iso(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ══════════════════════════════════════════════
   REALTIME — la resta de mòbils s'assabenten sols
   ══════════════════════════════════════════════ */
function escoltar() {
  db.channel('menu-de-casa')
    .on('postgres_changes', { event:'*', schema:'public', table:'recetas'  }, () => recarregar('recetas'))
    .on('postgres_changes', { event:'*', schema:'public', table:'menu'     }, () => recarregar('menu'))
    .on('postgres_changes', { event:'*', schema:'public', table:'extras'   }, () => recarregar('extras'))
    .on('postgres_changes', { event:'*', schema:'public', table:'marcados' }, () => recarregar('marcados'))
    .subscribe(status => {
      if (status === 'SUBSCRIBED') setDot('ok', 'Connectat. Els canvis arriben a l\u2019instant.');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setDot('err', 'Sense connexió en directe. Es recarrega en obrir l\u2019app.');
    });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) carregarTot().catch(e => fallada(e, 'recarregar'));
});
window.addEventListener('online', () => carregarTot().catch(() => {}));

/* ══════════════════════════════════════════════
   ARRENCADA
   ══════════════════════════════════════════════ */
(async function arrencar() {
  if (llegirCache()) renderAll();
  try {
    await carregarTot();
    $('#pState').textContent = 'A punt';
    escoltar();
  } catch (e) {
    console.error(e);
    if (recetas.length) {
      $('#pState').textContent = 'Sense connexió · última còpia';
      setDot('err', 'Sense connexió. Estàs veient l\u2019última còpia desada.');
    } else {
      $('#pState').textContent = 'No s\u2019ha pogut connectar';
      setDot('err', 'No s\u2019ha pogut connectar. Comprova que has executat el SQL a Supabase.');
    }
  }
  setTimeout(() => $('#portada').classList.add('fuera'), 350);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
