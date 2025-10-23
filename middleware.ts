import { authMiddleware } from "@clerk/nextjs";
import { updateSession } from './lib/supabase/middleware'

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/webhooks(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
  ],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

// Apply Supabase session update
export async function middleware(request: any) {
  return await updateSession(request);
}
