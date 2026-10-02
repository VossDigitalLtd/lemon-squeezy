'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Trash2, GripVertical, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/lib/toast/context';
import { UNITS_BY_TYPE, type UnitKey } from '@/lib/units';
import { getImageUrl } from '@/lib/recipes';
import { RestPeriodsEditor } from './RestPeriodsEditor';
import { totalRest } from '@/lib/rest';
import { formatMinutesLong } from '@/lib/time';
import type {
  Recipe,
  RecipeFormData,
  Category,
  CategoryType,
  Ingredient,
  IngredientGroup,
  MethodGroup,
} from '@/types/recipe';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateUid(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const EMPTY_INGREDIENT: Ingredient = { quantity: null, unit: null, name: '' };

function emptyFormData(): RecipeFormData {
  return {
    uid: '',
    title: '',
    subtitle: '',
    short_description: '',
    full_description: '',
    prep_time: null,
    cook_time: null,
    servings: null,
    calories_per_serving: null,
    rest_periods: [],
    ingredient_groups: [{ group_title: '', items: [{ ...EMPTY_INGREDIENT }] }],
    method_groups: [{ group_title: '', items: [''] }],
    serving_suggestions: '',
    tips: '',
    course_category_ids: [],
    cuisine_category_ids: [],
    dietary_category_ids: [],
    accompanying_recipe_ids: [],
  };
}

function recipeToFormData(recipe: Recipe): RecipeFormData {
  return {
    uid: recipe.uid,
    title: recipe.title,
    subtitle: recipe.subtitle,
    short_description: recipe.short_description,
    full_description: recipe.full_description,
    feature_image_path: recipe.feature_image_path || undefined,
    feature_image_alt: recipe.feature_image_alt || undefined,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    calories_per_serving: recipe.calories_per_serving,
    rest_periods: recipe.rest_periods ?? [],
    ingredient_groups: recipe.ingredient_groups.length > 0
      ? recipe.ingredient_groups
      : [{ group_title: '', items: [{ ...EMPTY_INGREDIENT }] }],
    method_groups: recipe.method_groups.length > 0
      ? recipe.method_groups
      : [{ group_title: '', items: [''] }],
    serving_suggestions: recipe.serving_suggestions,
    tips: recipe.tips,
    published_at: recipe.published_at || undefined,
    course_category_ids: recipe.course_categories.map((c) => c.id),
    cuisine_category_ids: recipe.cuisine_categories.map((c) => c.id),
    dietary_category_ids: recipe.dietary_categories.map((c) => c.id),
    accompanying_recipe_ids: recipe.accompanying_recipes.map((r) => r.id),
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface RecipeFormProps {
  recipe?: Recipe;
  categories: {
    courses: Category[];
    cuisines: Category[];
    dietaries: Category[];
  };
}

// ─── Form Component ──────────────────────────────────────────────────────────

export default function RecipeForm({ recipe, categories }: RecipeFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const isEditing = !!recipe;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RecipeFormData>(
    recipe ? recipeToFormData(recipe) : emptyFormData()
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate UID from title (new recipes only)
  useEffect(() => {
    if (!isEditing && form.title) {
      setForm((prev) => ({ ...prev, uid: generateUid(prev.title) }));
    }
  }, [form.title, isEditing]);

  // ── Field updaters ──

  function updateField<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateNumberField(key: keyof RecipeFormData, value: string) {
    const num = value === '' ? null : parseInt(value);
    setForm((prev) => ({ ...prev, [key]: num }));
  }

  // ── Image upload ──

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Upload failed');

      setForm((prev) => ({ ...prev, feature_image_path: json.data.path }));
      addToast('Image uploaded', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Ingredient groups ──

  function updateIngredientGroups(groups: IngredientGroup[]) {
    setForm((prev) => ({ ...prev, ingredient_groups: groups }));
  }

  function addIngredientGroup() {
    updateIngredientGroups([
      ...form.ingredient_groups,
      { group_title: '', items: [{ ...EMPTY_INGREDIENT }] },
    ]);
  }

  function removeIngredientGroup(gi: number) {
    updateIngredientGroups(form.ingredient_groups.filter((_, i) => i !== gi));
  }

  function updateIngredientGroupTitle(gi: number, title: string) {
    const groups = [...form.ingredient_groups];
    groups[gi] = { ...groups[gi], group_title: title };
    updateIngredientGroups(groups);
  }

  function addIngredient(gi: number) {
    const groups = [...form.ingredient_groups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, { ...EMPTY_INGREDIENT }] };
    updateIngredientGroups(groups);
  }

  function removeIngredient(gi: number, ii: number) {
    const groups = [...form.ingredient_groups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, i) => i !== ii) };
    updateIngredientGroups(groups);
  }

  function updateIngredient(gi: number, ii: number, field: keyof Ingredient, value: string | number | null) {
    const groups = [...form.ingredient_groups];
    const items = [...groups[gi].items];
    items[ii] = { ...items[ii], [field]: value };
    groups[gi] = { ...groups[gi], items };
    updateIngredientGroups(groups);
  }

  // ── Method groups ──

  function updateMethodGroups(groups: MethodGroup[]) {
    setForm((prev) => ({ ...prev, method_groups: groups }));
  }

  function addMethodGroup() {
    updateMethodGroups([...form.method_groups, { group_title: '', items: [''] }]);
  }

  function removeMethodGroup(gi: number) {
    updateMethodGroups(form.method_groups.filter((_, i) => i !== gi));
  }

  function updateMethodGroupTitle(gi: number, title: string) {
    const groups = [...form.method_groups];
    groups[gi] = { ...groups[gi], group_title: title };
    updateMethodGroups(groups);
  }

  function addMethodStep(gi: number) {
    const groups = [...form.method_groups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, ''] };
    updateMethodGroups(groups);
  }

  function removeMethodStep(gi: number, si: number) {
    const groups = [...form.method_groups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, i) => i !== si) };
    updateMethodGroups(groups);
  }

  function updateMethodStep(gi: number, si: number, value: string) {
    const groups = [...form.method_groups];
    const items = [...groups[gi].items];
    items[si] = value;
    groups[gi] = { ...groups[gi], items };
    updateMethodGroups(groups);
  }

  // ── Category toggles ──

  function toggleCategory(key: 'course_category_ids' | 'cuisine_category_ids' | 'dietary_category_ids', id: string) {
    setForm((prev) => {
      const ids = prev[key];
      return {
        ...prev,
        [key]: ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
      };
    });
  }

  // ── Save ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    // Clean up empty ingredients/steps before saving
    const cleanForm: RecipeFormData = {
      ...form,
      ingredient_groups: form.ingredient_groups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => item.name.trim()),
        }))
        .filter((g) => g.items.length > 0),
      method_groups: form.method_groups
        .map((g) => ({
          ...g,
          items: g.items.filter((s) => s.trim()),
        }))
        .filter((g) => g.items.length > 0),
    };

    setSaving(true);
    try {
      const url = isEditing ? `/api/recipe/${recipe.id}` : '/api/recipe';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');

      addToast(isEditing ? 'Recipe updated' : 'Recipe created', 'success');
      router.push('/admin/recipes');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save recipe', 'error');
    } finally {
      setSaving(false);
    }
  }

  const imageUrl = getImageUrl(form.feature_image_path || null);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Basic Info ── */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Chicken Tikka Masala"
            />
          </Field>
          <Field label="UID (URL slug)">
            <Input
              value={form.uid}
              onChange={(e) => updateField('uid', e.target.value)}
              placeholder="chicken-tikka-masala"
              disabled={isEditing}
            />
          </Field>
        </div>
        <Field label="Subtitle">
          <Input
            value={form.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            placeholder="Second name shown in italics, e.g. Patates lemonates tou fournou"
          />
        </Field>
        <Field label="Short Description">
          <Textarea
            value={form.short_description}
            onChange={(e) => updateField('short_description', e.target.value)}
            placeholder="A brief summary for recipe cards"
            rows={2}
          />
        </Field>
        <Field label="Full Description">
          <Textarea
            value={form.full_description}
            onChange={(e) => updateField('full_description', e.target.value)}
            placeholder="Detailed description for the recipe page"
            rows={4}
          />
        </Field>
      </Section>

      {/* ── Feature Image ── */}
      <Section title="Feature Image">
        <div className="flex items-start gap-4">
          {imageUrl ? (
            <div className="relative h-32 w-48 rounded-lg overflow-hidden border border-border">
              <Image src={imageUrl} alt={form.feature_image_alt || 'Recipe image'} fill className="object-cover" />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, feature_image_path: undefined, feature_image_alt: undefined }))}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-32 w-48 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Upload size={20} />
              <span className="text-xs">{uploading ? 'Uploading...' : 'Upload image'}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          {imageUrl && (
            <div className="flex-1">
              <Field label="Alt Text">
                <Input
                  value={form.feature_image_alt || ''}
                  onChange={(e) => updateField('feature_image_alt', e.target.value)}
                  placeholder="Describe the image"
                />
              </Field>
            </div>
          )}
        </div>
      </Section>

      {/* ── Times & Servings ── */}
      <Section title="Times & Servings">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Prep Time (mins)">
            <Input
              type="number"
              min={0}
              value={form.prep_time ?? ''}
              onChange={(e) => updateNumberField('prep_time', e.target.value)}
            />
          </Field>
          <Field label="Cook Time (mins)">
            <Input
              type="number"
              min={0}
              value={form.cook_time ?? ''}
              onChange={(e) => updateNumberField('cook_time', e.target.value)}
            />
          </Field>
          <Field label="Servings">
            <Input
              type="number"
              min={1}
              value={form.servings ?? ''}
              onChange={(e) => updateNumberField('servings', e.target.value)}
            />
          </Field>
          <Field label="Calories / Serving">
            <Input
              type="number"
              min={0}
              value={form.calories_per_serving ?? ''}
              onChange={(e) => updateNumberField('calories_per_serving', e.target.value)}
            />
          </Field>
        </div>
        <RestPeriodsEditor value={form.rest_periods} onChange={(periods) => updateField('rest_periods', periods)} />
        {(form.prep_time || form.cook_time || form.rest_periods.length > 0) && (
          <p className="text-sm text-muted-foreground">
            Total time: <strong className="text-foreground">{formatMinutesLong((form.prep_time ?? 0) + (form.cook_time ?? 0) + totalRest(form.rest_periods))}</strong>
            {form.rest_periods.length > 0 && ' (used for the time filters and cards)'}
          </p>
        )}
      </Section>

            {/* ── Ingredients ── */}
      <Section title="Ingredients">
        {form.ingredient_groups.map((group, gi) => (
          <div key={gi} className="bg-muted/30 rounded-lg border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={group.group_title}
                onChange={(e) => updateIngredientGroupTitle(gi, e.target.value)}
                placeholder={form.ingredient_groups.length > 1 ? 'Group name (e.g. "For the sauce")' : 'Group name (optional)'}
                className="h-8 text-sm flex-1"
              />
              {form.ingredient_groups.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredientGroup(gi)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              )}
            </div>

            {group.items.map((item, ii) => (
              <div key={ii} className="flex items-center gap-2 mb-2">
                <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={item.quantity ?? ''}
                  onChange={(e) =>
                    updateIngredient(gi, ii, 'quantity', e.target.value === '' ? null : parseFloat(e.target.value))
                  }
                  placeholder="Qty"
                  className="w-20 h-8 text-sm"
                />
                <Select
                  value={item.unit || '_none'}
                  onValueChange={(v) => updateIngredient(gi, ii, 'unit', v === '_none' ? null : v)}
                >
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No unit</SelectItem>
                    <SelectGroup>
                      <SelectLabel>Volume</SelectLabel>
                      {UNITS_BY_TYPE.volume.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Weight</SelectLabel>
                      {UNITS_BY_TYPE.weight.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Count</SelectLabel>
                      {UNITS_BY_TYPE.count.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Length</SelectLabel>
                      {UNITS_BY_TYPE.length.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  value={item.name}
                  onChange={(e) => updateIngredient(gi, ii, 'name', e.target.value)}
                  placeholder="Ingredient name"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(gi, ii)}
                  disabled={group.items.length <= 1}
                >
                  <X size={14} />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => addIngredient(gi)} className="mt-1">
              <Plus size={12} className="mr-1" />
              Add Ingredient
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addIngredientGroup}>
          <Plus size={12} className="mr-1" />
          Add Ingredient Group
        </Button>
      </Section>

      {/* ── Method ── */}
      <Section title="Method">
        {form.method_groups.map((group, gi) => (
          <div key={gi} className="bg-muted/30 rounded-lg border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={group.group_title}
                onChange={(e) => updateMethodGroupTitle(gi, e.target.value)}
                placeholder={form.method_groups.length > 1 ? 'Group name (e.g. "For the sauce")' : 'Group name (optional)'}
                className="h-8 text-sm flex-1"
              />
              {form.method_groups.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeMethodGroup(gi)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              )}
            </div>

            {group.items.map((step, si) => (
              <div key={si} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-muted-foreground mt-2.5 w-6 text-right flex-shrink-0">
                  {si + 1}.
                </span>
                <Textarea
                  value={step}
                  onChange={(e) => updateMethodStep(gi, si, e.target.value)}
                  placeholder="Describe this step..."
                  rows={2}
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMethodStep(gi, si)}
                  disabled={group.items.length <= 1}
                  className="mt-1"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => addMethodStep(gi)} className="mt-1">
              <Plus size={12} className="mr-1" />
              Add Step
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addMethodGroup}>
          <Plus size={12} className="mr-1" />
          Add Method Group
        </Button>
      </Section>

      {/* ── Serving Suggestions & Tips ── */}
      <Section title="Extras">
        <Field label="Serving Suggestions">
          <Textarea
            value={form.serving_suggestions}
            onChange={(e) => updateField('serving_suggestions', e.target.value)}
            placeholder="Best served with..."
            rows={3}
          />
        </Field>
        <Field label="Tips">
          <Textarea
            value={form.tips}
            onChange={(e) => updateField('tips', e.target.value)}
            placeholder="Handy tips for this recipe..."
            rows={3}
          />
        </Field>
      </Section>

      {/* ── Publishing ── */}
      <Section title="Publishing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Published on">
            <Input
              type="date"
              value={form.published_at ? form.published_at.slice(0, 10) : ''}
              onChange={(e) =>
                updateField('published_at', e.target.value ? new Date(`${e.target.value}T12:00:00Z`).toISOString() : undefined)
              }
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Sets the order of &ldquo;Fresh off the chopping board&rdquo;. Leave blank on a new recipe to use today.
            </p>
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">Recipe of the week</p>
            <p className="text-sm text-muted-foreground">
              Scheduled week by week on the{' '}
              <Link href="/admin/featured" className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">
                Recipe of the week
              </Link>{' '}
              page, so two recipes can&apos;t clash.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Categories ── */}
      <Section title="Categories">
        <CategoryPicker
          label="Course"
          categories={categories.courses}
          selectedIds={form.course_category_ids}
          onToggle={(id) => toggleCategory('course_category_ids', id)}
        />
        <CategoryPicker
          label="Cuisine"
          categories={categories.cuisines}
          selectedIds={form.cuisine_category_ids}
          onToggle={(id) => toggleCategory('cuisine_category_ids', id)}
        />
        <CategoryPicker
          label="Dietary"
          categories={categories.dietaries}
          selectedIds={form.dietary_category_ids}
          onToggle={(id) => toggleCategory('dietary_category_ids', id)}
        />
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Recipe' : 'Create Recipe'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/recipes')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface CategoryPickerProps {
  label: string;
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function CategoryPicker({ label, categories, selectedIds, onToggle }: CategoryPickerProps) {
  if (categories.length === 0) return null;

  return (
    <div>
      <Label className="mb-2">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const selected = selectedIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
              }`}
            >
              {cat.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
