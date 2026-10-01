'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/recipes';
import type { RecipeSummary } from '@/types/recipe';

interface RandomRecipeClientProps {
  recipes: RecipeSummary[];
}

export default function RandomRecipeClient({ recipes }: RandomRecipeClientProps) {
  const [selected, setSelected] = useState<RecipeSummary | null>(null);

  const pickRandom = useCallback(() => {
    if (recipes.length === 0) return;
    const idx = Math.floor(Math.random() * recipes.length);
    setSelected(recipes[idx]);
  }, [recipes]);

  if (recipes.length === 0) {
    return (
      <p className="text-muted-foreground">No recipes available yet. Add some recipes first!</p>
    );
  }

  return (
    <div>
      <Button onClick={pickRandom} size="lg" className="mb-8">
        <Shuffle size={18} className="mr-2" />
        {selected ? 'Pick Another' : 'Pick a Recipe'}
      </Button>

      {selected && (
        <Link
          href={`/${selected.uid}`}
          className="block bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all max-w-sm mx-auto"
        >
          {selected.feature_image_path && (
            <div className="aspect-[4/3] relative bg-muted">
              <Image
                src={getImageUrl(selected.feature_image_path)!}
                alt={selected.feature_image_alt || selected.title}
                fill
                className="object-cover"
                sizes="384px"
              />
            </div>
          )}
          <div className="p-5">
            <h2 className="text-xl font-semibold text-foreground">{selected.title}</h2>
            {selected.short_description && (
              <p className="text-sm text-muted-foreground mt-2">{selected.short_description}</p>
            )}
            <span className="inline-block mt-4 text-sm text-primary font-medium">
              View recipe &rarr;
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
