const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Construct a public Supabase Storage URL from a storage path. */
export function getImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/recipe-images/${path}`;
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
