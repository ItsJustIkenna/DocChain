import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// Fail-fast in production if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️ WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for security.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-only-insecure-jwt-secret-min-32-chars'
);

export interface SessionData {
  userId: string;
  email: string;
  fullName: string;
  role: 'patient' | 'doctor';
  iat?: number; // Issued at
  exp?: number; // Expiration
}

// Session duration: 7 days
const SESSION_DURATION = '7d';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Session refresh threshold: Refresh if less than 1 day remaining
const SESSION_REFRESH_THRESHOLD_MS = 1 * 24 * 60 * 60 * 1000;

/**
 * Create a session token
 */
export async function createSession(data: SessionData): Promise<string> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionData;
  } catch (error) {
    return null;
  }
}

/**
 * Get session from request cookies
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  
  return verifySession(token);
}

/**
 * Check if session needs refresh
 * Returns true if session expires in less than 1 day
 */
export function shouldRefreshSession(session: SessionData): boolean {
  if (!session.exp) return false;
  
  const now = Date.now();
  const expiresAt = session.exp * 1000; // Convert to milliseconds
  const timeUntilExpiry = expiresAt - now;
  
  return timeUntilExpiry < SESSION_REFRESH_THRESHOLD_MS;
}

/**
 * Refresh session if needed
 * Returns new token if refreshed, null if not needed
 */
export async function refreshSessionIfNeeded(request: NextRequest): Promise<string | null> {
  const session = await getSession(request);
  if (!session) return null;
  
  if (shouldRefreshSession(session)) {
    // Create new token with same data but fresh expiration
    return createSession({
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
    });
  }
  
  return null;
}

/**
 * Create session cookie response
 */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000), // 7 days in seconds
    path: '/',
  });
  
  return response;
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete('session');
  return response;
}
