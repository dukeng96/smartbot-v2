import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Route-level middleware for auth protection.
 * Checks for refresh token cookie to determine auth status.
 * - Public routes: accessible without auth
 * - Dashboard routes: redirect to /login if no token
 * - Auth pages: redirect to / if already authenticated
 */

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get("sb_authenticated")?.value === "1"
  const isPublic = isPublicRoute(pathname)

  // Unauthenticated user accessing protected route → redirect to login
  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user accessing auth pages → redirect to dashboard
  if (hasSession && isPublic) {
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
