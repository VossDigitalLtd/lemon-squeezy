/** How long deleted recipes and categories stay in the trash */
export const TRASH_DAYS = 30;

export type TrashKind = 'recipe' | 'category';

export interface TrashItem {
  kind: TrashKind;
  id: string;
  title: string;
  /** Recipe: its web address. Category: course, cuisine or dietary */
  detail: string;
  image_path: string | null;
  deleted_at: string;
}

/** Whole days until an item is removed for good (0: today) */
export function daysLeft(deletedAt: string, now: Date = new Date()): number {
  const expires = new Date(deletedAt).getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expires - now.getTime()) / (24 * 60 * 60 * 1000)));
}
