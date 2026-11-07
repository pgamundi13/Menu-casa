/* ══════════════════════════════════════════════
   Menu at Home
   Data lives in Firebase Firestore (free Spark plan): one document per
   recipe, per dish on the menu, per extra item and per ticked item.
   Live listeners keep every phone in the house in sync, and the offline
   cache keeps the app usable without signal.
   ══════════════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, query, where, getDocs, addDoc, setDoc, deleteDoc, onSnapshot, writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── Firebase ───────────────────────────────── */
const CFG = (window.CONFIG && window.CONFIG.FIREBASE) || {};
const CONFIGURED = !!CFG.apiKey && !/PASTE_YOUR|ENGANXA/.test(JSON.stringify(CFG));
const SETTINGS_BROKEN = !window.CONFIG;     // the settings block in index.html didn't run (usually a bad paste)

let db = null;
if (CONFIGURED) {
  const app = initializeApp(CFG);
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn('Offline cache unavailable, using memory only', e);
    db = getFirestore(app);
  }
}

/* ── Supermarket aisles ─────────────────────── */
/* The ids stay as they were so existing recipes keep their aisle. */
const CATS = [
  { id: 'verduras',   label: 'Fruit & veg',      emoji: '🥬' },
  { id: 'carne',      label: 'Meat',             emoji: '🥩' },
  { id: 'pescado',    label: 'Fish & seafood',   emoji: '🐟' },
  { id: 'lacteos',    label: 'Dairy & eggs',     emoji: '🧀' },
  { id: 'panaderia',  label: 'Bread & grains',   emoji: '🍞' },
  { id: 'despensa',   label: 'Pantry',           emoji: '🫙' },
  { id: 'congelados', label: 'Frozen',           emoji: '🧊' },
  { id: 'bebidas',    label: 'Drinks',           emoji: '🥤' },
  { id: 'otros',      label: 'Other',            emoji: '🧺' },
];

/* ── Units ──────────────────────────────────── */
const UNITS = ['g','kg','ml','l','unit','tbsp','tsp','pinch','clove','bunch','can','pack','to taste'];

/* Older recipes were saved in Catalan or Spanish; these map them to the
   current units so "6 u" and "2 units" add up on the shopping list. */
const ALIASES = {
  u:'unit', ud:'unit', uds:'unit', unidad:'unit', unidades:'unit', unitat:'unit', unitats:'unit',
  units:'unit', pc:'unit', pcs:'unit', piece:'unit', pieces:'unit',
  cda:'tbsp', cullerada:'tbsp', cucharada:'tbsp', tablespoon:'tbsp', tablespoons:'tbsp', tbs:'tbsp',
  cdta:'tsp', culleradeta:'tsp', cucharadita:'tsp', teaspoon:'tsp', teaspoons:'tsp',
  pizca:'pinch', pessic:'pinch', pinches:'pinch',
  diente:'clove', dientes:'clove', gra:'clove', grans:'clove', cloves:'clove',
  manojo:'bunch', manat:'bunch', bunches:'bunch',
  lata:'can', llauna:'can', tin:'can', tins:'can', cans:'can',
  paquete:'pack', paquet:'pack', packet:'pack', packets:'pack', packs:'pack',
  'al gusto':'to taste', 'al gust':'to taste',
};
const PLURAL_UNIT = { unit:'units', clove:'cloves', pinch:'pinches', bunch:'bunches', can:'cans', pack:'packs' };

const normUnit = u => ALIASES[norm(u)] || (u || '').trim();
const showUnit = (u, q) => (q === 1 || !PLURAL_UNIT[u]) ? u : PLURAL_UNIT[u];

/* ── Aisle guesser ──────────────────────────── */
/* Words in English, Catalan and Spanish. Text is normalised (lowercase,
   no accents) before comparing. Multi-word entries beat the single word
   they start with: "chicken stock" goes to the pantry, not the meat. */
const GUESS = {
  verduras: [
    // Catalan / Spanish
    'tomaquet','tomate','ceba','cebolla','all','ajo','patata','pastanaga','zanahoria','pebrot','pimiento','enciam','lechuga','espinac','espinaca','carbasso','calabacin','alberginia','berenjena','broquil','brocoli','col-i-flor','coliflor','cogombre','pepino','porro','puerro','xampinyo','champinon','bolet','seta','llimona','limon','taronja','naranja','poma','manzana','platan','platano','maduixa','fresa','alvocat','aguacate','julivert','perejil','api','apio','carbassa','calabaza','mongeta','judia','pesol','guisante','esparrec','esparrago','ruca','rucula','canonge','canonigo','mandarina','pera','raim','uva','melo','melon','sindria','sandia','kiwi','figa','higo','albercoc','albaricoque','pruna','ciruela','col','bleda','acelga','rave','rabanito','remolatxa','remolacha','gingebre','jengibre','escalunya','chalota','carxofa','alcachofa','nectarina','pressec','melocoton','nabiu','arandano','gerd','frambuesa','herbes','verdura','fruita','calcot','escarola','caqui','magrana','granada','pinya','nespre','nispero',
    // English
    'tomato','onion','spring onion','garlic','potato','sweet potato','carrot','pepper','bell pepper','lettuce',"lamb's lettuce",'lambs lettuce','spinach','courgette','zucchini','aubergine','eggplant','broccoli','cauliflower','romanesco','cabbage','kale','cucumber','leek','mushroom','celery','pumpkin','squash','bean','green bean','pea','asparagus','artichoke','fennel','beetroot','beet','radish','turnip','parsnip','corn','sweetcorn','chilli','chili','ginger','shallot','rocket','arugula','watercress','chard','endive','basil','parsley','coriander','cilantro','mint','dill','chives','thyme','rosemary','sage','herb','vegetable','veg','fruit','apple','pear','peach','nectarine','apricot','plum','cherry','strawberry','raspberry','blueberry','blackberry','grape','melon','watermelon','fig','banana','orange','mandarin','clementine','lemon','lime','mango','pineapple','pomegranate','persimmon','quince','avocado','coconut','grapefruit','loquat',
  ],
  carne: [
    'pollastre','pollo','vedella','ternera','porc','cerdo','xai','cordero','gall dindi','pavo','pernil','jamon','xorico','chorizo','salsitxa','salchicha','cansalada','panceta','llom','lomo','costella','costilla','filet','solomillo','mandonguilla','albondiga','botifarra','butifarra','fuet','sobrassada','sobrasada','llonganissa','longaniza','conill','conejo','carn picada','carne picada','hamburguesa','embotit','embutido','beicon',
    'chicken','beef','pork','lamb','turkey','duck','rabbit','veal','ham','bacon','sausage','mince','steak','rib','burger','meatball','salami','prosciutto','pancetta','meat','chop',
  ],
  pescado: [
    'salmo','salmon','lluc','merluza','tonyina','atun','bacalla','bacalao','gamba','llagosti','langostino','musclo','mejillon','calamar','pop','pulpo','sipia','sepia','sardina','seito','boqueron','orada','dorada','llobarro','lubina','rap','rape','cloissa','almeja','anxova','anchoa','truita de riu','trucha','marisc','marisco','peix',
    'hake','tuna','cod','prawn','shrimp','mussel','clam','squid','calamari','octopus','cuttlefish','sardine','anchovy','sea bass','bass','sea bream','bream','monkfish','trout','seafood','fish','mackerel','crab','lobster','scallop','haddock',
  ],
  lacteos: [
    'llet','leche','formatge','queso','iogurt','yogur','nata','mantega','mantequilla','ou','huevo','mato','requeson','mozzarella','parmesa','parmesano','feta','crema','mascarpone','quefir','kefir','burrata','ricotta',
    'milk','cheese','yogurt','yoghurt','cream','butter','egg','parmesan','cheddar','buttermilk','creme fraiche','halloumi','brie',
  ],
  panaderia: [
    'pa ratllat','pan rallado','pa','pan','farina','harina','pasta','arros','arroz','espagueti','macarro','macarron','fideu','fideo','tallarines','tallarina','cuscus','quinoa','civada','avena','baguet','baguette','llevat','levadura','galeta','galleta','cereal','torrada','tostada','motlle','molde','lasanya','lasana','noodle','bulgur','polenta','tortilla de blat','tortilla de trigo',
    'bread','garlic bread','flour','all-purpose flour','all purpose flour','rice','spaghetti','penne','fusilli','macaroni','tagliatelle','lasagne','lasagna','gnocchi','couscous','oat','porridge','yeast','breadcrumb','cracker','biscuit','tortilla','pitta','pita','naan','granola','cornflakes','corn flakes','egg noodles','bun',
  ],
  despensa: [
    'oli','aceite','vinagre','sal','pebre','pimienta','sucre','azucar','mel','miel','tomaquet fregit','tomate frito','conserva','cigro','garbanzo','llentia','lenteja','mongeta seca','alubia','brou','caldo','especia','orenga','oregano','comi','comino','pebre vermell','pimenton','curri','curry','canyella','canela','llorer','laurel','mostassa','mostaza','maionesa','mayonesa','quetxup','ketchup','soja','tahini','cacau','cacao','xocolata','chocolate','fruita seca','frutos secos','ametlla','almendra','nou','nuez','pipa','sesam','sesamo','panses','pasas','blat de moro','maiz','oliva','aceituna','tapera','alcaparra','curcuma','nou moscada','nuez moscada','vainilla','maizena','maicena','bicarbonat','bicarbonato',
    'oil','olive oil','vegetable oil','vinegar','rice vinegar','wine vinegar','red wine vinegar','white wine vinegar','salt','black pepper','white pepper','ground pepper','peppercorn','red pepper flakes','chilli flakes','chili flakes','chilli powder','chili powder','sugar','honey','syrup','jam','stock','broth','stock cube','chicken stock','beef stock','vegetable stock','fish stock','chicken broth','tomato paste','tomato puree','tomato sauce','passata','chopped tomatoes','tinned','canned','chickpea','lentil','kidney beans','black beans','cannellini beans','butter beans','baked beans','haricot beans','soy sauce','fish sauce','sauce','pesto','mustard','mayonnaise','mayo','paprika','cumin','cinnamon','turmeric','nutmeg','curry powder','curry paste','garlic powder','onion powder','ground ginger','dried','bay leaf','bay leaves','spice','cocoa','vanilla','nut','walnut','almond','hazelnut','cashew','peanut','pistachio','seed','sesame','raisin','sultana','caper','olive','cornflour','cornstarch','baking powder','baking soda','bicarbonate','coconut milk','gravy','popcorn',
  ],
  congelados: [
    'congelat','congelada','congelats','congelades','congelado','congelados','gelat','helado','pizza','croqueta','nugget',
    'frozen','ice cream','ice-cream','gelato','fish finger','croquette',
  ],
  bebidas: [
    'aigua','agua','vi','vino','cervesa','cerveza','suc','zumo','refresc','refresco','cafe','te','infusio','infusion','beguda','bebida','cava','sidra','kombucha',
    'water','wine','beer','juice','orange juice','apple juice','soda','coffee','tea','herbal tea','cider','lemonade','tonic','cola','oat milk','almond milk','soy milk','soya milk','plant milk',
  ],
};

/* ── Helpers ────────────────────────────────── */
const norm = s => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esc  = s => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/* Plurals and diminutives: "eggs", "tomatoes", "cherries", Catalan
   "cigrons", "llucet", and spelling changes like taronja → taronges. */
const SUFFIXES = ['', 's', 'es', 'os', 'ns', 'et', 'ets', 'eta', 'etes'];
function forms(w) {
  const f = SUFFIXES.map(s => w + s);
  if (w.endsWith('ja')) f.push(w.slice(0, -2) + 'ges');
  else if (w.endsWith('ga')) f.push(w.slice(0, -2) + 'gues');
  else if (w.endsWith('ca')) f.push(w.slice(0, -2) + 'ques');
  else if (w.endsWith('ça')) f.push(w.slice(0, -2) + 'ces');
  else if (w.endsWith('a'))  f.push(w.slice(0, -1) + 'es');
  if (/[^aeiou]y$/.test(w))  f.push(w.slice(0, -1) + 'ies');
  return f;
}

/* Where a word appears in a name, or -1. Single words match whole words
   only, so "cavall" never matches "cava" and "eggplant" never matches "egg". */
function findWord(n, tokens, w) {
  if (/[^a-z0-9]/.test(w)) return n.indexOf(w);
  const v = forms(w);
  for (const t of tokens) if (v.includes(t)) return n.indexOf(t);
  return -1;
}
const tokensOf = n => n.split(/[^a-z0-9]+/).filter(Boolean);

/* When several words match, the one that comes first wins:
   in "ice cream" or "frozen peas" the freezer always wins. */
function guessCat(name) {
  const n = norm(name);
  if (!n) return 'otros';
  const tokens = tokensOf(n);
  if (GUESS.congelados.some(w => findWord(n, tokens, w) >= 0)) return 'congelados';
  let best = null;
  for (const [cat, words] of Object.entries(GUESS)) {
    for (const w of words) {
      const pos = findWord(n, tokens, w);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && w.length > best.len)) best = { cat, pos, len: w.length };
    }
  }
  return best ? best.cat : 'otros';
}

function fmtQty(n) {
  if (n == null || !isFinite(n) || n === 0) return '';
  return (Math.round(n * 100) / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function ordinal(n) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

/* ── Dates ──────────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function weekKey(monday) {
  const t = addDays(monday, 3);
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return `${t.getFullYear()}-S${String(Math.ceil((((t - jan1) / 86400000) + 1) / 7)).padStart(2,'0')}`;
}
const dayShort  = d => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const dayName   = d => new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d);
const weekRange = m => `${dayShort(m)} – ${dayShort(addDays(m, 6))}`;

/* ══════════════════════════════════════════════
   SEASONAL CALENDAR — Catalonia
   Source: Ametller Origen month-by-month calendar, listed by Canal Salut
   (canalsalut.gencat.cat › Calendaris de temporada). It marks each
   product's best months. m = months in season (1 = January).
   ══════════════════════════════════════════════ */
const SEASON = {
  veg: [
    { en:'Lettuce',          ca:'Enciam',             es:'Lechuga',           e:'🥬', m:[4,5,6,7,9,11] },
    { en:'Courgette',        ca:'Carbassó',           es:'Calabacín',         e:'🥒', m:[6,7,8,9],   alt:['zucchini'] },
    { en:'Green beans',      ca:'Mongeta verda',      es:'Judía verde',       e:'🫛', m:[6,8,9,10],  alt:['green bean','mongeta tendra','mongetes tendres','mongetes verdes','judias verdes'] },
    { en:'Cucumber',         ca:'Cogombre',           es:'Pepino',            e:'🥒', m:[6,7,8,9] },
    { en:'Aubergine',        ca:'Albergínia',         es:'Berenjena',         e:'🍆', m:[7,8,9],     alt:['eggplant'] },
    { en:'Tomato',           ca:'Tomàquet',           es:'Tomate',            e:'🍅', m:[7,8,9] },
    { en:'Pepper',           ca:'Pebrot',             es:'Pimiento',          e:'🫑', m:[7,8,9],     alt:['bell pepper','red pepper','green pepper'] },
    { en:'Chard',            ca:'Bleda',              es:'Acelga',            e:'🥬', m:[1,3,8,10,11,12], alt:['swiss chard'] },
    { en:'Pumpkin',          ca:'Carbassa',           es:'Calabaza',          e:'🎃', m:[9,10],      alt:['squash','butternut'] },
    { en:'Spinach',          ca:'Espinac',            es:'Espinaca',          e:'🥬', m:[3,10,11,12] },
    { en:'Cauliflower',      ca:'Coliflor',           es:'Coliflor',          e:'🥦', m:[2,3,10,11,12], alt:['col-i-flor'] },
    { en:'Broccoli',         ca:'Bròquil',            es:'Brócoli',           e:'🥦', m:[1,2,3,10,11,12], alt:['brocoli','brecol'] },
    { en:'Cabbage',          ca:'Col',                es:'Col',               e:'🥬', m:[1,10,11,12], alt:['repollo'] },
    { en:'Mushrooms',        ca:'Bolet',              es:'Seta',              e:'🍄', m:[10,11],     alt:['mushroom','wild mushroom'] },
    { en:'Romanesco',        ca:'Romanesco',          es:'Romanesco',         e:'🥦', m:[10,11] },
    { en:'Leek',             ca:'Porro',              es:'Puerro',            e:'🌿', m:[2,3,4,10,11,12] },
    { en:'Celery',           ca:'Api',                es:'Apio',              e:'🌿', m:[11,12] },
    { en:'Radish',           ca:'Rave',               es:'Rábano',            e:'🌱', m:[2,3,4,11,12], alt:['rabanito'] },
    { en:'Endive',           ca:'Escarola',           es:'Escarola',          e:'🥬', m:[1,2,11,12], alt:['escarole'] },
    { en:'Calçots',          ca:'Calçot',             es:'Calçot',            e:'🧅', m:[1],         alt:['calcot'] },
    { en:'Brussels sprouts', ca:'Col de Brussel·les', es:'Col de Bruselas',   e:'🥬', m:[1],         alt:['brussels sprout','col de brusseles','coles de bruselas'] },
    { en:'Raf tomato',       ca:'Tomàquet Raf',       es:'Tomate Raf',        e:'🍅', m:[1,2] },
    { en:'Young garlic',     ca:'Alls tendres',       es:'Ajo tierno',        e:'🧄', m:[1,2],       alt:['all tendre','ajos tiernos','green garlic','garlic shoots'] },
    { en:'Artichoke',        ca:'Carxofa',            es:'Alcachofa',         e:'🌿', m:[1,2,3,4] },
    { en:'Peas',             ca:'Pèsol',              es:'Guisante',          e:'🫛', m:[3],         alt:['pea'] },
    { en:'Broad beans',      ca:'Faves',              es:'Haba',              e:'🫛', m:[4],         alt:['broad bean','fava','fava bean','habas'] },
    { en:'Asparagus',        ca:'Espàrrec',           es:'Espárrago',         e:'🌱', m:[4,5] },
    { en:'Spring onion',     ca:'Ceba tendra',        es:'Cebolleta',         e:'🧅', m:[4,5],       alt:['cebes tendres'] },
    { en:'Carrot',           ca:'Pastanaga',          es:'Zanahoria',         e:'🥕', m:[5] },
  ],
  fruit: [
    { en:'Avocado',     ca:'Alvocat',   es:'Aguacate',    e:'🥑', m:[1,2] },
    { en:'Orange',      ca:'Taronja',   es:'Naranja',     e:'🍊', m:[1,2,3,4,11,12] },
    { en:'Mandarin',    ca:'Mandarina', es:'Mandarina',   e:'🍊', m:[1,2,3,11,12], alt:['clementine','clementina'] },
    { en:'Banana',      ca:'Plàtan',    es:'Plátano',     e:'🍌', m:[1,2,3] },
    { en:'Pineapple',   ca:'Pinya',     es:'Piña',        e:'🍍', m:[1,2,11,12] },
    { en:'Strawberry',  ca:'Maduixa',   es:'Fresa',       e:'🍓', m:[3,4,5],  alt:['maduixot','freson'] },
    { en:'Apricot',     ca:'Albercoc',  es:'Albaricoque', e:'🍑', m:[5,6] },
    { en:'Cherry',      ca:'Cirera',    es:'Cereza',      e:'🍒', m:[5,6] },
    { en:'Loquat',      ca:'Nespre',    es:'Níspero',     e:'🟡', m:[5] },
    { en:'Raspberry',   ca:'Gerd',      es:'Frambuesa',   e:'🍓', m:[6] },
    { en:'Blueberry',   ca:'Nabiu',     es:'Arándano',    e:'🫐', m:[6] },
    { en:'Melon',       ca:'Meló',      es:'Melón',       e:'🍈', m:[7,8] },
    { en:'Watermelon',  ca:'Síndria',   es:'Sandía',      e:'🍉', m:[7,8] },
    { en:'Peach',       ca:'Préssec',   es:'Melocotón',   e:'🍑', m:[7,8] },
    { en:'Nectarine',   ca:'Nectarina', es:'Nectarina',   e:'🍑', m:[7,8] },
    { en:'Flat peach',  ca:'Paraguaià', es:'Paraguayo',   e:'🍑', m:[7],      alt:['paraguaia'] },
    { en:'Fig',         ca:'Figa',      es:'Higo',        e:'🟤', m:[8,9,10], alt:['breva','bacora'] },
    { en:'Plum',        ca:'Pruna',     es:'Ciruela',     e:'🟣', m:[8] },
    { en:'Apple',       ca:'Poma',      es:'Manzana',     e:'🍎', m:[9,11,12] },
    { en:'Pear',        ca:'Pera',      es:'Pera',        e:'🍐', m:[9,11,12] },
    { en:'Grapes',      ca:'Raïm',      es:'Uva',         e:'🍇', m:[9,10],   alt:['grape'] },
    { en:'Persimmon',   ca:'Caqui',     es:'Caqui',       e:'🟠', m:[10,11],  alt:['kaki'] },
    { en:'Pomegranate', ca:'Magrana',   es:'Granada',     e:'🔴', m:[10] },
    { en:'Mango',       ca:'Mango',     es:'Mango',       e:'🥭', m:[10,11] },
    { en:'Kiwi',        ca:'Kiwi',      es:'Kiwi',        e:'🥝', m:[11,12] },
  ],
};

const SEASON_NAMES = [...SEASON.veg, ...SEASON.fruit].map(it => ({
  it, names: [it.en, it.ca, it.es, ...(it.alt || [])].map(norm),
}));

/* Which seasonal product an ingredient is, if any. */
function seasonItem(name) {
  const n = norm(name);
  if (!n) return null;
  const tokens = tokensOf(n);
  let best = null;
  for (const { it, names } of SEASON_NAMES) {
    for (const w of names) {
      const pos = findWord(n, tokens, w);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && w.length > best.len)) best = { it, pos, len: w.length };
    }
  }
  return best ? best.it : null;
}

const wrapMonth = m => ((m - 1) % 12 + 12) % 12 + 1;
const inSeason  = (it, m) => it.m.includes(wrapMonth(m));

/* A one-month gap counts as still in season, so a product that skips
   a single month isn't flagged as ending and then new again. */
function seasonTag(it, m) {
  if (it.m.length >= 11) return null;
  const before = inSeason(it, m - 1) || inSeason(it, m - 2);
  const after  = inSeason(it, m + 1) || inSeason(it, m + 2);
  if (!before && !after) return ['only', 'This month only'];
  if (!before) return ['new', 'New'];
  if (!after)  return ['ending', 'Ending'];
  return null;
}

/* ── State (mirror of Firestore) ────────────── */
const MEALS = [['comida', 'Lunch'], ['cena', 'Dinner']];
const NOW_MONTH = new Date().getMonth() + 1;

let recetas = [], menu = [], extras = [], marcados = [];
let monday = mondayOf(new Date());
let seasonMonth = NOW_MONTH;
let editing = null, picking = null;

/* ── Feedback ───────────────────────────────── */
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 3000);
}
function setDot(state, msg) {
  $('#syncDot').dataset.state = state;
  if (msg) $('#syncMsg').textContent = msg;
}

/* Errors say what happened and what to do about it. */
function failed(err, what) {
  console.error(what, err);
  const code = err && err.code;
  let msg = `Couldn’t ${what}.`;
  if (code === 'permission-denied') msg = `Couldn’t ${what}: the database blocked it. Publish the rules from firestore.rules.`;
  else if (code === 'resource-exhausted') msg = `Couldn’t ${what}: today’s free Firebase quota is used up. It resets tomorrow.`;
  else if (code === 'unavailable') msg = `Couldn’t ${what}: no connection. Try again in a moment.`;
  else if (err && err.message) msg = `Couldn’t ${what}: ${err.message}`;
  toast(msg);
}
const send = (promise, what) => promise.catch(err => failed(err, what));

function noDb() {
  if (db) return false;
  toast('Firebase isn’t set up yet. Open Status to see what’s missing.');
  return true;
}

/* ══════════════════════════════════════════════
   LIVE DATA
   ══════════════════════════════════════════════ */
const unsub = {};
const cached = {};
let windowFrom = null;
let coverGone = false;

function hideCover(text) {
  if (text) $('#pState').textContent = text;
  if (coverGone) return;
  coverGone = true;
  setTimeout(() => $('#portada').classList.add('fuera'), 350);
}

function updateStatus() {
  const v = Object.values(cached);
  if (!v.length) return;
  if (!navigator.onLine) setDot('off', 'Offline. Keep using the app: changes are saved on this phone and sync when you’re back online.');
  else if (v.some(Boolean)) setDot('busy', 'Syncing…');
  else setDot('ok', 'Connected. Changes sync instantly.');
}

function listenError(err) {
  console.error('Firestore', err);
  const code = err && err.code;
  const text = (err && err.message) || '';
  let msg = 'Couldn’t connect to the database.';
  if (code === 'permission-denied') msg = 'The database blocked access. In Firebase › Firestore › Rules, publish the rules from firestore.rules.';
  else if (code === 'not-found' || /does not exist/i.test(text)) msg = 'No Firestore database found. Create one in the Firebase console and keep the ID “(default)”.';
  else if (code === 'invalid-argument' || /api.?key/i.test(text)) msg = 'Firebase rejected the settings. Check the firebaseConfig values in index.html.';
  setDot('err', msg);
  hideCover('Can’t connect');
  toast(msg);
}

function listen(name, q, assign) {
  if (unsub[name]) unsub[name]();
  unsub[name] = onSnapshot(q, { includeMetadataChanges: true }, snap => {
    assign(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    cached[name] = snap.metadata.fromCache;
    renderAll();
    updateStatus();
    hideCover('Ready');
  }, listenError);
}

const byName = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'en', { sensitivity: 'base' });

/* The menu, extras and ticks only load a window of weeks (two months back
   from what you're looking at, and everything ahead). Without it, every
   opening of the app would read the whole history and, after a year or
   two, eat into Firebase's free daily reads. */
function ensureWindow() {
  if (!db) return;
  const need = addDays(monday, -7);                 // the week shown and the one before, for "Copy last week"
  if (windowFrom && iso(need) >= windowFrom) return;
  const thisPrev = addDays(mondayOf(new Date()), -7);
  const from = addDays(need < thisPrev ? need : thisPrev, -7 * 8);
  windowFrom = iso(from);
  const wk = weekKey(from);
  listen('menu',     query(collection(db, 'menu'),     where('dia', '>=', windowFrom)), d => { menu = d; });
  listen('extras',   query(collection(db, 'extras'),   where('semana', '>=', wk)),      d => { extras = d; });
  listen('marcados', query(collection(db, 'marcados'), where('semana', '>=', wk)),      d => { marcados = d; });
}

/* ══════════════════════════════════════════════
   WEEK
   ══════════════════════════════════════════════ */
const dishesFor = (dia, meal) => menu.filter(m => m.dia === dia && m.momento === meal);
const recipe = id => recetas.find(r => r.id === id);

function renderWeek() {
  $('#weekRange').textContent = weekRange(monday);
  $('#todayBtn').style.display = iso(monday) === iso(mondayOf(new Date())) ? 'none' : '';

  const today = iso(new Date());
  const box = $('#days');
  box.innerHTML = '';
  let dishes = 0, meals = 0;

  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i), key = iso(d);
    let filled = 0;

    const day = document.createElement('div');
    day.className = 'day' + (key === today ? ' is-today' : '');
    day.innerHTML = `<div class="day-spine"></div>
      <div class="day-body">
        <div class="day-head"><span class="day-name">${dayName(d)}</span><span class="day-date">${dayShort(d)}</span></div>
        <div class="slots"></div>
      </div>`;

    const slots = $('.slots', day);
    for (const [meal, label] of MEALS) {
      const list = dishesFor(key, meal).filter(p => recipe(p.receta_id));
      const wrap = document.createElement('div');
      wrap.className = 'slot-wrap';

      if (list.length) {
        filled++; meals++; dishes += list.length;
        wrap.innerHTML = `<div class="slot full">
            <span class="slot-lbl">${label}</span>
            <div class="plats">${list.map(p => {
              const rec = recipe(p.receta_id);
              return `<div class="plat">
                <button class="plat-txt" data-open="${rec.id}">${rec.emoji || '🍽️'} ${esc(rec.nombre)}
                  <span class="plat-rac">for ${p.raciones}</span></button>
                <button class="plat-del" data-remove="${p.id}" aria-label="Remove ${esc(rec.nombre)}">×</button>
              </div>`;
            }).join('')}</div>
            <button class="plat-add" data-date="${key}" data-meal="${meal}">+ Add dish</button>
          </div>`;
      } else {
        wrap.innerHTML = `<button class="slot empty" data-date="${key}" data-meal="${meal}">
            <span class="slot-lbl">${label}</span><span class="slot-txt">+ Add</span></button>`;
      }
      slots.appendChild(wrap);
    }
    $('.day-spine', day).dataset.fill = filled;
    box.appendChild(day);
  }

  $('#wkCount').textContent = `${meals}/14 meals` + (dishes > meals ? `, ${dishes} dishes` : '');
  $('#wkFill').style.width = Math.round(meals / 14 * 100) + '%';
}

/* ══════════════════════════════════════════════
   RECIPES
   ══════════════════════════════════════════════ */
function renderRecipes() {
  const q = norm($('#recipeSearch').value);
  const box = $('#recipeList');
  const list = recetas.filter(r => !q || norm(r.nombre).includes(q)
    || (r.ingredientes || []).some(i => norm(i.nombre).includes(q)));

  if (!list.length) {
    box.innerHTML = recetas.length
      ? `<div class="empty"><div class="empty-mark">🔍</div><strong>No matches</strong><p>Try another name or an ingredient.</p></div>`
      : `<div class="empty"><div class="empty-mark">📖</div><strong>Your recipe book is empty</strong><p>Create your first recipe and you can add it to any day of the week.</p></div>`;
    return;
  }

  box.innerHTML = list.map(r => {
    const n = (r.ingredientes || []).length;
    return `<button class="rec" data-rec="${r.id}">
      <span class="rec-emoji">${r.emoji || '🍽️'}</span>
      <span class="rec-txt"><span class="rec-name">${esc(r.nombre)}</span>
        <span class="rec-sub">${plural(n, 'ingredient', 'ingredients')}, serves ${r.raciones}</span></span>
      <span class="rec-chev">›</span></button>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   SHOPPING
   ══════════════════════════════════════════════ */
function buildShopping() {
  const wk = weekKey(monday);
  const map = new Map();

  const push = (name, qty, u, cat, from, extraId) => {
    if (!norm(name)) return;
    const unit = normUnit(u);
    const k = norm(name) + '|' + norm(unit);
    let e = map.get(k);
    if (!e) { e = { key: k, name: name.trim(), unit, qty: 0, hasQty: false, cat: cat || 'otros', from: [] }; map.set(k, e); }
    if (qty != null && isFinite(qty) && qty > 0) { e.qty += qty; e.hasQty = true; }
    if (from && !e.from.includes(from)) e.from.push(from);
    if (extraId) e.extraId = extraId;
  };

  for (let i = 0; i < 7; i++) {
    const key = iso(addDays(monday, i));
    for (const [meal] of MEALS) {
      for (const set of dishesFor(key, meal)) {
        const rec = recipe(set.receta_id);
        if (!rec) continue;
        const base = Number(rec.raciones) || 1;
        const factor = (Number(set.raciones) || base) / base;
        for (const ing of rec.ingredientes || []) {
          const q = Number(ing.cantidad);
          push(ing.nombre, isFinite(q) && q > 0 ? q * factor : null, ing.unidad, ing.categoria, rec.nombre);
        }
      }
    }
  }

  for (const x of extras.filter(e => e.semana === wk)) {
    push(x.nombre, x.cantidad == null ? null : Number(x.cantidad), x.unidad, x.categoria, null, x.id);
  }

  const items = [...map.values()];
  const groups = CATS
    .map(c => ({ ...c, items: items.filter(i => i.cat === c.id).sort((a, b) => a.name.localeCompare(b.name, 'en')) }))
    .filter(g => g.items.length);

  return { wk, items, groups };
}

/* Firestore ids can't contain "/". Everything else stays as it was, so
   items ticked in the previous version stay ticked. */
const tickId = (wk, key) => (wk + '::' + key).replace(/\//g, '%2F');
const isTicked = (wk, key) => marcados.some(m => m.id === tickId(wk, key));

function renderShopping() {
  const { wk, items, groups } = buildShopping();
  $('#shopWeek').textContent = weekRange(monday);
  $('#ticketSub').textContent = `Week of ${weekRange(monday)}`;

  const box = $('#shopList');
  if (!items.length) {
    box.innerHTML = `<div class="empty"><div class="empty-mark">🧺</div><strong>Nothing to buy yet</strong><p>Add recipes to the week and the list appears here, sorted by supermarket aisle.</p></div>`;
    $('#shopTotal').textContent = '0 items';
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
        const done = isTicked(wk, it.key);
        const u = showUnit(it.unit, it.qty);
        const qty = it.hasQty ? `${fmtQty(it.qty)}${u ? ' ' + esc(u) : ''}` : esc(it.unit || '');
        const from = it.from.length
          ? `<span class="item-from">${esc(it.from.slice(0, 2).join(', '))}${it.from.length > 2 ? ` +${it.from.length - 2}` : ''}</span>` : '';
        return `<button class="item${done ? ' done' : ''}" data-item="${esc(it.key)}">
          <span class="box">✓</span>
          <span class="item-name">${esc(it.name)}${from}</span>
          <span class="item-qty">${qty}</span>
          ${it.extraId ? `<span class="item-extra" data-del-extra="${it.extraId}" aria-label="Remove">×</span>` : ''}
        </button>`;
      }).join('')}
    </div>`).join('');

  const left = items.filter(i => !isTicked(wk, i.key)).length;
  $('#shopTotal').textContent = `${left} of ${items.length} to buy`;
  updateBadge(left);
}

function updateBadge(n) {
  const b = $('#tabBadge');
  b.textContent = n > 99 ? '99+' : n;
  b.classList.toggle('on', n > 0);
}

/* ══════════════════════════════════════════════
   IN SEASON
   ══════════════════════════════════════════════ */
function produceCard(it) {
  const tag = seasonTag(it, seasonMonth);
  const bars = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1, on = it.m.includes(m);
    return `<i class="${on ? 'on' : ''}${on && m === seasonMonth ? ' cur' : ''}"></i>`;
  }).join('');
  return `<div class="pcard">
    <span class="pc-emoji" aria-hidden="true">${it.e}</span>
    <span class="pc-en">${esc(it.en)}</span>
    <span class="pc-ca" lang="ca">${esc(it.ca)}</span>
    ${tag ? `<span class="pc-tag ${tag[0]}">${tag[1]}</span>` : ''}
    <span class="pc-year" role="img" aria-label="Best in ${it.m.map(x => MONTHS_LONG[x - 1]).join(', ')}">${bars}</span>
  </div>`;
}

/* Your recipes that use something at its best this month. */
function seasonalRecipes(month) {
  return recetas.map(r => {
    const hits = [];
    for (const ing of r.ingredientes || []) {
      const cat = ing.categoria || guessCat(ing.nombre);
      if (cat !== 'verduras') continue;           // tinned, dried or frozen don't count
      const it = seasonItem(ing.nombre);
      if (it && inSeason(it, month) && !hits.includes(it)) hits.push(it);
    }
    return { r, hits };
  }).filter(x => x.hits.length).sort((a, b) => b.hits.length - a.hits.length).slice(0, 6);
}

/* The month rail and title only change when you pick a month, so live
   updates from other phones don't reset where the rail is scrolled. */
function renderSeasonMonth() {
  $('#monthRail').innerHTML = MONTHS.map((m, i) => {
    const n = i + 1;
    return `<button class="mchip${n === seasonMonth ? ' on' : ''}${n === NOW_MONTH ? ' now' : ''}" data-month="${n}"
      role="tab" aria-selected="${n === seasonMonth}" aria-label="${MONTHS_LONG[i]}${n === NOW_MONTH ? ' (this month)' : ''}">${m}</button>`;
  }).join('');

  $('#legendBars').innerHTML = Array.from({ length: 12 }, (_, i) =>
    `<i class="${i + 1 === seasonMonth ? 'cur' : 'off'}"></i>`).join('');

  const veg = SEASON.veg.filter(it => it.m.includes(seasonMonth)).length;
  const fruit = SEASON.fruit.filter(it => it.m.includes(seasonMonth)).length;
  $('#seasonTitle').textContent = MONTHS_LONG[seasonMonth - 1];
  $('#seasonSub').textContent = `${plural(veg, 'vegetable', 'vegetables')} and ${plural(fruit, 'fruit', 'fruits')} at their best in Catalonia.`;
}

function renderSeasonBody() {
  const byEn = (a, b) => a.en.localeCompare(b.en, 'en');
  const veg = SEASON.veg.filter(it => it.m.includes(seasonMonth)).sort(byEn);
  const fruit = SEASON.fruit.filter(it => it.m.includes(seasonMonth)).sort(byEn);

  let html = `
    <div class="sec-head"><h3>Vegetables</h3><span class="sec-n">${veg.length}</span></div>
    <div class="pgrid">${veg.map(produceCard).join('')}</div>
    <div class="sec-head"><h3>Fruit</h3><span class="sec-n">${fruit.length}</span></div>
    <div class="pgrid">${fruit.map(produceCard).join('')}</div>`;

  if (recetas.length) {
    const matches = seasonalRecipes(seasonMonth);
    html += `<div class="sec-head"><h3>Cook with the season</h3></div>`;
    html += matches.length
      ? matches.map(({ r, hits }) => `<button class="srec" data-rec="${r.id}">
          <span class="rec-emoji">${r.emoji || '🍽️'}</span>
          <span class="rec-txt"><span class="srec-name">${esc(r.nombre)}</span>
            <span class="srec-uses">Uses ${hits.map(h => h.en.toLowerCase()).join(', ')}</span></span>
          <span class="rec-chev">›</span></button>`).join('')
      : `<p class="season-note">None of your recipes use these yet. Pick something from the list and add it to a recipe.</p>`;
  }

  $('#seasonBody').innerHTML = html;
}

function centreMonth() {
  const rail = $('#monthRail'), chip = $('.mchip.on', rail);
  if (chip) rail.scrollLeft = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
}

function renderAll() { renderWeek(); renderRecipes(); renderShopping(); renderSeasonBody(); }

/* ══════════════════════════════════════════════
   SHEETS
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
  const already = dishesFor(dia, meal).filter(p => recipe(p.receta_id));
  const label = MEALS.find(m => m[0] === meal)[1];
  $('#pickTitle').textContent = already.length
    ? `${label}, ${ordinal(already.length + 1)} dish`
    : `${label} on ${dayName(d)} ${dayShort(d)}`;
  $('#pickServings').value = already.length ? already[0].raciones : 2;
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
        <span><strong>${esc(r.nombre)}</strong><small>${plural((r.ingredientes || []).length, 'ingredient', 'ingredients')}, serves ${r.raciones}</small></span>
      </button>`).join('')
    : `<div class="empty"><p>No recipes yet. Create one and come back here.</p></div>`;
}

const EMOJIS = [
  ['Dishes', '🍽️ 🥘 🍲 🫕 🥣 🥗 🍝 🍜 🍛 🍚 🍱 🥡 🍢 🥟 🥠 🍳 🥚 🧆 🥙 🌮 🌯 🫔 🥪 🍔 🌭 🍕 🍟 🍿 🥫 🍥 🍘 🍙 🍣 🍤'],
  ['Meat & fish', '🥩 🍖 🍗 🥓 🐟 🐠 🐡 🦐 🦞 🦀 🦑 🐙 🦪 🐔 🦆 🦃 🐄 🐖 🐑 🐰'],
  ['Vegetables', '🥬 🥦 🥒 🌽 🥕 🧅 🧄 🥔 🍅 🍆 🫑 🌶️ 🍄 🫒 🥑 🎃 🫚 🫛 🌱 🌿 🍠'],
  ['Fruit', '🍇 🍈 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🫐 🥝 🥥 🌰 🥜'],
  ['Bread & bakery', '🍞 🥖 🥐 🫓 🥯 🥨 🧇 🥞 🌾'],
  ['Sweets', '🍰 🎂 🧁 🥧 🍮 🍯 🍫 🍬 🍭 🍩 🍪 🍨 🍦 🍧 🥮 🍡 🧊'],
  ['Dairy', '🧀 🥛 🧈 🍼'],
  ['Drinks', '☕ 🫖 🍵 🥤 🧋 🧃 🧉 🍺 🍻 🍷 🥂 🍸 🍹 🥃 🍶 🍾 🫗 💧'],
  ['Other', '🧂 🫙 🏺 🥢 🍴 🥄 🔪 🧑‍🍳 🔥 ⏲️ 🎉 ❤️'],
].map(([g, s]) => [g, s.split(' ').filter(Boolean)]);

const blankIng = () => ({ nombre: '', cantidad: '', unidad: 'g', categoria: 'otros' });

function openRecipe(id) {
  const src = id ? recipe(id) : null;
  editing = src
    ? { id: src.id, nombre: src.nombre || '', emoji: src.emoji || '🍽️', raciones: src.raciones || 2,
        notas: src.notas || '', ingredientes: JSON.parse(JSON.stringify(src.ingredientes || [])) }
    : { id: null, nombre: '', emoji: '🍽️', raciones: 2, notas: '', ingredientes: [] };

  const g = $('#emojiGrid'); if (g) g.remove();
  $('#recipeTitle').textContent = id ? 'Edit recipe' : 'New recipe';
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
    const u = normUnit(ing.unidad);
    const units = UNITS.includes(u) || !u ? UNITS : [u, ...UNITS];
    return `<div class="ing" data-idx="${idx}">
      <div class="ing-top">
        <input class="i-name" type="text" value="${esc(ing.nombre)}" placeholder="Ingredient" autocomplete="off">
        <button class="ing-del" data-del="${idx}" aria-label="Remove ingredient">×</button>
      </div>
      <div class="ing-bot">
        <input class="i-qty" type="text" inputmode="decimal" value="${esc(String(ing.cantidad ?? ''))}" placeholder="Qty">
        <select class="i-unit" aria-label="Unit">${units.map(x => `<option value="${esc(x)}"${x === u ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select class="i-cat" aria-label="Aisle">${CATS.map(c => `<option value="${c.id}"${c.id === ing.categoria ? ' selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}</select>
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
   EVENTS — navigation and week
   ══════════════════════════════════════════════ */
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.remove('is-active'));
  t.classList.add('is-active');
  $$('.view').forEach(v => v.classList.remove('is-active'));
  $('#view-' + t.dataset.view).classList.add('is-active');
  window.scrollTo({ top: 0 });
  if (t.dataset.view === 'season') centreMonth();
}));

function goToWeek(m) { monday = m; ensureWindow(); renderAll(); }
$('#prevWeek').addEventListener('click', () => goToWeek(addDays(monday, -7)));
$('#nextWeek').addEventListener('click', () => goToWeek(addDays(monday, 7)));
$('#todayBtn').addEventListener('click', () => goToWeek(mondayOf(new Date())));

$('#days').addEventListener('click', e => {
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    if (noDb()) return;
    send(deleteDoc(doc(db, 'menu', remove.dataset.remove)), 'remove the dish');
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) { openRecipe(open.dataset.open); return; }
  const add = e.target.closest('[data-date]');
  if (add) openPick(add.dataset.date, add.dataset.meal);
});

$('#pickSearch').addEventListener('input', renderPick);
$('#pickList').addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (!b || !picking || noDb()) return;
  const raciones = Math.max(1, Number($('#pickServings').value) || 2);
  closeSheet($('#sheetPick'));
  send(addDoc(collection(db, 'menu'), { dia: picking.dia, momento: picking.meal, receta_id: b.dataset.pick, raciones }), 'add the dish');
});
$('#pickNew').addEventListener('click', () => { closeSheet($('#sheetPick')); openRecipe(null); });

const weekDishes = () => menu.filter(m => m.dia >= iso(monday) && m.dia <= iso(addDays(monday, 6)));

$('#copyPrev').addEventListener('click', () => {
  if (noDb()) return;
  const prev = addDays(monday, -7);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const from = iso(addDays(prev, i)), to = iso(addDays(monday, i));
    for (const [meal] of MEALS) {
      for (const s of dishesFor(from, meal)) rows.push({ dia: to, momento: meal, receta_id: s.receta_id, raciones: s.raciones });
    }
  }
  if (!rows.length) { toast('Last week is empty'); return; }
  const current = weekDishes();
  if (current.length && !confirm('This week already has dishes. Replace them with last week’s?')) return;

  const batch = writeBatch(db);
  current.forEach(m => batch.delete(doc(db, 'menu', m.id)));
  rows.forEach(r => batch.set(doc(collection(db, 'menu')), r));
  send(batch.commit(), 'copy last week');
  toast(`Copied ${plural(rows.length, 'dish', 'dishes')}`);
});

$('#clearWeek').addEventListener('click', () => {
  if (noDb()) return;
  const current = weekDishes();
  if (!current.length) { toast('This week is already empty'); return; }
  if (!confirm('Clear every lunch and dinner this week?')) return;
  const batch = writeBatch(db);
  current.forEach(m => batch.delete(doc(db, 'menu', m.id)));
  send(batch.commit(), 'clear the week');
  toast('Week cleared');
});

/* ══════════════════════════════════════════════
   EVENTS — recipes
   ══════════════════════════════════════════════ */
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
  $('.i-name', rows[rows.length - 1]).focus();
});

$('#ingList').addEventListener('click', e => {
  const d = e.target.closest('[data-del]');
  if (!d) return;
  collectIngs();
  editing.ingredientes.splice(Number(d.dataset.del), 1);
  if (!editing.ingredientes.length) editing.ingredientes.push(blankIng());
  renderIngs();
});

/* The aisle fills itself in when you finish typing an ingredient. */
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
  grid.className = 'emoji-panel';
  grid.innerHTML = EMOJIS.map(([g, list]) => `
    <p class="emoji-grup">${g}</p>
    <div class="emoji-fila">${list.map(x => `<button type="button" class="emoji-op" data-e="${x}">${x}</button>`).join('')}</div>
  `).join('');
  $('.name-row').after(grid);
  grid.addEventListener('click', ev => {
    const b = ev.target.closest('[data-e]');
    if (!b) return;
    editing.emoji = b.dataset.e;
    $('#recEmoji').textContent = b.dataset.e;
    grid.remove();
  });
  grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

$('#saveRecipe').addEventListener('click', () => {
  if (noDb()) return;
  const nombre = $('#recName').value.trim();
  if (!nombre) { toast('Give the recipe a name'); $('#recName').focus(); return; }
  collectIngs();

  const data = {
    nombre,
    emoji: editing.emoji,
    raciones: Math.max(1, Number($('#recServings').value) || 2),
    notas: $('#recNotes').value.trim(),
    ingredientes: editing.ingredientes
      .filter(i => i.nombre)
      .map(i => ({ ...i, unidad: normUnit(i.unidad) })),
  };

  /* Firestore shows the change on screen straight away and syncs it
     in the background, even without signal. */
  send(editing.id ? setDoc(doc(db, 'recetas', editing.id), data) : addDoc(collection(db, 'recetas'), data), 'save the recipe');
  closeSheet($('#sheetRecipe'));
  const g = $('#emojiGrid'); if (g) g.remove();
  toast('Recipe saved');
});

$('#delRecipe').addEventListener('click', () => {
  if (noDb()) return;
  if (!confirm(`Delete “${editing.nombre}”? It will also come off any days it’s on.`)) return;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'recetas', editing.id));
  menu.filter(m => m.receta_id === editing.id).forEach(m => batch.delete(doc(db, 'menu', m.id)));
  send(batch.commit(), 'delete the recipe');
  closeSheet($('#sheetRecipe'));
  toast('Recipe deleted');
});

/* ══════════════════════════════════════════════
   EVENTS — shopping
   ══════════════════════════════════════════════ */
$('#shopList').addEventListener('click', e => {
  const del = e.target.closest('[data-del-extra]');
  if (del) {
    e.stopPropagation();
    if (noDb()) return;
    send(deleteDoc(doc(db, 'extras', del.dataset.delExtra)), 'remove the item');
    return;
  }
  const it = e.target.closest('[data-item]');
  if (!it || noDb()) return;
  const wk = weekKey(monday);
  const id = tickId(wk, it.dataset.item);
  send(isTicked(wk, it.dataset.item)
    ? deleteDoc(doc(db, 'marcados', id))
    : setDoc(doc(db, 'marcados', id), { semana: wk }), 'tick the item');
});

function parseExtra(raw) {
  const m = raw.match(/^(.*?)[\s]+([\d]+(?:[.,][\d]+)?)\s*([\p{L}]*)$/u);
  if (m && m[1].trim()) return { nombre: m[1].trim(), cantidad: Number(m[2].replace(',', '.')), unidad: m[3].trim() };
  return { nombre: raw, cantidad: null, unidad: '' };
}

$('#addExtra').addEventListener('click', () => {
  if (noDb()) return;
  const raw = prompt('Type it with the quantity at the end.\nFor example: Kitchen roll 2 units');
  if (!raw || !raw.trim()) return;
  const p = parseExtra(raw.trim());
  if (!p.nombre) return;
  p.unidad = normUnit(p.unidad);
  send(addDoc(collection(db, 'extras'), { ...p, categoria: guessCat(p.nombre), semana: weekKey(monday) }), 'add the item');
  toast('Added to the list');
});

$('#uncheckAll').addEventListener('click', () => {
  if (noDb()) return;
  const wk = weekKey(monday);
  const ticks = marcados.filter(m => m.semana === wk);
  if (!ticks.length) { toast('Nothing is ticked'); return; }
  const batch = writeBatch(db);
  ticks.forEach(m => batch.delete(doc(db, 'marcados', m.id)));
  send(batch.commit(), 'untick the list');
  toast('All unticked');
});

$('#shareList').addEventListener('click', async () => {
  const { wk, groups } = buildShopping();
  if (!groups.length) { toast('Nothing to share yet'); return; }
  let txt = `SHOPPING LIST · ${weekRange(monday)}\n`;
  for (const g of groups) {
    txt += `\n${g.emoji} ${g.label.toUpperCase()}\n`;
    for (const it of g.items) {
      const mark = isTicked(wk, it.key) ? '✓ ' : '· ';
      const u = showUnit(it.unit, it.qty);
      const q = it.hasQty ? ` — ${fmtQty(it.qty)}${u ? ' ' + u : ''}` : (it.unit ? ` — ${it.unit}` : '');
      txt += `${mark}${it.name}${q}\n`;
    }
  }
  try {
    if (navigator.share) await navigator.share({ title: 'Shopping list', text: txt });
    else { await navigator.clipboard.writeText(txt); toast('List copied'); }
  } catch (err) { /* share sheet closed */ }
});

/* ══════════════════════════════════════════════
   EVENTS — season
   ══════════════════════════════════════════════ */
$('#monthRail').addEventListener('click', e => {
  const b = e.target.closest('[data-month]');
  if (!b) return;
  seasonMonth = Number(b.dataset.month);
  renderSeasonMonth();
  renderSeasonBody();
  centreMonth();
});
$('#seasonBody').addEventListener('click', e => {
  const b = e.target.closest('[data-rec]');
  if (b) openRecipe(b.dataset.rec);
});

/* ══════════════════════════════════════════════
   STATUS, BACKUP AND MOVING FROM SUPABASE
   ══════════════════════════════════════════════ */
$('#btnSettings').addEventListener('click', () => openSheet('#sheetSettings'));
$('#reloadNow').addEventListener('click', () => location.reload());

$('#exportJson').addEventListener('click', async () => {
  let data = { recetas, menu, extras };
  if (db) {
    try {
      const [r, m, x] = await Promise.all(['recetas', 'menu', 'extras'].map(c => getDocs(collection(db, c))));
      const rows = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
      data = { recetas: rows(r), menu: rows(m), extras: rows(x) };
    } catch (e) { /* offline: the recent data on this phone is downloaded instead */ }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `menu-at-home-${iso(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* Writes a backup (or the old Supabase data) into Firestore, keeping the
   original ids so each dish still points at the right recipe. Running it
   twice overwrites rather than duplicates. Batches hold up to 500 writes,
   so big backups go in several. */
async function restore(data) {
  const ops = [];
  for (const r of data.recetas || []) {
    if (!r.id) continue;
    ops.push(b => b.set(doc(db, 'recetas', String(r.id)), {
      nombre: r.nombre || '', emoji: r.emoji || '🍽️', raciones: Number(r.raciones) || 2,
      notas: r.notas || '', ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : [],
    }));
  }
  for (const m of data.menu || []) {
    if (!m.id || !m.receta_id || !m.dia) continue;
    ops.push(b => b.set(doc(db, 'menu', String(m.id)), {
      dia: String(m.dia).slice(0, 10), momento: m.momento, receta_id: String(m.receta_id), raciones: Number(m.raciones) || 2,
    }));
  }
  for (const x of data.extras || []) {
    if (!x.id) continue;
    ops.push(b => b.set(doc(db, 'extras', String(x.id)), {
      nombre: x.nombre || '', cantidad: x.cantidad == null ? null : Number(x.cantidad),
      unidad: x.unidad || '', categoria: x.categoria || 'otros', semana: x.semana || '',
    }));
  }
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
  return { recipes: (data.recetas || []).length, dishes: (data.menu || []).length };
}

$('#importJson').addEventListener('click', () => { if (!noDb()) $('#fileInput').click(); });
$('#fileInput').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const help = $('#importHelp');
  try {
    const data = JSON.parse(await f.text());
    if (!(data.recetas || data.menu || data.extras)) throw new Error('that file isn’t a Menu backup');
    help.textContent = 'Restoring…';
    const n = await restore(data);
    help.textContent = '';
    closeSheet($('#sheetSettings'));
    toast(`Restored ${plural(n.recipes, 'recipe', 'recipes')} and ${plural(n.dishes, 'dish', 'dishes')}`);
  } catch (err) {
    help.textContent = '';
    failed(err, 'restore the backup');
  }
});

/* The old project and its public key, only used by this import. */
const OLD_SUPABASE = {
  url: 'https://avmmenipjbqzzxwobudh.supabase.co',
  key: 'sb_publishable_rH-6omhmmlosckGjc6yZ9g_ZKueVlnM',
};

$('#importSupabase').addEventListener('click', async () => {
  if (noDb()) return;
  if (!confirm('Copy recipes and the meal plan from the old Supabase database? Anything already imported is overwritten, not duplicated.')) return;
  const help = $('#importHelp');
  help.textContent = 'Reading the old database…';
  try {
    const get = async table => {
      const r = await fetch(`${OLD_SUPABASE.url}/rest/v1/${table}?select=*`, { headers: { apikey: OLD_SUPABASE.key } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    };
    const [rec, men, ext] = await Promise.all([get('recetas'), get('menu'), get('extras')]);
    help.textContent = `Copying ${plural(rec.length, 'recipe', 'recipes')}…`;
    const n = await restore({ recetas: rec, menu: men, extras: ext });
    help.textContent = '';
    closeSheet($('#sheetSettings'));
    toast(`Imported ${plural(n.recipes, 'recipe', 'recipes')} and ${plural(n.dishes, 'dish', 'dishes')}`);
  } catch (err) {
    console.error(err);
    help.textContent = 'Couldn’t reach the old database. If the Supabase project is paused, restore it first (pause another project if you’re at the two-project limit), then try again.';
  }
});

/* ══════════════════════════════════════════════
   START
   ══════════════════════════════════════════════ */
renderSeasonMonth();
renderAll();

if (!CONFIGURED) {
  setDot('err', SETTINGS_BROKEN
    ? 'The settings block at the top of index.html has a mistake. Paste only the part from “const firebaseConfig = {” to “};”, replacing the old one.'
    : 'Firebase isn’t set up yet: paste your firebaseConfig into index.html (see the README). The In season tab works without it.');
  hideCover('Setup needed');
} else {
  listen('recetas', collection(db, 'recetas'), d => { recetas = d.sort(byName); });
  ensureWindow();
  setTimeout(() => hideCover(), 4000);      // first launch with no signal: don't wait forever
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
