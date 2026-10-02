'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ShoppingBasket } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth';
import { useToast } from '@/hooks/useToast';
import { SignInPromptDialog } from '@/components/auth/SignInPromptDialog';
import { cn } from '@/utils/cn';

interface AddToListButtonProps {
  /** Recipes to add, each with the servings to shop for (left out: the recipe's own) */
  items: { recipe_id: string; servings?: number }[];
  /** e.g. "4 servings" or "this menu", used in the button and confirmation */
  label: string;
  className?: string;
}

/** Adds recipes to the shopping list; signed-out visitors get a sign-in prompt */
export function AddToListButton({ items, label, className }: AddToListButtonProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle');
  const [promptOpen, setPromptOpen] = useState(false);

  // Changing servings (or the menu) means there's something new to add
  const itemsKey = JSON.stringify(items);
  useEffect(() => setState('idle'), [itemsKey]);

  async function add() {
    if (!user) {
      setPromptOpen(true);
      return;
    }
    setState('adding');
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add');
      setState('added');
      addToast(`Added ${label} to your shopping list`, 'success');
    } catch (e) {
      setState('idle');
      addToast(e instanceof Error ? e.message : 'Failed to add to your shopping list', 'error');
    }
  }

  return (
    <>
      {state === 'added' ? (
        <Link
          href="/account/shopping-list"
          className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-full border border-viz-good/50 bg-card px-5 text-[0.9375rem] font-medium text-viz-good transition hover:border-viz-good', className)}
        >
          <Check size={17} /> On your list: view it
        </Link>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={state === 'adding' || items.length === 0}
          className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[0.9375rem] font-medium transition hover:border-foreground disabled:opacity-50', className)}
        >
          <ShoppingBasket size={17} />
          {state === 'adding' ? 'Adding…' : `Add ${label} to shopping list`}
        </button>
      )}
      <SignInPromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        icon={<ShoppingBasket size={26} />}
        title="Build a shopping list"
        text="Add recipes and we'll combine the ingredients into one list you can tick off in the shop, on any device. It's free."
      />
    </>
  );
}
