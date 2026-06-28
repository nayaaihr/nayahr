import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything requires sign-in except the Clerk auth pages.
const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Run on app routes (skip Next internals + static files)…
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    // …and always on API routes.
    "/(api|trpc)(.*)",
  ],
};
