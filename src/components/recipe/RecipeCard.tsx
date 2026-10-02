import Link from 'next/link';
import Image from 'next/image';
import { LogoTimer, LogoRays } from '@/components/brand';
import { getImageUrl } from '@/lib/recipes';
import { formatMinutesShort } from '@/lib/time';
import { cn } from '@/utils/cn';
import type { RecipeSummary } from '@/types/recipe';

interface RecipeCardProps {
  recipe: RecipeSummary;
  /** "lead" is the large first card in an editorial grid */
  variant?: 'default' | 'lead';
  showDescription?: boolean;
  /** Rendered over the photo's top-right corner, above the card link (e.g. a favourite heart) */
  action?: React.ReactNode;
  /** Pass for cards visible on first load */
  priority?: boolean;
  /** next/image sizes hint */
  sizes?: string;
  className?: string;
}

/**
 * Photo-led recipe card: rounded 4:3 photo, logo timer + total time + course,
 * serif title. The whole card is one link; `action` sits above it.
 */
export function RecipeCard({
  recipe,
  variant = 'default',
  showDescription = variant === 'lead',
  action,
  priority,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  className,
}: RecipeCardProps) {
  const imageUrl = getImageUrl(recipe.feature_image_path);
  const course = recipe.course_categories[0]?.title;
  const isLead = variant === 'lead';

  return (
    <article className={cn('group relative grid content-start gap-3.5', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-muted',
          isLead ? 'aspect-[4/3.4]' : 'aspect-[4/3]'
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={recipe.feature_image_alt || ''}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <svg viewBox="0 0 180 180" className="absolute inset-0 m-auto w-1/3 text-muted-foreground/40" aria-hidden="true">
            <LogoRays />
          </svg>
        )}
      </div>

      {action && <div className="absolute right-3 top-3 z-20">{action}</div>}

      {recipe.total_time != null && recipe.total_time > 0 && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground tabular-nums">
          <LogoTimer
            minutes={recipe.total_time}
            label={`${formatMinutesShort(recipe.total_time)} total`}
            className={isLead ? 'size-9' : 'size-7'}
          />
          <span>{formatMinutesShort(recipe.total_time)}</span>
          {course && (
            <>
              <span className="size-[3px] rounded-full bg-current" aria-hidden="true" />
              <span>{course}</span>
            </>
          )}
        </div>
      )}

      <h3
        className={cn(
          'font-display leading-[1.1] text-balance decoration-primary decoration-[3px] underline-offset-4 group-hover:underline',
          isLead ? 'text-[clamp(1.75rem,2.6vw,2.25rem)]' : 'text-[1.375rem]'
        )}
      >
        {recipe.title}
      </h3>

      {showDescription && recipe.short_description && (
        <p className="line-clamp-2 text-[0.9375rem] text-muted-foreground">{recipe.short_description}</p>
      )}

      <Link href={`/${recipe.uid}`} className="absolute inset-0 z-10 rounded-2xl" aria-label={recipe.title} />
    </article>
  );
}
