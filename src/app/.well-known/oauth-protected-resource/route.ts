import { generateProtectedResourceMetadata, getPublicOrigin, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { AUTH_SERVER_ISSUER } from '@/lib/mcp/auth';

/** The same metadata at the root, for clients that look there first; the resource is /api/mcp */
export function GET(req: Request) {
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [AUTH_SERVER_ISSUER],
    resourceUrl: `${getPublicOrigin(req)}/api/mcp`,
  });
  return Response.json(metadata, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' } });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
