/**
 * Ingredients mentioned in a recipe's method steps.
 *
 * Steps stay plain text. Mentions are worked out when shown, from the
 * recipe's own ingredient lines ("chicken breasts" in the list matches
 * "the chicken breasts" and "the chicken" in a step). Where that isn't
 * enough, the recipe carries a few corrections (`method_links.phrases`):
 *   "the spices" → paprika, cumin, oregano
 *   "pepper"     → black pepper            (when red pepper is also in the list)
 *   "the onion mixture" → nothing          (stops "onion" matching)
 * A correction applies wherever its words appear in the method, so editing
 * or reordering steps doesn't break it.
 */

import { parseIngredientName, stripAccents } from '@/lib/ingredientMatch';
import type { IngredientGroup, MethodGroup } from '@/types/recipe';

export interface MethodPhrase {
  phrase: string;
  /** Empty: these words aren't an ingredient */
  ingredient_ids: string[];
}

export interface MethodLinks {
  phrases: MethodPhrase[];
  /** Ingredients the method doesn't need to mention ("salt and pepper") */
  not_in_method: string[];
}

export const EMPTY_METHOD_LINKS: MethodLinks = { phrases: [], not_in_method: [] };

export interface StepPart {
  text: string;
  /** Linked ingredients; absent for plain text */
  ingredientIds?: string[];
}

/** A word the method uses that could be more than one ingredient */
export interface AmbiguousWord {
  word: string;
  ingredientIds: string[];
}

interface Term {
  re: RegExp;
  id: string;
  /** 1: the ingredient's name, 0: one word of it ("chicken" for chicken breast) */
  strength: 0 | 1;
}

interface Match {
  start: number;
  end: number;
  ids: Set<string>;
  /** 2: a correction, 1: full name, 0: one word */
  strength: number;
}

/** Words that describe an ingredient rather than name it, so never match on their own */
const DESCRIBING = new Set([
  'ground', 'dried', 'fresh', 'smoked', 'sweet', 'light', 'dark', 'red', 'green', 'yellow', 'orange', 'white', 'black',
  'plain', 'natural', 'frozen', 'tinned', 'baby', 'spring', 'sea', 'soft', 'unsalted', 'salted', 'greek', 'extra',
  'virgin', 'low', 'sodium', 'half-fat', 'semi-skimmed', 'double', 'single', 'long', 'grain', 'short-grain', 'easy',
  'cook', 'mixed', 'granulated', 'caster', 'self-raising', 'whole', 'raw', 'lean', 'flat', 'flat-leaf', 'leaf',
  'pitted', 'roasted', 'shop', 'bought', 'large', 'small', 'very', 'lazy', 'hot', 'cold', 'boiling', 'italian',
  'chinese', 'luxury', 'closed', 'cup', 'and', 'with', 'from', 'jar', 'the', 'your', 'choice', 'some', 'any',
  'pieces', 'chunks', 'bits',
]);
/**
 * Names ending in one of these are a product made from the words before it:
 * in "chicken stock" or "garlic granules", "chicken" and "garlic" on their own
 * mean the chicken or the garlic, not the stock or granules.
 */
const PRODUCTS = new Set([
  'stock', 'sauce', 'powder', 'granule', 'paste', 'cube', 'salt', 'oil', 'vinegar', 'seasoning', 'flake', 'juice',
  'zest', 'fat', 'extract', 'puree', 'ketchup', 'chutney', 'curd', 'jam', 'syrup', 'spice', 'mix',
]);
/** Words a method uses for something else ("the sauce", "a paste", "the mixture") */
const TOO_GENERAL = new Set(['sauce', 'paste', 'cube', 'mixture', 'mix', 'seasoning', 'spice', 'herb', 'powder']);

/** Lower case without accents, keeping each character's position */
function normalise(text: string): string {
  let out = '';
  for (const ch of text.toLowerCase()) {
    const plain = stripAccents(ch);
    out += plain.length === 1 ? plain : ch;
  }
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "berry" also matches "berries", "leaf" "leaves", "tomato" "tomatoes" */
function wordPattern(word: string): string {
  // "flat-leaf" also matches "flat leaf" and "flatleaf"
  const stem = (w: string) => escape(w).replace(/-/g, '[-\\s]?');
  if (/[^aeiou]y$/.test(word)) return `${stem(word.slice(0, -1))}(?:y|ies)`;
  if (word.endsWith('f')) return `${stem(word.slice(0, -1))}(?:f|ves)`;
  return `${stem(word)}(?:e?s)?`;
}

function phraseRegExp(phrase: string): RegExp | null {
  const words = normalise(phrase).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return new RegExp(`(?<![a-z])${words.map(wordPattern).join('[\\s-]+')}(?![a-z])`, 'g');
}

/** Whether some words appear in a step, allowing for plurals and accents */
export function mentions(text: string, phrase: string): boolean {
  const re = phraseRegExp(phrase);
  return !!re && re.test(normalise(text));
}

/** What to look for in the method, from the recipe's ingredient lines */
export function methodTerms(groups: IngredientGroup[]): Term[] {
  const terms: Term[] = [];
  const seen = new Set<string>();
  const add = (phrase: string, id: string, strength: 0 | 1) => {
    const key = `${id}|${strength}|${phrase}`;
    if (!phrase || seen.has(key)) return;
    seen.add(key);
    const re = phraseRegExp(phrase);
    if (re) terms.push({ re, id, strength });
  };

  for (const group of groups) {
    for (const item of group.items) {
      if (!item.ingredient_id || !item.name?.trim()) continue;
      const parsed = parseIngredientName(item.name);
      const full = [parsed.core, normalise(parsed.name)].filter(Boolean);
      for (const phrase of full) add(phrase, item.ingredient_id, 1);
      const words = parsed.core.split(/\s+/);
      const product = words.length > 1 && PRODUCTS.has(words[words.length - 1]);
      for (const word of product ? words.slice(-1) : words) {
        if (word.length > 2 && !DESCRIBING.has(word) && !TOO_GENERAL.has(word)) add(word, item.ingredient_id, 0);
      }
    }
  }
  return terms;
}

/** Every candidate mention in one piece of text */
function findMatches(text: string, terms: Term[], phrases: MethodPhrase[]): Match[] {
  const lower = normalise(text);
  const matches: Match[] = [];
  const push = (re: RegExp, ids: string[], strength: number) => {
    re.lastIndex = 0;
    for (let m = re.exec(lower); m; m = re.exec(lower)) {
      const existing = matches.find((x) => x.start === m!.index && x.end === m!.index + m![0].length && x.strength === strength);
      if (existing) ids.forEach((id) => existing.ids.add(id));
      else matches.push({ start: m.index, end: m.index + m[0].length, ids: new Set(ids), strength });
    }
  };
  for (const p of phrases) {
    const re = phraseRegExp(p.phrase);
    if (re) push(re, p.ingredient_ids, 2);
  }
  for (const t of terms) push(t.re, [t.id], t.strength);
  return matches;
}

/**
 * Longest, then strongest, mentions that don't overlap: "red pepper" wins
 * over a correction for "pepper", and "the onion mixture" over "onion".
 */
function pick(matches: Match[]): Match[] {
  const sorted = [...matches].sort((a, b) => b.end - b.start - (a.end - a.start) || b.strength - a.strength || a.start - b.start);
  const taken: Match[] = [];
  for (const m of sorted) {
    if (!taken.some((t) => m.start < t.end && t.start < m.end)) taken.push(m);
  }
  return taken.sort((a, b) => a.start - b.start);
}

/**
 * A step split into plain text and linked ingredients. A word that could
 * be more than one ingredient is left plain (and reported by methodCheck).
 */
export function linkStep(text: string, terms: Term[], links: MethodLinks = EMPTY_METHOD_LINKS): StepPart[] {
  const parts: StepPart[] = [];
  let at = 0;
  for (const m of pick(findMatches(text, terms, links.phrases))) {
    const ids = [...m.ids];
    const linked = m.strength === 2 ? ids.length > 0 : ids.length === 1;
    if (!linked) continue;
    if (m.start > at) parts.push({ text: text.slice(at, m.start) });
    parts.push({ text: text.slice(m.start, m.end), ingredientIds: ids });
    at = m.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return mergePlain(parts);
}

function mergePlain(parts: StepPart[]): StepPart[] {
  const out: StepPart[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && !last.ingredientIds && !p.ingredientIds) last.text += p.text;
    else out.push(p);
  }
  return out;
}

export interface MethodCheck {
  /** Ingredient ids the method never mentions (and isn't marked as fine) */
  unmentioned: string[];
  /** Words that could be more than one ingredient */
  ambiguous: AmbiguousWord[];
  /** How many of the recipe's ingredients the method mentions */
  mentioned: number;
  total: number;
}

/** What an editor might want to fix in the method's links */
export function methodCheck(ingredients: IngredientGroup[], method: MethodGroup[], links: MethodLinks = EMPTY_METHOD_LINKS): MethodCheck {
  const terms = methodTerms(ingredients);
  const all = [...new Set(ingredients.flatMap((g) => g.items.map((i) => i.ingredient_id).filter((id): id is string => !!id)))];
  const found = new Set<string>();
  const ambiguous = new Map<string, Set<string>>();

  for (const step of method.flatMap((g) => g.items)) {
    for (const m of pick(findMatches(step, terms, links.phrases))) {
      if (m.strength < 2 && m.ids.size > 1) {
        const word = normalise(step.slice(m.start, m.end));
        const ids = ambiguous.get(word) ?? new Set<string>();
        m.ids.forEach((id) => ids.add(id));
        ambiguous.set(word, ids);
      } else {
        m.ids.forEach((id) => found.add(id));
      }
    }
  }

  return {
    unmentioned: all.filter((id) => !found.has(id) && !links.not_in_method.includes(id)),
    ambiguous: [...ambiguous].map(([word, ids]) => ({ word, ingredientIds: [...ids] })),
    mentioned: all.filter((id) => found.has(id)).length,
    total: all.length,
  };
}

/** Tidy corrections from the browser: trimmed, no duplicates, known shape */
export function cleanMethodLinks(raw: unknown): MethodLinks {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<MethodLinks>;
  const phrases = new Map<string, MethodPhrase>();
  for (const p of Array.isArray(value.phrases) ? value.phrases : []) {
    const phrase = typeof p?.phrase === 'string' ? p.phrase.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
    if (!phrase) continue;
    const ids = Array.isArray(p.ingredient_ids) ? [...new Set(p.ingredient_ids.filter((id): id is string => typeof id === 'string'))] : [];
    phrases.set(phrase.toLowerCase(), { phrase, ingredient_ids: ids });
  }
  const notIn = Array.isArray(value.not_in_method) ? [...new Set(value.not_in_method.filter((id): id is string => typeof id === 'string'))] : [];
  return { phrases: [...phrases.values()], not_in_method: notIn };
}
