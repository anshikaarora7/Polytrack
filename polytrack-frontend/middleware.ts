import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value || request.cookies.get('polytrack_session')?.value;
  const isAuthenticated = Boolean(token);

  // 1. Root '/' entry gate: immediately redirect to /dashboard if logged in, or /login if not
  if (pathname === '/') {
    const targetUrl = new URL(isAuthenticated ? '/dashboard' : '/login', request.url);
    return NextResponse.redirect(targetUrl);
  }

  // 2. Prevent authenticated users from staying on /login
  if (pathname === '/login' && isAuthenticated) {
    const targetUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(targetUrl);
  }

  // 3. Protect all studio workspace routes
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/studio')) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/studio/:path*'],
};
