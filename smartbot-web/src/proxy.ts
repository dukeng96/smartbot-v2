import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Route-level middleware for auth protection.
 * Checks for refresh token cookie to determine auth status.
 * - Public routes: accessible without auth
 * - Dashboard routes: redirect to /login if no token
 * - Auth pages: redirect to / if already authenticated
 */

/** Auth pages — redirect away if already logged in */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]

/** Public routes accessible by anyone (no auth redirect) */
const PUBLIC_ROUTES = [
  "/chat",
]

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get("sb_authenticated")?.value === "1"
  const isAuth = isAuthRoute(pathname)
  const isPublic = isPublicRoute(pathname)

  // Public routes (e.g. /chat) — always accessible, no redirects
  if (isPublic) {
    return NextResponse.next()
  }

  // Unauthenticated user accessing protected route → redirect to login
  if (!hasSession && !isAuth) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user accessing auth pages → redirect to dashboard
  if (hasSession && isAuth) {
    return NextResponse.redirect(new URL("/bots", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (static files, images, etc.)
     * - api routes
     * - public assets (favicon, logo, etc.)
     */
    "/((?!_next|api|favicon\\.ico|logo\\.svg).*)",
  ],
}
