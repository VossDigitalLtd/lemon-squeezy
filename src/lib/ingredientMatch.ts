// ─── Ingredient library: aisles and name matching ───────────────────────────

export const AISLES = [
  'fruit-veg',
  'meat-fish',
  'dairy-eggs',
  'bakery',
  'cupboard',
  'herbs-spices',
  'frozen',
  'drinks',
  'other',
] as const;
export type Aisle = (typeof AISLES)[number];

export const AISLE_LABELS: Record<Aisle, string> = {
  'fruit-veg': 'Fruit & veg',
  'meat-fish': 'Meat & fish',
  'dairy-eggs': 'Dairy & eggs',
  bakery: 'Bakery',
  cupboard: 'Cupboard',
  'herbs-spices': 'Herbs & spices',
  frozen: 'Frozen',
  drinks: 'Drinks',
  other: 'Other',
};

/** Words that describe preparation or size rather than what to buy */
const PREP_WORDS = [
  'diced', 'cubed', 'chopped', 'finely', 'roughly', 'thinly', 'thickly', 'sliced', 'minced', 'crushed', 'grated',
  'peeled', 'deseeded', 'seeded', 'halved', 'quartered', 'torn', 'shredded', 'crumbled', 'beaten', 'melted',
  'softened', 'cooked', 'uncooked', 'drained', 'rinsed', 'trimmed', 'washed', 'fresh', 'freshly', 'large',
  'medium', 'small', 'ripe', 'boneless', 'skinless', 'bone-in', 'skin-on', 'whole', 'extra', 'heaped', 'level',
  'good', 'quality', 'approx', 'about', 'optional',
];
const PREP_PHRASES = [
  'skin on', 'bone in', 'at room temperature', 'room temperature', 'to serve', 'for serving', 'to taste',
  'for frying', 'for greasing', 'for seasoning', 'for roasting', 'for drizzling', 'for dusting', 'to garnish',
  'for garnish', 'for the top', 'drained and rinsed', 'with no added salt', 'no added salt', 'very ripe',
  'medium-sized', 'separated', 'squeezed', 'lots of',
];
/** Phrases that run to the end of the name and are instructions: "cut into 2cm chunks", "made up with 350ml water" */
const TRAILING_INSTRUCTIONS = /\s+(?:cut into|made up with|made with|mixed with|to make|plus extra|plus more)\b.*$/;
const PART_PHRASES: [RegExp, string][] = [
  [/^(?:a\s+)?squeeze of\s+/, 'juice'],
  [/^juice of\s+/, 'juice'],
  [/^zest of\s+/, 'zest'],
  [/^zest and juice of\s+/, 'zest and juice'],
];
const CONTAINERS = /^(?:a\s+)?(?:can|cans|tin|tins|jar|jars|pack|packs|packet|packets|bag|bags|bunch|handful|pinch|splash|drizzle|dash|knob|sprig|sprigs|strip|strips|ball|balls)\s+(?:of\s+)?/;
/** A measure at the start of the name: "tbsp olive oil", "cups of yoghurt", "x 397g condensed milk", "1tsp mustard" */
const LEADING_MEASURE = /^(?:\d+(?:\.\d+)?\s*)?(?:x\s*)?(?:\d+\s*(?:g|kg|ml|l)\b\s*)?(?:tsp|tsps|teaspoons?|tbsp|tbsps|tablespoons?|cups?|g|kg|ml|l|oz|lb)\b\.?\s+(?:of\s+)?/;
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, half: 0.5, two: 2, three: 3, four: 4, five: 5, six: 6 };

/** Simple English singular for the last word ("tomatoes" → "tomato", "berries" → "berry") */
export function singular(word: string): string {
  if (word.length <= 3 || word.endsWith('ss') || /(?:us|is)$/.test(word)) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(?:oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export interface ParsedName {
  /** Matching key, lower case and singular: "chicken breast" */
  core: string;
  /** The name to show in the recipe, without the prep words: "chicken breasts" */
  name: string;
  /** Preparation or part removed from the name: "diced", "juice", "skin on, bone in" */
  note: string;
  /** A quantity found inside the name ("-8 chicken thighs", "juice of half a lemon") */
  quantity: number | null;
  /** A unit found at the start of the name ("1tsp mustard" → "tsp") */
  unit?: 'tsp' | 'tbsp' | 'cup' | 'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb';
}

const UNIT_WORDS: Record<string, NonNullable<ParsedName['unit']>> = {
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbsps: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup', g: 'g', kg: 'kg', ml: 'ml', l: 'l', oz: 'oz', lb: 'lb',
};

function parseLeadingQuantity(s: string): { quantity: number | null; rest: string } {
  const m = s.match(/^(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?(?:\s*\/\s*(\d+))?\s+/);
  if (m) {
    const n = m[3] ? Number(m[1]) / Number(m[3]) : Number(m[2] ?? m[1]);
    return { quantity: n, rest: s.slice(m[0].length) };
  }
  // "a squeeze of…", "a pinch of…" aren't quantities
  const w = s.match(/^(a|an|one|half|two|three|four|five|six)\s+(?:a\s+)?(?!squeeze|pinch|splash|handful|drizzle|dash|knob|few|little|bit)/);
  if (w) return { quantity: NUMBER_WORDS[w[1]], rest: s.slice(w[0].length) };
  const frac = s.match(/^(?:a\s+)?(\d)\/(\d)\s+/);
  if (frac) return { quantity: Number(frac[1]) / Number(frac[2]), rest: s.slice(frac[0].length) };
  return { quantity: null, rest: s };
}

/**
 * Work out what to buy from a free-text ingredient name.
 *   "chicken breast, diced"            → core "chicken breast", note "diced"
 *   "chicken breasts thinly sliced"     → core "chicken breast", note "thinly sliced"
 *   "-8 bone-in skin-on chicken thighs" → core "chicken thigh", quantity 8
 *   "Juice of half a lemon"             → core "lemon", note "juice", quantity 0.5
 */
export function parseIngredientName(raw: string): ParsedName {
  let s = raw.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();
  const notes: string[] = [];

  // Stray leading dash from the old import ("-3 chopped tomatoes")
  s = s.replace(/^[-–•*]\s*/, '');

  // Bracketed and after-comma details are notes
  for (const m of s.matchAll(/\(([^)]*)\)/g)) notes.push(m[1].trim());
  s = s.replace(/\([^)]*\)/g, ' ');
  const comma = s.indexOf(',');
  if (comma >= 0) {
    notes.push(s.slice(comma + 1).trim());
    s = s.slice(0, comma);
  }

  let quantity: number | null = null;
  ({ quantity, rest: s } = parseLeadingQuantity(s.trim()));

  for (const [re, part] of PART_PHRASES) {
    if (re.test(s)) {
      notes.unshift(part);
      s = s.replace(re, '');
      const q = parseLeadingQuantity(s);
      if (q.quantity != null) quantity = q.quantity;
      s = q.rest;
      break;
    }
  }

  s = s.replace(CONTAINERS, '');
  // A measure at the start: keep its number and unit ("1tsp mustard", "2 tbsp oil")
  let unit: ParsedName['unit'];
  const measure = s.match(/^(\d+(?:\.\d+)?)?\s*(?:heaped\s+|level\s+|rounded\s+)?(tsps?|teaspoons?|tbsps?|tablespoons?|cups?|g|kg|ml|l|oz|lb)\b\.?\s+(?:of\s+)?/);
  if (measure && (measure[1] || !/^(?:g|l)\b/.test(measure[2]))) {
    unit = UNIT_WORDS[measure[2]];
    if (measure[1] && quantity == null) quantity = Number(measure[1]);
    s = s.slice(measure[0].length);
  }
  s = s.replace(LEADING_MEASURE, '').replace(/^x\s*\d+\s*(?:g|kg|ml|l)\s+/, '');
  const instruction = s.match(TRAILING_INSTRUCTIONS);
  if (instruction) {
    notes.push(instruction[0].trim());
    s = s.slice(0, instruction.index);
  }

  for (const phrase of PREP_PHRASES) {
    if (s.includes(phrase)) {
      notes.push(phrase);
      s = s.replace(phrase, ' ');
    }
  }
  const kept: string[] = [];
  const prep: string[] = [];
  for (const word of s.split(/\s+/).filter(Boolean)) {
    if (PREP_WORDS.includes(word)) prep.push(word);
    else kept.push(word);
  }
  // Prep words read as one phrase ("thinly sliced"), ahead of other notes
  if (prep.length) notes.splice(notes[0] === 'juice' || notes[0]?.startsWith('zest') ? 1 : 0, 0, prep.join(' '));
  // "and"/"or"/"of" left dangling at either end
  while (kept.length && ['and', 'or', 'of', 'for', 'with'].includes(kept[kept.length - 1])) kept.pop();
  while (kept.length && ['and', 'or', 'of', 'a'].includes(kept[0])) kept.shift();

  const name = kept.join(' ').replace(/[.;:]+$/, '').trim();
  if (kept.length) kept[kept.length - 1] = singular(kept[kept.length - 1]);
  let core = stripAccents(kept.join(' ').replace(/[.;:]+$/, '').trim());
  // "garlic cloves" is garlic, bought by the bulb
  if (/^garlic clove$/.test(core)) core = 'garlic';

  return {
    core,
    name,
    note: [...new Set(notes.map((n) => n.trim()).filter(Boolean))].join(', '),
    quantity,
    ...(unit ? { unit } : {}),
  };
}

/** "purée" → "puree", so accented and plain spellings match */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Display name for a library entry: "Chicken breast" */
export function displayName(core: string): string {
  return core ? core[0].toUpperCase() + core.slice(1) : core;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const STAPLES = ['salt', 'pepper', 'black pepper', 'salt and pepper', 'water', 'olive oil', 'vegetable oil', 'sunflower oil', 'oil', 'cooking spray', 'fry light', 'frylight', 'ice'];
export function isStaple(core: string): boolean {
  return STAPLES.includes(core) || /^salt and .*pepper$/.test(core);
}

/** A first guess at the aisle, to be checked on the admin page */
export function guessAisle(core: string): Aisle {
  const has = (words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(core));
  if (has(['frozen', 'ice cream'])) return 'frozen';
  if (has(['bell pepper', 'green pepper', 'red pepper', 'yellow pepper', 'orange pepper', 'sweet pepper', 'romano pepper'])) return 'fruit-veg';
  if (has(['powder', 'granule', 'ground', 'dried', 'flake', 'seed', 'spice', 'seasoning'])) return 'herbs-spices';
  if (has(['stock', 'tinned', 'chopped tomato', 'passata', 'tomato puree', 'bean', 'chickpea', 'lentil', 'rice', 'pasta', 'orzo', 'spaghetti', 'noodle', 'flour', 'sugar', 'honey', 'syrup', 'oil', 'vinegar', 'sauce', 'ketchup', 'mayonnaise', 'mustard', 'paste', 'tahini', 'oat', 'biscuit', 'chocolate', 'cocoa', 'baking', 'yeast', 'nut', 'almond', 'cornflour', 'cornstarch', 'condensed milk', 'evaporated milk', 'curd', 'breadcrumb', 'coconut milk', 'raisin', 'sultana', 'jam', 'bulgur', 'couscous', 'gravy', 'stock cube', 'lazy garlic', 'lazy ginger', 'lazy chilli'])) return 'cupboard';
  if (has(['chicken', 'beef', 'lamb', 'pork', 'mince', 'sausage', 'chorizo', 'bacon', 'ham', 'prawn', 'salmon', 'cod', 'fish', 'tuna', 'sea bass', 'steak', 'turkey', 'duck', 'pancetta', 'salami'])) return 'meat-fish';
  if (has(['milk', 'cream', 'butter', 'cheese', 'cheddar', 'feta', 'halloumi', 'mozzarella', 'parmesan', 'yoghurt', 'yogurt', 'egg', 'crème', 'creme', 'mascarpone', 'ricotta'])) return 'dairy-eggs';
  if (has(['bread', 'pitta', 'wrap', 'tortilla', 'bun', 'roll', 'naan', 'baguette', 'pastry'])) return 'bakery';
  if (has(['cumin', 'paprika', 'oregano', 'basil', 'parsley', 'coriander', 'mint', 'thyme', 'rosemary', 'dill', 'cinnamon', 'nutmeg', 'turmeric', 'chilli flake', 'chilli powder', 'curry powder', 'garam masala', 'seasoning', 'spice', 'bay leaf', 'pepper', 'salt', 'herb', 'sage', 'allspice', 'clove', 'cardamom'])) return 'herbs-spices';
  if (has(['onion', 'garlic', 'potato', 'tomato', 'pepper', 'carrot', 'courgette', 'aubergine', 'spinach', 'lettuce', 'cucumber', 'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'mushroom', 'celery', 'leek', 'ginger', 'chilli', 'avocado', 'broccoli', 'cabbage', 'kale', 'squash', 'pumpkin', 'sweetcorn', 'corn', 'spring onion', 'shallot', 'rocket', 'beetroot', 'olive', 'strawberr', 'grape', 'mango', 'pea'])) return 'fruit-veg';
  if (has(['wine', 'beer', 'juice', 'cider', 'brandy', 'rum', 'vodka', 'gin'])) return 'drinks';
  return 'other';
}
