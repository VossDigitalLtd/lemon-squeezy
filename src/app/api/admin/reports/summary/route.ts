import { createClient } from '@/lib/supabase/server';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';
import { loadReport } from '@/lib/reportsData';

/** GET /api/admin/reports/summary — recipe to-do counts and recent activity for the dashboard */
export async function GET() {
  try {
    const supabase = await createClient();
    const denied = await requireStaff(supabase);
    if (denied) return denied;

    const report = await loadReport();
    return ok({
      data: {
        total: report.health.total,
        complete: report.health.complete,
        issues: report.health.issues
          .map((i) => ({ key: i.key, label: i.label, count: i.recipes.length }))
          .sort((a, b) => b.count - a.count),
        views30: report.views.enabled ? report.views.last30 : null,
        saves30: report.saves.last30,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/reports/summary error:', error);
    return apiError('Failed to load summary', 500);
  }
}
