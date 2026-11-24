import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RESERVED_TOP_LEVEL, recipeUidFromPath } from '@/lib/recipeRoutes';

/** Top-level page folders, looking inside route groups like (frontend) */
function topLevelRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (!statSync(path).isDirectory() || name.startsWith('[') || name.startsWith('_') || name.startsWith('.')) return [];
    return name.startsWith('(') ? topLevelRoutes(path) : [name];
  });
}

describe('recipe addresses', () => {
  it('knows every top-level page that is not a recipe', () => {
    expect([...new Set(topLevelRoutes(join(process.cwd(), 'src/app')))].sort()).toEqual([...RESERVED_TOP_LEVEL].sort());
  });

  it('treats single-segment paths as recipes, apart from the site’s own pages and files', () => {
    expect(recipeUidFromPath('/roasted-chorizo-tomato-garlic-soup')).toBe('roasted-chorizo-tomato-garlic-soup');
    expect(recipeUidFromPath('/fried-chorizo-potatoes--peas')).toBe('fried-chorizo-potatoes--peas');
    for (const path of ['/', '/recipes', '/admin', '/what-we-having', '/sitemap.xml', '/robots.txt', '/admin/recipes', '/Tomato-Soup', '/_next']) {
      expect(recipeUidFromPath(path)).toBeNull();
    }
  });
});
