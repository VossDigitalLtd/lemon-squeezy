import { describe, it, expect } from 'vitest';
import { linkedTextToHtml } from '@/lib/recipes';
import { applyChanges } from '@/lib/mcp/recipeTools';
import type { RecipeFormData } from '@/types/recipe';

describe('recipe inspiration links', () => {
  it('links [name](url) and keeps the words around it', () => {
    expect(linkedTextToHtml('Adapted from [Lemon chicken](https://example.com/lemon) by Ottolenghi')).toBe(
      '<p>Adapted from <a href="https://example.com/lemon" target="_blank" rel="noopener nofollow">Lemon chicken</a> by Ottolenghi</p>'
    );
  });

  it('allows several sources, one per line or on the same line', () => {
    const html = linkedTextToHtml('[One](https://a.com) and [Two](https://b.com)\n\n[Three](http://c.com/x)');
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html.match(/<p>/g)).toHaveLength(2);
  });

  it('links a bare address without its trailing full stop, named by its site', () => {
    expect(linkedTextToHtml('See https://www.bbcgoodfood.com/recipes/ribs.')).toBe(
      '<p>See <a href="https://www.bbcgoodfood.com/recipes/ribs" target="_blank" rel="noopener nofollow">bbcgoodfood.com/recipes/ribs</a>.</p>'
    );
  });

  it('never links anything but http(s), and escapes HTML', () => {
    expect(linkedTextToHtml('[Click](javascript:alert(1))')).toBe('<p>[Click](javascript:alert(1))</p>');
    expect(linkedTextToHtml('<b>bold</b> & [x"y](https://a.com/"onmouseover=1)')).toBe(
      '<p>&lt;b&gt;bold&lt;/b&gt; &amp; <a href="https://a.com/&quot;onmouseover=1" target="_blank" rel="noopener nofollow">x&quot;y</a></p>'
    );
    expect(linkedTextToHtml('')).toBe('');
  });
});

describe('inspiration from the connector', () => {
  it('sets and clears it', async () => {
    const base = { title: 'Ribs', inspiration: '' } as RecipeFormData;
    const set = await applyChanges(base, { inspiration: ' Adapted from [BBC Good Food](https://www.bbcgoodfood.com/x) ' });
    expect(set).toMatchObject({ inspiration: 'Adapted from [BBC Good Food](https://www.bbcgoodfood.com/x)' });
    expect(await applyChanges(set as RecipeFormData, { inspiration: '' })).toMatchObject({ inspiration: '' });
  });
});
