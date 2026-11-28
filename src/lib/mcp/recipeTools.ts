import { z } from 'zod';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { McpServer } from '@modelcontextprotocol/server';
import { getPublicOrigin } from 'mcp-handler';
import { createAdminClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService, TrashService } from '@/lib/supabase/services';
import { recipeToFormData } from '@/lib/recipeFormData';
import { UNIT_KEYS, type UnitKey } from '@/lib/units';
import { mcpUser } from './auth';
import { TRASH_DAYS } from '@/lib/trash';
import { REST_TYPES, restWhen } from '@/lib/rest';
import type { Category, CategoryType, Ingredient, IngredientGroup, MethodGroup, Recipe, RecipeFormData, RecipeStatus } from '@/types/recipe';

/**
 * The tools ChatGPT and Claude can use on the recipes: search, read, edit,
 * create, publish/unpublish/archive and move to the Trash. Edits save
 * through RecipeService like the admin does (ingredient library links,
 * method links, undo history). Reads run as the signed-in editor, so they
 * see drafts and archived recipes but not the Trash.
 */

export const MCP_INSTRUCTIONS = `Lemon Squeezy is a UK recipe website. These tools read and change its recipes. Each recipe is a draft (not on the site yet), published (on the site) or archived (taken off the site, kept). Changes to a published recipe show on the site straight away, and every edit and status change is kept in the recipe's History in the admin so it can be undone.

- Always call get_recipe before update_recipe, and send whole lists (ingredient_groups, method_groups, categories, accompanying_recipes) when changing them: a list you send replaces the old one.
- Write in UK English with metric amounts (g, ml, tsp, tbsp). The site converts to imperial and scales servings itself, including amounts written in method steps (e.g. "Add 500ml of stock"), so write steps for the recipe's own servings.
- Ingredients: quantity is a number (0.5, not "½"), unit is one of the listed units or null for plain counts ("3 eggs" is quantity 3, unit null, name "eggs"), name is the ingredient ("sage"), note is preparation ("finely chopped"). "8 sage leaves" is quantity 8, unit "leaf", name "sage".
- Times are in minutes: prep_time, cook_time, and rest_periods for other waiting (marinating, proving or chilling before cooking; resting, setting or cooling after). Each rest says when it happens: "before" or "after" cooking. The site shows them in cooking order and adds them to the total time.
- inspiration credits the original recipes a recipe follows or adapts. Write each source as a link, [Source name](https://…), one per line, e.g. "Adapted from [Ottolenghi's lemon chicken](https://…)". Only add a source the person gives you or confirms; never invent links.
- Describe each change in update_recipe's summary, in a few words; it's shown in the History.
- New recipes from create_recipe are drafts. Publish one with set_recipe_status only when asked to; archive takes a recipe off the site without deleting it.
- delete_recipe moves a recipe to the Trash, where it can be restored in the admin for ${TRASH_DAYS} days; prefer archiving unless the person wants it deleted.
- Photos and emptying the Trash are done in the admin, not here.`;

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
  .describe('Category titles or uids from list_categories (a page_label works too); each type you send replaces that type');
const restPeriodsSchema = z
  .array(
    z.object({
      type: z.enum(REST_TYPES).describe('What happens: rest, set, chill, cool, marinate, prove, soak, or other'),
      label: z.string().optional().describe('Only for type "other", e.g. "Freezing"'),
      minutes: z.number().int().min(1),
      when: z.enum(['before', 'after']).describe('Before or after cooking'),
    })
  )
  .describe('Waiting times besides prep and cook, e.g. marinating before cooking or resting after; replaces the current list ([] removes them all)');
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
  rest_periods: restPeriodsSchema.optional(),
  calories_per_serving: z.number().int().min(0).nullable().optional(),
  serving_suggestions: z.string().optional(),
  tips: z.string().optional(),
  inspiration: z
    .string()
    .optional()
    .describe(
      'Credits for the original recipes this one follows or adapts, shown as "Recipe inspiration" after the tips (unless hidden site-wide in the admin). Write links as [Source name](https://…); one line per source. "" removes it.'
    ),
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
  rest_periods?: z.infer<typeof restPeriodsSchema>;
  calories_per_serving?: number | null;
  serving_suggestions?: string;
  tips?: string;
  inspiration?: string;
  ingredient_groups?: z.infer<typeof ingredientGroupsSchema>;
  method_groups?: z.infer<typeof methodGroupsSchema>;
  categories?: z.infer<typeof categoriesSchema>;
  accompanying_recipes?: string[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads run as the signed-in editor (their OAuth token), so the read
 * policies show drafts and archived recipes but keep the Trash hidden.
 * Without a token (tests), reads are public: published recipes only.
 */
let publicClient: SupabaseClient | null = null;
function reader(token?: string): SupabaseClient {
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  if (token) {
    return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      ...options,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  publicClient ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
  return publicClient;
}

const STATUS_NOTE: Record<RecipeStatus, string> = {
  draft: 'Draft: not on the site yet.',
  published: 'Published: on the site.',
  archived: 'Archived: taken off the site.',
};

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

/** A recipe as the assistant reads and writes it */
function forChat(recipe: Recipe, origin: string) {
  return {
    id: recipe.id,
    uid: recipe.uid,
    url: `${origin}/${recipe.uid}`,
    status: recipe.status,
    title: recipe.title,
    subtitle: recipe.subtitle,
    short_description: recipe.short_description,
    full_description: recipe.full_description,
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    rest_periods: (recipe.rest_periods ?? []).map((r) => ({ ...r, when: restWhen(r) })),
    total_time: recipe.total_time,
    calories_per_serving: recipe.calories_per_serving,
    ingredient_groups: recipe.ingredient_groups.map((g) => ({
      group_title: g.group_title,
      items: g.items.map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, ...(i.note ? { note: i.note } : {}) })),
    })),
    method_groups: recipe.method_groups.map((g) => ({ group_title: g.group_title, steps: g.items })),
    serving_suggestions: recipe.serving_suggestions,
    tips: recipe.tips,
    inspiration: recipe.inspiration,
    categories: {
      course: recipe.course_categories.map((c) => c.title),
      cuisine: recipe.cuisine_categories.map((c) => c.title),
      dietary: recipe.dietary_categories.map((c) => c.title),
    },
    accompanying_recipes: recipe.accompanying_recipes.map((r) => ({ uid: r.uid, title: r.title, status: r.status })),
    has_photo: !!recipe.feature_image_path,
    published_at: recipe.published_at,
  };
}

async function findRecipe(ref: string, client: SupabaseClient): Promise<Recipe | null> {
  const clean = ref.trim().replace(/^.*\/(?=[^/]+$)/, ''); // accept a full recipe URL too
  const result = UUID_RE.test(clean) ? await RecipeService.getById(client, clean) : await RecipeService.getByUid(client, clean);
  return result.success && result.data ? result.data : null;
}

/** Category titles or uids → ids, or an error naming the valid ones */
async function resolveCategories(
  wanted: NonNullable<RecipeChanges['categories']>,
  current: Pick<RecipeFormData, 'course_category_ids' | 'cuisine_category_ids' | 'dietary_category_ids'>,
  client: SupabaseClient
): Promise<{ ids: typeof current } | { error: string }> {
  const all = await CategoryService.getAllGrouped(client);
  if (!all.success || !all.data) return { error: 'Could not load the categories' };
  const byType: Record<CategoryType, Category[]> = { course: all.data.courses, cuisine: all.data.cuisines, dietary: all.data.dietaries };
  const ids = { ...current };
  for (const type of ['course', 'cuisine', 'dietary'] as const) {
    const names = wanted[type];
    if (!names) continue;
    const found: string[] = [];
    for (const name of names) {
      const n = name.trim().toLowerCase();
      const cat = byType[type].find((c) => c.uid === n || c.title.toLowerCase() === n || c.page_label?.toLowerCase() === n);
      if (!cat) return { error: `No ${type} category "${name}". Choose from: ${byType[type].map((c) => c.title).join(', ')}` };
      found.push(cat.id);
    }
    ids[`${type}_category_ids`] = [...new Set(found)];
  }
  return { ids };
}

/** Recipe uids or titles → ids, or an error */
async function resolveRecipes(refs: string[], client: SupabaseClient, selfId?: string): Promise<{ ids: string[] } | { error: string }> {
  const { data, error } = await client.from('recipes').select('id, uid, title');
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

/** The assistant's ingredient lists, keeping each line's ingredient-library link where the name is unchanged */
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

/** Apply the assistant's changes to a recipe's form data */
export async function applyChanges(
  data: RecipeFormData,
  changes: RecipeChanges,
  { selfId, client }: { selfId?: string; client?: SupabaseClient } = {}
): Promise<RecipeFormData | { error: string }> {
  const next: RecipeFormData = { ...data };
  for (const key of ['title', 'subtitle', 'short_description', 'full_description', 'serving_suggestions', 'tips', 'inspiration'] as const) {
    if (changes[key] !== undefined) next[key] = changes[key]!.trim();
  }
  for (const key of ['servings', 'prep_time', 'cook_time', 'calories_per_serving'] as const) {
    if (changes[key] !== undefined) next[key] = changes[key] ?? null;
  }
  if (changes.rest_periods) {
    next.rest_periods = changes.rest_periods.map((r) => ({
      type: r.type,
      ...(r.type === 'other' && r.label?.trim() ? { label: r.label.trim() } : {}),
      minutes: r.minutes,
      when: r.when,
    }));
  }
  if (changes.ingredient_groups) next.ingredient_groups = toIngredientGroups(changes.ingredient_groups, data.ingredient_groups);
  if (changes.method_groups) next.method_groups = toMethodGroups(changes.method_groups);
  if (changes.categories) {
    const resolved = await resolveCategories(changes.categories, next, client ?? reader());
    if ('error' in resolved) return resolved;
    Object.assign(next, resolved.ids);
  }
  if (changes.accompanying_recipes) {
    const resolved = await resolveRecipes(changes.accompanying_recipes, client ?? reader(), selfId);
    if ('error' in resolved) return resolved;
    next.accompanying_recipe_ids = resolved.ids;
  }
  if (!next.title.trim()) return { error: 'A recipe needs a title' };
  return next;
}

export function registerRecipeTools(server: McpServer) {
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const destructive = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
  const _meta = { securitySchemes: [{ type: 'oauth2' }] };

  server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        'Find recipes by words in their title or description. With no query, lists the newest. Returns ids, uids, titles, status and links. Includes drafts and archived recipes unless status says otherwise.',
      inputSchema: z.object({
        query: z.string().optional().describe('Words to look for, e.g. "gnocchi" or "chorizo soup"'),
        status: z.enum(['all', 'draft', 'published', 'archived']).optional().describe('Only recipes with this status (default all)'),
        limit: z.number().int().min(1).max(100).optional().describe('How many to return (default 20)'),
      }),
      annotations: readOnly,
      _meta,
    },
    async ({ query, status, limit }, ctx) => {
      // Characters that would break the search filter
      const search = query?.replace(/[,()%*\\]/g, ' ').trim() || undefined;
      const result = await RecipeService.getAll(reader(ctx.http?.authInfo?.token), { search, limit: limit ?? 20, status: status ?? 'all' });
      if (!result.success) return fail(result.error || 'Search failed');
      const origin = siteUrl(ctx.http?.req);
      return text({
        total: result.pagination?.totalCount,
        recipes: result.data!.map((r) => ({ id: r.id, uid: r.uid, title: r.title, subtitle: r.subtitle || undefined, status: r.status, url: `${origin}/${r.uid}` })),
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
      const recipe = await findRecipe(ref, reader(ctx.http?.authInfo?.token));
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);
      return text(forChat(recipe, siteUrl(ctx.http?.req)));
    }
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description:
        'The course, cuisine and dietary categories recipes can be filed under. A page_label is the name shown on recipe pages instead of the title (e.g. Cypriot shows as "From a Cypriot kitchen"); either name can be used.',
      inputSchema: z.object({}),
      annotations: readOnly,
      _meta,
    },
    async () => {
      const result = await CategoryService.getAllGrouped(reader());
      if (!result.success || !result.data) return fail('Could not load the categories');
      const list = (cats: Category[]) => cats.map((c) => ({ uid: c.uid, title: c.title, ...(c.page_label ? { page_label: c.page_label } : {}) }));
      return text({ course: list(result.data.courses), cuisine: list(result.data.cuisines), dietary: list(result.data.dietaries) });
    }
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Update a recipe',
      description:
        'Change a recipe\'s content (not its status: use set_recipe_status). Send only the fields to change; lists you send (ingredients, method, categories, accompanying recipes) replace the old ones, so send them whole. The previous version is kept in the recipe History.',
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
      const client = reader(ctx.http?.authInfo?.token);
      const recipe = await findRecipe(ref, client);
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);

      const next = await applyChanges(recipeToFormData(recipe), changes, { selfId: recipe.id, client });
      if ('error' in next) return fail(next.error);

      const result = await RecipeService.updateRecipe(createAdminClient(), recipe.id, next, {
        source: user.source,
        userId: user.userId,
        summary,
      });
      if (!result.success || !result.data) return fail(result.error || 'Saving failed');
      return text({
        saved: true,
        note: `${STATUS_NOTE[result.data.status]} The previous version is in the recipe History.`,
        recipe: forChat(result.data, siteUrl(ctx.http?.req)),
      });
    }
  );

  server.registerTool(
    'create_recipe',
    {
      title: 'Create a recipe',
      description: 'Add a new recipe as a draft (not on the site). Publish it with set_recipe_status when asked; add a photo in the admin.',
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
        inspiration: '',
        status: 'draft',
        course_category_ids: [],
        cuisine_category_ids: [],
        dietary_category_ids: [],
        accompanying_recipe_ids: [],
      };
      if (!blank.uid) return fail('The title needs some letters or numbers');
      const data = await applyChanges(blank, input, { client: reader(ctx.http?.authInfo?.token) });
      if ('error' in data) return fail(data.error);

      const result = await RecipeService.createRecipe(createAdminClient(), data);
      if (!result.success || !result.data) return fail(result.error || 'Saving failed');
      return text({
        created: true,
        note: 'Saved as a draft: not on the site yet. Publish it with set_recipe_status when asked. It has no photo yet.',
        recipe: forChat(result.data, siteUrl(ctx.http?.req)),
      });
    }
  );

  server.registerTool(
    'set_recipe_status',
    {
      title: 'Publish, unpublish or archive a recipe',
      description:
        'published puts a recipe on the site; draft takes it off to keep working on it; archived takes it off the site but keeps it (publish again any time). Recorded in the recipe History.',
      inputSchema: z.object({
        recipe: z.string().describe('The recipe uid, id or page link'),
        status: z.enum(['draft', 'published', 'archived']),
      }),
      annotations: writes,
      _meta,
    },
    async ({ recipe: ref, status }, ctx) => {
      const user = mcpUser(ctx.http?.authInfo);
      if (!user) return fail('Not signed in');
      const recipe = await findRecipe(ref, reader(ctx.http?.authInfo?.token));
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);
      if (recipe.status === status) return text({ unchanged: true, note: STATUS_NOTE[status], uid: recipe.uid });

      const data: RecipeFormData = { ...recipeToFormData(recipe), status };
      // A draft's first publish dates it today, so it leads "Fresh off the chopping board"
      if (status === 'published' && recipe.status === 'draft') data.published_at = new Date().toISOString();

      const summary = { published: 'Published', draft: 'Moved back to draft', archived: 'Archived' }[status];
      const result = await RecipeService.updateRecipe(createAdminClient(), recipe.id, data, {
        source: user.source,
        userId: user.userId,
        summary,
      });
      if (!result.success || !result.data) return fail(result.error || 'Saving failed');
      return text({ saved: true, note: STATUS_NOTE[status], title: result.data.title, url: `${siteUrl(ctx.http?.req)}/${result.data.uid}` });
    }
  );

  server.registerTool(
    'delete_recipe',
    {
      title: 'Move a recipe to the Trash',
      description: `Takes a recipe off the site and moves it to the Trash, where it can be restored in the admin for ${TRASH_DAYS} days before it's deleted for good. Only when the person asks to delete; to just take it off the site, archive it instead.`,
      inputSchema: z.object({ recipe: z.string().describe('The recipe uid, id or page link') }),
      annotations: destructive,
      _meta,
    },
    async ({ recipe: ref }, ctx) => {
      const user = mcpUser(ctx.http?.authInfo);
      if (!user) return fail('Not signed in');
      const recipe = await findRecipe(ref, reader(ctx.http?.authInfo?.token));
      if (!recipe) return fail(`No recipe "${ref}". Use search_recipes to find it.`);

      const admin = createAdminClient();
      const result = await RecipeService.deleteRecipe(admin, recipe.id);
      if (!result.success) return fail(result.error || 'Deleting failed');
      await TrashService.purgeExpired(admin);
      return text({
        deleted: true,
        note: `"${recipe.title}" is in the Trash. It can be restored from Trash in the admin for ${TRASH_DAYS} days.`,
      });
    }
  );
}
