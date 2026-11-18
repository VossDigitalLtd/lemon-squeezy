import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { AUTH_SERVER_ISSUER } from '@/lib/mcp/auth';

/**
 * OAuth protected resource metadata for /api/mcp (RFC 9728): tells ChatGPT
 * the connector's address and that it signs in with Supabase's OAuth server.
 */
const handler = protectedResourceHandler({ authServerUrls: [AUTH_SERVER_ISSUER] });
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
