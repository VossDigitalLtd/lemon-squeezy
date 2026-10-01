'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/toast/context';
import type { Category, CategoryType } from '@/types/recipe';

const TAB_CONFIG: { type: CategoryType; label: string }[] = [
  { type: 'course', label: 'Courses' },
  { type: 'cuisine', label: 'Cuisines' },
  { type: 'dietary', label: 'Dietary' },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Record<CategoryType, Category[]>>({
    course: [],
    cuisine: [],
    dietary: [],
  });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch('/api/category', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setCategories({
        course: json.data?.courses || [],
        cuisine: json.data?.cuisines || [],
        dietary: json.data?.dietaries || [],
      });
    } catch {
      addToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(cat: Category) {
    setCategories((prev) => ({
      ...prev,
      [cat.type]: [...prev[cat.type], cat].sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }

  function handleUpdated(cat: Category) {
    setCategories((prev) => ({
      ...prev,
      [cat.type]: prev[cat.type]
        .map((c) => (c.id === cat.id ? cat : c))
        .sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }

  function handleDeleted(type: CategoryType, id: string) {
    setCategories((prev) => ({
      ...prev,
      [type]: prev[type].filter((c) => c.id !== id),
    }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage recipe categories for courses, cuisines, and dietary options
        </p>
      </div>

      <Tabs defaultValue="course">
        <TabsList className="mb-6">
          {TAB_CONFIG.map(({ type, label }) => (
            <TabsTrigger key={type} value={type}>
              {label}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({categories[type].length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_CONFIG.map(({ type }) => (
          <TabsContent key={type} value={type}>
            <CategoryList
              type={type}
              categories={categories[type]}
              loading={loading}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onDeleted={(id) => handleDeleted(type, id)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Category List per Type ──────────────────────────────────────────────────

interface CategoryListProps {
  type: CategoryType;
  categories: Category[];
  loading: boolean;
  onCreated: (cat: Category) => void;
  onUpdated: (cat: Category) => void;
  onDeleted: (id: string) => void;
}

function CategoryList({ type, categories, loading, onCreated, onUpdated, onDeleted }: CategoryListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useToast();

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: newTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create');
      onCreated(json.data);
      setNewTitle('');
      addToast('Category created', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create category', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/category/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      onUpdated(json.data);
      setEditingId(null);
      addToast('Category updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update category', 'error');
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/category/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted(id);
      addToast('Category deleted', 'success');
    } catch {
      addToast('Failed to delete category', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function startEditing(cat: Category) {
    setEditingId(cat.id);
    setEditTitle(cat.title);
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      {/* Add new */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Input
          placeholder={`Add new ${type}...`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          disabled={creating}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No {type} categories yet
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8 text-sm flex-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleUpdate(cat.id)}>
                    <Check size={14} className="text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-foreground flex-1">{cat.title}</span>
                  <Button variant="ghost" size="sm" onClick={() => startEditing(cat)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
