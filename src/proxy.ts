import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isMissingRecipe } from "@/lib/recipeRoutes";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  if (response.status !== 200 || response.headers.has("location")) return response;

  // A recipe address the visitor can't see gets a real 404 (see lib/recipeRoutes.ts)
  if (await isMissingRecipe(request)) {
    const notFound = NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    for (const cookie of response.cookies.getAll()) notFound.cookies.set(cookie);
    return notFound;
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
