'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks';
import { useToast } from '@/lib/toast/context';
import { getImageUrl } from '@/lib/recipes';
import type { RecipeSummary } from '@/types/recipe';

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<RecipeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/recipe?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load recipes');

      const json = await res.json();
      setRecipes(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      addToast('Failed to load recipes', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, addToast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipe/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setRecipes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      addToast('Recipe deleted', 'success');
      setDeleteTarget(null);
    } catch {
      addToast('Failed to delete recipe', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your recipe collection</p>
        </div>
        <Button asChild>
          <Link href="/admin/recipe/new">
            <Plus size={16} className="mr-2" />
            New Recipe
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Recipe list */}
      <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-12 w-12 bg-muted animate-pulse rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-muted animate-pulse rounded-md mb-2" />
                <div className="h-3 w-72 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          ))
        ) : recipes.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            {search ? 'No recipes match your search.' : 'No recipes yet. Create your first recipe!'}
          </div>
        ) : (
          recipes.map((recipe) => {
            const imageUrl = getImageUrl(recipe.feature_image_path);
            return (
              <div
                key={recipe.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={recipe.feature_image_alt || recipe.title}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                      No img
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{recipe.short_description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" asChild title="View on site">
                    <Link href={`/${recipe.uid}`} target="_blank">
                      <ExternalLink size={14} />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/recipe/${recipe.id}/edit`}>
                      <Pencil size={14} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(recipe)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
