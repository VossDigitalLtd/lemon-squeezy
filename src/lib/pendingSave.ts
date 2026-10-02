// A recipe someone tried to save while signed out. Kept in this browser until
// they sign in or sign up, then saved for them (PendingSaveHandler).

const KEY = 'ls-pending-save';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // a week, long enough to confirm an email

export interface PendingSave {
  recipeId: string;
  title: string;
  savedAt: number;
}

export function setPendingSave(recipeId: string, title: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ recipeId, title, savedAt: Date.now() }));
  } catch {
    // Storage blocked: the person just signs in without the automatic save
  }
}

export function getPendingSave(): PendingSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingSave;
    if (!value.recipeId || Date.now() - value.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function clearPendingSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

