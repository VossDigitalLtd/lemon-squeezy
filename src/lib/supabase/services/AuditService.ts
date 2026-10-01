/**
 * AuditService — records significant admin actions to the audit_events table.
 *
 * All writes use createAdminClient() (service role) to bypass RLS.
 * The log() method is fire-and-forget — it never throws so a failed audit
 * write never disrupts the calling operation.
 *
 * Usage:
 *   import { AuditService } from '@/lib/supabase/services';
 *
 *   // In an API route handler, after the main operation succeeds:
 *   await AuditService.log({ actorId, actorEmail, action: 'user.invited', resourceType: 'user', resourceId: userId, metadata: { email, role } });
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../server';
import { BaseQueryService } from '../core/BaseQueryService';

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LogEventInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

class AuditServiceClass extends BaseQueryService {
  constructor() {
    super('audit_events', {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableCache: false,
      useSoftDelete: false,
    });
  }

  /**
   * Log an audit event. Fire-and-forget — never throws.
   * Uses the service role client so RLS is bypassed for the insert.
   */
  async log(input: LogEventInput): Promise<void> {
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_events').insert({
        actor_id: input.actorId ?? null,
        actor_email: input.actorEmail ?? null,
        action: input.action,
        resource_type: input.resourceType ?? null,
        resource_id: input.resourceId ?? null,
        metadata: input.metadata ?? {},
      });
    } catch (error) {
      // Never propagate — a failed audit log must not break the operation
      console.error('[AuditService] log error:', error);
    }
  }

  /**
   * Paginated list of audit events.
   * Caller must supply the user-scoped supabase client (RLS enforces admin-only access).
   */
  async findEvents(
    supabase: SupabaseClient,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    return this.findMany<AuditEvent>(supabase, {
      page: options.page ?? 1,
      limit: options.limit ?? 50,
      search: options.search,
      select: 'id, actor_id, actor_email, action, resource_type, resource_id, metadata, created_at',
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }
}

export const AuditService = new AuditServiceClass();
