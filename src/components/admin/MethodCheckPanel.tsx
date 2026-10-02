'use client';

import { useMemo, useState } from 'react';
import { Check, CircleAlert, Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MethodStepText } from '@/components/recipe/MethodStepText';
import { mentions, methodCheck, methodTerms, type MethodLinks } from '@/lib/methodLinks';
import { cn } from '@/utils/cn';
import type { IngredientGroup, MethodGroup } from '@/types/recipe';

interface MethodCheckPanelProps {
  ingredients: IngredientGroup[];
  method: MethodGroup[];
  links: MethodLinks;
  onChange: (links: MethodLinks) => void;
}

/**
 * Which ingredients the method mentions, so the recipe page can show
 * amounts in the steps. Lists what's missing or unclear and lets the editor
 * add corrections ("the spices" → paprika, cumin).
 */
export function MethodCheckPanel({ ingredients, method, links, onChange }: MethodCheckPanelProps) {
  const [preview, setPreview] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  // The recipe's linked ingredients, named as the list writes them
  const options = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of ingredients.flatMap((g) => g.items)) {
      if (item.ingredient_id && item.name.trim() && !byId.has(item.ingredient_id)) byId.set(item.ingredient_id, item.name.trim());
    }
    return [...byId].map(([id, name]) => ({ id, name }));
  }, [ingredients]);
  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? 'removed ingredient';

  const steps = useMemo(() => method.flatMap((g) => g.items).filter((s) => s.trim()), [method]);
  const check = useMemo(() => methodCheck(ingredients, [{ group_title: '', items: steps }], links), [ingredients, steps, links]);
  const terms = useMemo(() => methodTerms(ingredients), [ingredients]);

  const inMethod = (p: string) => !p.trim() || steps.some((s) => mentions(s, p));

  function addPhrase(text: string, ids: string[]) {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    onChange({
      ...links,
      phrases: [...links.phrases.filter((p) => p.phrase.toLowerCase() !== clean.toLowerCase()), { phrase: clean, ingredient_ids: ids }],
    });
  }

  /** Add the typed words as a correction, then clear the box */
  function link(ids: string[]) {
    addPhrase(phrase, ids);
    setPhrase('');
    setPicked([]);
  }

  if (!options.length || !steps.length) return null;
  const allGood = !check.unmentioned.length && !check.ambiguous.length;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ingredients in the method</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The steps mention{' '}
            <b className="font-semibold tabular-nums text-foreground">
              {check.mentioned} of {check.total}
            </b>{' '}
            ingredients. Visitors can tap them to see how much to use.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((p) => !p)} aria-expanded={preview}>
          {preview ? <EyeOff size={14} /> : <Eye size={14} />} {preview ? 'Hide' : 'Show'} links
        </Button>
      </div>

      {preview && (
        <ol className="mt-3 list-decimal space-y-1.5 rounded-md bg-muted/40 py-3 pl-8 pr-3 text-sm leading-relaxed">
          {steps.map((s, i) => (
            <li key={i}>
              <MethodStepText
                step={s}
                terms={terms}
                links={links}
                amountFor={(ids) => ids.map(nameOf).join(', ')}
                showAll={false}
                timers={false}
              />
            </li>
          ))}
        </ol>
      )}

      {allGood ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-viz-good">
          <Check size={14} /> Every ingredient is accounted for.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {check.ambiguous.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-viz-attention">
                <CircleAlert size={13} /> Could be more than one ingredient
              </h4>
              <ul className="mt-2 space-y-2">
                {check.ambiguous.map((a) => (
                  <li key={a.word} className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="mr-1">&ldquo;{a.word}&rdquo; means</span>
                    {a.ingredientIds.map((id) => (
                      <Chip key={id} onClick={() => addPhrase(a.word, [id])}>
                        {nameOf(id)}
                      </Chip>
                    ))}
                    <Chip muted onClick={() => addPhrase(a.word, [])}>
                      neither
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {check.unmentioned.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-viz-attention">
                <CircleAlert size={13} /> Not mentioned in the method
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the words the method uses for it below (e.g. &ldquo;the spices&rdquo;), or mark it as fine.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {check.unmentioned.map((id) => (
                  <li key={id} className="inline-flex items-center gap-1 rounded-full border border-border py-0.5 pl-3 pr-1 text-sm">
                    {nameOf(id)}
                    <button
                      type="button"
                      onClick={() => setPicked((p) => (p.includes(id) ? p : [...p, id]))}
                      className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Link words
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...links, not_in_method: [...links.not_in_method, id] })}
                      className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Fine
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add a correction */}
      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link words in the method</h4>
        {/* Not a <form>: this sits inside the recipe form */}
        <div className="mt-2 space-y-2">
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the link rather than saving the recipe
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (phrase.trim() && picked.length) link(picked);
            }}
            placeholder='Words as written in the method, e.g. "the spices"'
            className="h-8 text-sm"
            aria-label="Words in the method"
          />
          {!inMethod(phrase) && <p className="text-xs text-viz-attention">These words aren&rsquo;t in the method yet.</p>}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ingredients these words mean">
            {options.map((o) => (
              <Chip
                key={o.id}
                selected={picked.includes(o.id)}
                onClick={() => setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]))}
              >
                {o.name}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={!phrase.trim() || !picked.length} onClick={() => link(picked)}>
              <Plus size={12} /> Link
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!phrase.trim()} onClick={() => link([])}>
              Not an ingredient
            </Button>
          </div>
        </div>
      </div>

      {/* Corrections so far */}
      {(links.phrases.length > 0 || links.not_in_method.length > 0) && (
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Corrections</h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {links.phrases.map((p) => {
              return (
                <li key={p.phrase} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">&ldquo;{p.phrase}&rdquo;</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={cn(!p.ingredient_ids.length && 'italic text-muted-foreground')}>
                    {p.ingredient_ids.length ? p.ingredient_ids.map(nameOf).join(', ') : 'not an ingredient'}
                  </span>
                  {!inMethod(p.phrase) && <span className="text-xs text-viz-attention">not in the method</span>}
                  <RemoveButton label={`Remove the correction for ${p.phrase}`} onClick={() => onChange({ ...links, phrases: links.phrases.filter((x) => x !== p) })} />
                </li>
              );
            })}
            {links.not_in_method.map((id) => (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{nameOf(id)}</span>
                <span className="text-muted-foreground">doesn&rsquo;t need mentioning</span>
                <RemoveButton label={`Undo for ${nameOf(id)}`} onClick={() => onChange({ ...links, not_in_method: links.not_in_method.filter((x) => x !== id) })} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onClick, selected, muted }: { children: React.ReactNode; onClick: () => void; selected?: boolean; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
        selected ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground',
        muted && 'italic text-muted-foreground'
      )}
    >
      {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
      <X size={13} />
    </button>
  );
}
