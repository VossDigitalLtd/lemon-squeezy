'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UNITS, scaleIngredient, formatIngredient, convertUnit, getEquivalentUnit } from '@/lib/units';
import type { Recipe } from '@/types/recipe';

interface RecipeContentClientProps {
  recipe: Recipe;
}

export default function RecipeContentClient({ recipe }: RecipeContentClientProps) {
  const baseServings = recipe.servings || 1;
  const [servings, setServings] = useState(baseServings);
  const [useImperial, setUseImperial] = useState(false);

  function adjustServings(delta: number) {
    setServings((s) => Math.max(1, s + delta));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
      {/* Ingredients — 2 cols */}
      <div className="md:col-span-2">
        <div className="sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Ingredients</h2>
          </div>

          {/* Serving scaler */}
          {recipe.servings != null && (
            <div className="flex items-center gap-3 mb-4 bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-sm text-muted-foreground">Servings</span>
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="outline" size="sm" onClick={() => adjustServings(-1)} disabled={servings <= 1}>
                  <Minus size={12} />
                </Button>
                <span className="text-sm font-medium w-8 text-center">{servings}</span>
                <Button variant="outline" size="sm" onClick={() => adjustServings(1)}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          )}

          {/* Unit toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setUseImperial(false)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                !useImperial ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border'
              }`}
            >
              Metric
            </button>
            <button
              onClick={() => setUseImperial(true)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                useImperial ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border'
              }`}
            >
              Imperial
            </button>
          </div>

          {/* Ingredient list */}
          {recipe.ingredient_groups.map((group, gi) => (
            <div key={gi} className="mb-4">
              {group.group_title && (
                <h3 className="text-sm font-semibold text-foreground mb-2">{group.group_title}</h3>
              )}
              <ul className="space-y-1.5">
                {group.items.map((item, ii) => {
                  let scaled = scaleIngredient(item, baseServings, servings);

                  // Convert unit if toggling systems
                  if (scaled.unit && scaled.quantity != null) {
                    const unitDef = UNITS[scaled.unit];
                    const wantsConvert =
                      (useImperial && unitDef.system === 'metric') ||
                      (!useImperial && unitDef.system === 'imperial');

                    if (wantsConvert) {
                      const equiv = getEquivalentUnit(scaled.unit);
                      if (equiv) {
                        const converted = convertUnit(scaled.quantity, scaled.unit, equiv);
                        scaled = { ...scaled, quantity: converted, unit: equiv };
                      }
                    }
                  }

                  return (
                    <li key={ii} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                      <span>{formatIngredient(scaled)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Method — 3 cols */}
      <div className="md:col-span-3">
        <h2 className="text-xl font-semibold text-foreground mb-4">Method</h2>

        {recipe.method_groups.map((group, gi) => (
          <div key={gi} className="mb-6">
            {group.group_title && (
              <h3 className="text-sm font-semibold text-foreground mb-3">{group.group_title}</h3>
            )}
            <ol className="space-y-4">
              {group.items.map((step, si) => (
                <li key={si} className="flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
                    {si + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
