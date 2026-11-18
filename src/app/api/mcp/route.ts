import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerRecipeTools, MCP_INSTRUCTIONS } from '@/lib/mcp/recipeTools';
import { verifyMcpToken } from '@/lib/mcp/auth';

/**
 * The ChatGPT connector: an MCP server (Streamable HTTP) for searching,
 * reading, editing and creating recipes. Every request needs a token from
 * the Supabase OAuth server for an editor or admin (see lib/mcp/auth.ts).
 */
const handler = createMcpHandler((server) => registerRecipeTools(server), {
  serverInfo: { name: 'lemon-squeezy-recipes', version: '1.0.0' },
  instructions: MCP_INSTRUCTIONS,
});

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource/api/mcp',
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
