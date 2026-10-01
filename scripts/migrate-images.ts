/**
 * Image Migration: Prismic CDN → Supabase Storage
 *
 * Downloads recipe feature images from Prismic and uploads them
 * to the Supabase `recipe-images` bucket, then updates the
 * recipe row with the new storage path.
 *
 * Usage:
 *   npm run migrate:images
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as prismic from '@prismicio/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PRISMIC_REPO = 'lemon-squeezy';
const PRISMIC_ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'recipe-images';

if (!PRISMIC_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars.');
  process.exit(1);
}

const prismicClient = prismic.createClient(PRISMIC_REPO, {
  accessToken: PRISMIC_ACCESS_TOKEN,
});

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getExtension(url: string): string {
  // Extract extension from URL path, before query params
  const pathname = new URL(url).pathname;
  const ext = pathname.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return ext;
  return 'jpg'; // fallback
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[ext] || 'image/jpeg';
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Image Migration: Prismic → Supabase    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Fetch all recipes from Prismic that have images
  console.log('Fetching recipes from Prismic...');
  const prismicRecipes = await prismicClient.getAllByType('recipe', {
    filters: [prismic.filter.not('document.tags', ['archived'])],
  });

  const withImages = prismicRecipes.filter(
    (doc) => doc.data.feature_image && (doc.data.feature_image as { url?: string }).url
  );
  console.log(`Found ${withImages.length} recipes with images\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of withImages) {
    const uid = doc.uid!;
    const imageField = doc.data.feature_image as { url: string; alt?: string };
    const imageUrl = imageField.url;
    const alt = imageField.alt || null;

    // 2. Check if recipe exists in Supabase and doesn't already have an image
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, feature_image_path')
      .eq('uid', uid)
      .single();

    if (fetchError || !recipe) {
      console.log(`  ⚠ Recipe "${uid}" not found in Supabase — skipping`);
      skipped++;
      continue;
    }

    if (recipe.feature_image_path) {
      console.log(`  ⏭ "${uid}" already has an image — skipping`);
      skipped++;
      continue;
    }

    // 3. Download image from Prismic CDN
    console.log(`  ↓ Downloading: ${uid}...`);
    let imageBuffer: ArrayBuffer;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      imageBuffer = await response.arrayBuffer();
    } catch (err) {
      console.error(`  ✗ Failed to download "${uid}": ${err}`);
      failed++;
      continue;
    }

    // 4. Upload to Supabase Storage
    const ext = getExtension(imageUrl);
    const fileName = `${uid}.${ext}`;
    const mimeType = getMimeType(ext);

    console.log(`  ↑ Uploading: ${fileName} (${(imageBuffer.byteLength / 1024).toFixed(0)}KB)...`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ✗ Upload failed for "${uid}": ${uploadError.message}`);
      failed++;
      continue;
    }

    // 5. Update recipe row with new image path
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        feature_image_path: uploadData.path,
        feature_image_alt: alt,
      })
      .eq('id', recipe.id);

    if (updateError) {
      console.error(`  ✗ DB update failed for "${uid}": ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(`  ✓ ${uid} → ${uploadData.path}`);
    success++;
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✓ Done! ${success} uploaded, ${skipped} skipped, ${failed} failed`);
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
