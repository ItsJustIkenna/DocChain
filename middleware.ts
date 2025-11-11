import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session token from cookies
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifySession(token) : null;

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/doctors/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (session) {
    // Patients trying to access doctor dashboard
    if (pathname.startsWith('/doctors/dashboard') && session.role === 'patient') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Doctors trying to access patient dashboard
    if (pathname === '/dashboard' && session.role === 'doctor') {
      return NextResponse.redirect(new URL('/doctors/dashboard', request.url));
    }
  }

  // Create response
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // Add CSP header for XSS protection
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://media.twiliocdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://fullnode.devnet.sui.io https://video.twilio.com wss://*.twilio.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "media-src 'self' blob:",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/doctors/dashboard/:path*',
  ],
};
