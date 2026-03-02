import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Route constants (inlined — path aliases can't be bundled for Edge runtime)
// ---------------------------------------------------------------------------

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
  "/browse",
  "/products",
  "/branches",
  "/reserve",
];

const ROLE_ROUTE_ACCESS: Record<string, readonly string[]> = {
  "/admin": ["admin"],
  "/pos": ["admin", "manager", "cashier"],
  "/branch": ["admin", "manager", "viewer"],
  "/warehouse": ["admin", "hqStaff", "warehouseStaff"],
  "/driver": ["admin", "driver"],
  "/supplier": ["admin", "supplier"],
};

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  admin: "/admin/users",
  hqStaff: "/warehouse",
  manager: "/branch/dashboard",
  cashier: "/pos",
  warehouseStaff: "/warehouse/transfers",
  viewer: "/branch/dashboard",
  driver: "/driver/deliveries",
  supplier: "/supplier/portal",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

interface ClerkJwtPayload {
  exp?: number;
  metadata?: { role?: string };
}

/** Decode the JWT payload without verifying the signature (routing only). */
function decodeClerkSession(token: string): ClerkJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as ClerkJwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Middleware
//
// Security model:
//   - Middleware: lightweight routing/redirect only (no crypto verification).
//   - Convex backend: full JWT verification via requireRole() / withBranchScope().
//   - Clerk's clerkMiddleware is intentionally avoided: @clerk/shared v3.x has
//     no edge-light exports for #crypto / #safe-node-apis, causing Vercel Edge
//     bundler failures.
// ---------------------------------------------------------------------------

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public paths — no auth required
  if (isPublicPath(pathname)) return;

  // Read Clerk session JWT from cookie
  const sessionToken = req.cookies.get("__session")?.value;
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const payload = decodeClerkSession(sessionToken);

  // Malformed or expired token → force re-login
  if (!payload || (payload.exp !== undefined && payload.exp < Date.now() / 1000)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = payload.metadata?.role;

  // Role-based route access check
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTE_ACCESS)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (!role || !allowedRoles.includes(role)) {
        const defaultRoute = role ? (ROLE_DEFAULT_ROUTES[role] ?? "/") : "/";
        return NextResponse.redirect(new URL(defaultRoute, req.url));
      }
      break;
    }
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
