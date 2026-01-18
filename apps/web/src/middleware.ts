import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register"];

// Routes that should redirect to home if authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth token in cookies or localStorage isn't accessible in middleware
  // We'll use a custom cookie that we set when the user logs in
  const authToken = request.cookies.get("auth-storage");

  // Parse the persisted auth state if it exists
  let isAuthenticated = false;
  if (authToken?.value) {
    try {
      const state = JSON.parse(authToken.value);
      isAuthenticated = state?.state?.isAuthenticated ?? false;
    } catch {
      isAuthenticated = false;
    }
  }

  // If user is authenticated and trying to access auth routes, redirect to home
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|manifest.json).*)",
  ],
};
