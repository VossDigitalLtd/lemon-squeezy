import { z } from 'zod';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { McpServer } from '@modelcontextprotocol/server';
import { getPublicOrigin } from 'mcp-handler';
import { createAdminClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService } from '@/lib/supabase/services';
import { recipeToFormData } from '@/lib/recipeFormData';
import { UNIT_KEYS, type UnitKey } from '@/lib/units';
import { mcpUser } from './auth';
import type { Category, CategoryType, Ingredient, IngredientGroup, MethodGroup, Recipe, RecipeFormData } from '@/types/recipe';

/**
 * The tools ChatGPT can use on the recipes: search, read, edit and create.
 * Deleting stays in the admin. Edits save through RecipeService like the
 * admin does (ingredient library links, method links, undo history).
 */

export const MCP_INSTRUCTIONS = `Lemon Squeezy is a UK recipe website. These tools read and change its live recipes; changes show on the site straight away, and every edit is kept in the recipe's History in the admin so it can be undone.

- Always call get_recipe before update_recipe, and send whole lists (ingredient_groups, method_groups, categories, accompanying_recipes) when changing them: a list you send replaces the old one.
- Write in UK English with metric amounts (g, ml, tsp, tbsp). The site converts to imperial and scales servings itself, including amounts written in method steps (e.g. "Add 500ml of stock"), so write steps for the recipe's own servings.
- Ingredients: quantity is a number (0.5, not "½"), unit is one of the listed units or null for plain counts ("3 eggs" is quantity 3, unit null, name "eggs"), name is the ingredient ("sage"), note is preparation ("finely chopped"). "8 sage leaves" is quantity 8, unit "leaf", name "sage".
- Describe each change in update_recipe's summary, in a few words; it's shown in the History.
- Photos, publishing dates and deleting recipes are done in the admin, not here.`;

const UNITS = UNIT_KEYS as [UnitKey, ...UnitKey[]];

const ingredientSchema = z.object({
  quantity: z.number().positive().nullable().describe('Amount as a number (0.5 for half); null for "to taste" lines'),
  unit: z.enum(UNITS).nullable().describe('Unit, or null for plain counts ("3 eggs") and "to taste"'),
  name: z.string().min(1).describe('The ingredient, e.g. "sage", "chicken thighs"'),
  note: z.string().optional().describe('Preparation, e.g. "finely chopped"'),
});
const ingredientGroupsSchema = z
  .array(z.object({ group_title: z.string().describe('"" for a single list, or e.g. "For the sauce"'), items: z.array(ingredientSchema).min(1) }))
  .min(1);
const methodGroupsSchema = z
  .array(z.object({ group_title: z.string().describe('"" for a single list, or e.g. "For the sauce"'), steps: z.array(z.string().min(1)).min(1) }))
  .min(1);
const categoriesSchema = z
  .object({
    course: z.array(z.string()).optional(),
    cuisine: z.array(z.string()).optional(),
    dietary: z.array(z.string()).optional(),
  })
  .describe('Category titles or uids from list_categories; each type you send replaces that type');
const accompanyingSchema = z
  .array(z.string())
  .describe('Recipes that go with this one, by uid or exact title; replaces the current list');

const recipeFields = {
  subtitle: z.string().optional(),
  short_description: z.string().optional().describe('One or two sentences for recipe cards'),
  full_description: z.string().optional().describe('The introduction on the recipe page; blank lines between paragraphs'),
  servings: z.number().int().min(1).max(48).optional(),
  prep_time: z.number().int().min(0).optional().describe('Minutes'),
  cook_time: z.number().int().min(0).optional().describe('Minutes'),
  calories_per_serving: z.number().int().min(0).nullable().optional(),
  serving_suggestions: z.string().optional(),
  tips: z.string().optional(),
  categories: categoriesSchema.optional(),
  accompanying_recipes: accompanyingSchema.optional(),
};

type RecipeChanges = {
  title?: string;
  subtitle?: string;
  short_description?: string;
  full_description?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  calories_per_serving?: number | null;
  serving_suggestions?: string;
  tips?: string;
  ingredient_groups?: z.infer<typeof ingredientGroupsSchema>;
  method_groups?: z.infer<typeof methodGroupsSchema>;
  categories?: z.infer<typeof categoriesSchema>;
  accompanying_recipes?: string[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public reads go through the read policies, so trashed recipes stay hidden
let publicClient: SupabaseClient | null = null;
function reader(): SupabaseClient {
  publicClient ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ ...text(message), isError: true });

/** Links to recipes use the address the connector was reached on: the site itself */
function siteUrl(request?: Request): string {
  if (request) return getPublicOrigin(request);
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

function generateUid(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A recipe as ChatGPT reads and writes it */
function forChat(recipe: Recipe, origin: string) {
  return {
    id: recipe.id,
    uid: recipe.uid,
    url: `${origin}/${recipe.uid}`,
    title: recipe.title,
    subtitle: recipe.subtitle,
    short_description: recipe.short_description,
    full_description: recipe.full_description,
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    rest_periods: recipe.rest_periods,
    total_time: recipe.total_time,
    calories_per_serving: recipe.calories_per_serving,
    ingredient_groups: recipe.ingredient_groups.map((g) => ({
      group_title: g.group_title,
      items: g.items.map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, ...(i.note ? { note: i.note } : {}) })),
    })),
    method_groups: recipe.method_groups.map((g) => ({ group_title: g.group_title, steps: g.items })),
    serving_suggestions: recipe.serving_suggestions,
    tips: recipe.tips,
    categories: {
      course: recipe.course_categories.map((c) => c.title),
      cuisine: recipe.cuisine_categories.map((c) => c.title),
      dietary: recipe.dietary_categories.map((c) => c.title),
    },
    accompanying_recipes: recipe.accompanying_recipes.map((r) => ({ uid: r.uid, title: r.title })),
    has_photo: !!recipe.feature_image_path,
    published_at: recipe.published_at,
  };
}

async function findRecipe(ref: string): Promise<Recipe | null> {
  const clean = ref.trim().replace(/^.*\/(?=[^/]+$)/, ''); // accept a full recipe URL too
  const result = UUID_RE.test(clean) ? await RecipeService.getById(reader(), clean) : await RecipeService.getByUid(reader(), clean);
  return result.success && result.data ? result.data : null;
}

/** Category titles or uids → ids, or an error naming the valid ones */
async function resolveCategories(
  wanted: NonNullable<RecipeChanges['categories']>,
  current: Pick<RecipeFormData, 'course_category_ids' | 'cuisine_category_ids' | 'dietary_category_ids'>
): Promise<{ ids: typeof current } | { error: string }> {
  const all = await CategoryService.getAllGrouped(reader());
  if (!all.success || !all.data) return { error: 'Could not load the categories' };
  const byType: Record<CategoryType, Category[]> = { course: all.data.courses, cuisine: all.data.cuisines, dietary: all.data.dietaries };
  const ids = { ...current };
  for (const type of ['course', 'cuisine', 'dietary'] as const) {
    const names = wanted[type];
    if (!names) continue;
    const found: string[] = [];
    for (const name of names) {
      const n = name.trim().toLowerCase();
      const cat = byType[type].find((c) => c.uid === n || c.title.toLowerCase() === n);
      if (!cat) return { error: `No ${type} category "${name}". Choose from: ${byType[type].map((c) => c.title).join(', ')}` };
      found.push(cat.id);
    }
    ids[`${type}_category_ids`] = [...new Set(found)];
  }
  return { ids };
}

/** Recipe uids or titles → ids, or an error */
async function resolveRecipes(refs: string[], selfId?: string): Promise<{ ids: string[] } | { error: string }> {
  const { data, error } = await reader().from('recipes').select('id, uid, title');
  if (error || !data) return { error: 'Could not load the recipes' };
  const ids: string[] = [];
  for (const ref of refs) {
    const n = ref.trim().toLowerCase();
    const match = data.find((r) => r.uid === n || r.title.toLowerCase() === n);
    if (!match) return { error: `No recipe "${ref}". Use search_recipes to find its uid.` };
    if (match.id !== selfId) ids.push(match.id);
  }
  return { ids: [...new Set(ids)] };
}

/** ChatGPT's ingredient lists, keeping each line's ingredient-library link where the name is unchanged */
export function toIngredientGroups(groups: NonNullable<RecipeChanges['ingredient_groups']>, previous: IngredientGroup[] = []): IngredientGroup[] {
  const linkByName = new Map(
    previous.flatMap((g) => g.items).filter((i) => i.ingredient_id).map((i) => [i.name.trim().toLowerCase(), i.ingredient_id!])
  );
  return groups.map((g) => ({
    group_title: g.group_title.trim(),
    items: g.items.map((i): Ingredient => {
      const ingredient_id = linkByName.get(i.name.trim().toLowerCase());
      return {
        quantity: i.quantity,
        unit: i.unit,
        name: i.name.trim(),
        ...(i.note?.trim() ? { note: i.note.trim() } : {}),
        ...(ingredient_id ? { ingredient_id } : {}),
      };
    }),
  }));
}

const toMethodGroups = (groups: NonNullable<RecipeChanges['method_groups']>): MethodGroup[] =>
  groups.map((g) => ({ group_title: g.group_title.trim(), items: g.steps.map((s) => s.trim()) }));

/** Apply ChatGPT's changes to a recipe's form data */
export async function applyChanges(data: RecipeFormData, changes: RecipeChanges, selfId?: string): Promise<RecipeFormData | { error: string }> {
  const next: RecipeFormData = { ...data };
  for (const key of ['title', 'subtitle', 'short_description', 'full_description', 'serving_suggestions', 'tips'] as const) {
    if (changes[key] !== undefined) next[key] = changes[key]!.trim();
  }
  for (const key of ['servings', 'prep_time', 'cook_time', 'calories_per_serving'] as const) {
    if (changes[key] !== undefined) next[key] = changes[key] ?? null;
  }
  if (changes.ingredient_groups) next.ingredient_groups = toIngredientGroups(changes.ingredient_groups, data.ingredient_groups);
  if (changes.method_groups) next.method_groups = toMethodGroups(changes.method_groups);
  if (changes.categories) {
    const resolved = await resolveCategories(changes.categories, next);
    if ('error' in resolved) return resolved;
    Object.assign(next, resolved.ids);
  }
  if (changes.accompanying_recipes) {
    const resolved = await resolveRecipes(changes.accompanying_recipes, selfId);
    if ('error' in resolved) return resolved;
    next.accompanying_recipe_ids = resolved.ids;
  }
  if (!next.title.trim()) return { error: 'A recipe needs a title' };
  return next;
}

export function registerRecipeTools(server: McpServer) {
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const _meta = { securitySchemes: [{ type: 'oauth2' }] };

  server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description: 'Find recipes by words in their title or description. With no query, lists the newest. Returns ids, uids, titles and links.',
      inputSchema: z.object({
        query: z.string().optional().describe('Words to look for, e.g. "gnocchi" or "chorizo soup"'),
        limit: z.number().int().min(1).max(100).optional().describe('How many to return (default 20)'),
      }),
      annotations: readOnly,
      _meta,
    },
    async ({ query, limit }, ctx) => {
      // Characters that would break the search filter
      const search = query?.replace(/[,()%*\\]/g, ' ').trim() || undefined;
      const result = await RecipeService.getAll(reader(), { search, limit: limit ?? 20 });
      if (!result.success) return fail(result.error || 'Search failed');
      const origin = siteUrl(ctx.http?.req);
      return text({
        total: result.pagination?.totalCount,
        recipes: result.data!.map((r) => ({ id: r.id, uid: r.uid, title: r.title, subtitle: r.subtitle || undefined, url: `${origin}/${r.uid}` })),
      });
    }
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get a recipe',
      description: 'The whole recipe: ingredients, method, times, servings, categories and accompanying recipes. Call this before update_recipe.',
      inputSchema: z.object({ recipe: z.string().describe('The recipe uid (e.g. "roasted-chorizo-tomato-garlic-soup"), id or page link') }),
      annotations: readOnly,
      _meta,
    },
    async ({ recipe: ref }, ctx) => {
      const recipe = await findRecipe(ref);
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);
      return text(forChat(recipe, siteUrl(ctx.http?.req)));
    }
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description: 'The course, cuisine and dietary categories recipes can be filed under.',
      inputSchema: z.object({}),
      annotations: readOnly,
      _meta,
    },
    async () => {
      const result = await CategoryService.getAllGrouped(reader());
      if (!result.success || !result.data) return fail('Could not load the categories');
      const list = (cats: Category[]) => cats.map((c) => ({ uid: c.uid, title: c.title }));
      return text({ course: list(result.data.courses), cuisine: list(result.data.cuisines), dietary: list(result.data.dietaries) });
    }
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Update a recipe',
      description:
        'Change a live recipe. Send only the fields to change; lists you send (ingredients, method, categories, accompanying recipes) replace the old ones, so send them whole. The previous version is kept in the recipe History.',
      inputSchema: z.object({
        recipe: z.string().describe('The recipe uid, id or page link'),
        summary: z.string().min(3).max(200).describe('What changed, in a few words, e.g. "Added 8 sage leaves"'),
        changes: z.object({
          title: z.string().min(1).optional(),
          ...recipeFields,
          ingredient_groups: ingredientGroupsSchema.optional(),
          method_groups: methodGroupsSchema.optional(),
        }),
      }),
      annotations: writes,
      _meta,
    },
    async ({ recipe: ref, summary, changes }, ctx) => {
      const user = mcpUser(ctx.http?.authInfo);
      if (!user) return fail('Not signed in');
      const recipe = await findRecipe(ref);
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);

      const next = await applyChanges(recipeToFormData(recipe), changes, recipe.id);
      if ('error' in next) return fail(next.error);

      const result = await RecipeService.updateRecipe(createAdminClient(), recipe.id, next, {
        source: 'chatgpt',
        userId: user.userId,
        summary,
      });
      if (!result.success || !result.data) return fail(result.error || 'Saving failed');
      return text({ saved: true, note: 'Live on the site now; the previous version is in the recipe History.', recipe: forChat(result.data, siteUrl(ctx.http?.req)) });
    }
  );

  server.registerTool(
    'create_recipe',
    {
      title: 'Create a recipe',
      description: 'Add a new recipe. It goes live on the site straight away, without a photo (add one in the admin).',
      inputSchema: z.object({
        title: z.string().min(1),
        ...recipeFields,
        servings: z.number().int().min(1).max(48),
        ingredient_groups: ingredientGroupsSchema,
        method_groups: methodGroupsSchema,
      }),
      annotations: writes,
      _meta,
    },
    async (input, ctx) => {
      const user = mcpUser(ctx.http?.authInfo);
      if (!user) return fail('Not signed in');

      const blank: RecipeFormData = {
        uid: generateUid(input.title),
        title: '',
        subtitle: '',
        short_description: '',
        full_description: '',
        prep_time: null,
        cook_time: null,
        servings: null,
        calories_per_serving: null,
        rest_periods: [],
        ingredient_groups: [],
        method_groups: [],
        serving_suggestions: '',
        tips: '',
        course_category_ids: [],
        cuisine_category_ids: [],
        dietary_category_ids: [],
        accompanying_recipe_ids: [],
      };
      if (!blank.uid) return fail('The title needs some letters or numbers');
      const data = await applyChanges(blank, input);
      if ('error' in data) return fail(data.error);

      const result = await RecipeService.createRecipe(createAdminClient(), data);
      if (!result.success || !result.data) return fail(result.error || 'Saving failed');
      return text({ created: true, note: 'Live on the site now, without a photo.', recipe: forChat(result.data, siteUrl(ctx.http?.req)) });
    }
  );
}
