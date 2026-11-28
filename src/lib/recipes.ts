const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Construct a public Supabase Storage URL from a storage path. */
export function getImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/recipe-images/${path}`;
}

/** A focal point from the browser: a whole 0–100 percentage, or null for the centre */
export function cleanFocus(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
}

/**
 * Style for a recipe photo cropped to fill its frame (object-cover), keeping
 * its focal point in view. Empty when it's the centre, the browser's default.
 */
export function imageFocus(recipe: { feature_image_focus_x?: number | null; feature_image_focus_y?: number | null }): React.CSSProperties {
  const x = recipe.feature_image_focus_x ?? 50;
  const y = recipe.feature_image_focus_y ?? 50;
  return x === 50 && y === 50 ? {} : { objectPosition: `${x}% ${y}%` };
}

/** Convert newline-separated plain text to HTML paragraphs. */
export function textToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"]+)/g;

function anchor(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener nofollow">${escapeHtml(label)}</a>`;
}

/**
 * Like textToHtml, with links: [Source name](https://…) becomes a link
 * named "Source name", and a bare https:// address is linked as it is.
 * Only http(s) addresses are linked; everything else stays plain text.
 */
export function linkedTextToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      let html = '';
      let last = 0;
      for (const m of line.matchAll(LINK_RE)) {
        html += escapeHtml(line.slice(last, m.index));
        if (m[2]) {
          html += anchor(m[2], m[1].trim());
          last = m.index! + m[0].length;
        } else {
          // Leave trailing punctuation out of a bare address: "see https://x.com/a."
          const url = m[3].replace(/[.,;:!?)]+$/, '');
          html += anchor(url, url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
          last = m.index! + url.length;
        }
      }
      return `<p>${html}${escapeHtml(line.slice(last))}</p>`;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Split a trailing bracketed name off a title:
 * "Greek Lemon Roast Potatoes (Patates Lemonates tou Fournou)"
 *   → ["Greek Lemon Roast Potatoes", "Patates Lemonates tou Fournou"]
 * Returns null when the title doesn't end in a bracket.
 */
export function splitSubtitle(title: string): [string, string] | null {
  const match = title.match(/^(.*\S)\s*\(([^()]+)\)\s*$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

/** A category's name on recipe pages: its page label if it has one, else its ordinary name */
export function categoryLabel(category: { title: string; page_label?: string | null }): string {
  return category.page_label?.trim() || category.title;
}
