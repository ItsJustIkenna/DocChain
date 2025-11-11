import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Create Redis client using environment variables
// For local development without Upstash, we'll use a memory store
let redis: Redis | undefined;
let ratelimit: Ratelimit | undefined;

// Only initialize if Upstash credentials are provided
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Configure rate limits
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
    analytics: true,
    prefix: "ratelimit",
  });
}

// In-memory fallback for development (not suitable for production with multiple instances)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(identifier: string, limit: number, windowMs: number): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Reset the window
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/**
 * Rate limiting configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  
  // Booking endpoints - moderate limits
  booking: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  
  // General API endpoints
  api: { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  
  // Video/streaming endpoints - more lenient
  video: { limit: 50, windowMs: 60 * 1000 }, // 50 requests per minute
};

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or NextResponse with 429 status if rate limited
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<NextResponse | null> {
  try {
    // Get identifier (IP address or user ID from session)
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const identifier = `ratelimit:${ip}`;

    if (ratelimit) {
      // Use Upstash rate limiting
      const { success, remaining } = await ratelimit.limit(identifier);
      
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { 
            status: 429,
            headers: {
              "X-RateLimit-Remaining": "0",
              "Retry-After": "60"
            }
          }
        );
      }

      return null; // Allow the request
    } else {
      // Use in-memory fallback
      const { success, remaining } = memoryRateLimit(identifier, config.limit, config.windowMs);
      
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { 
            status: 429,
            headers: {
              "X-RateLimit-Remaining": "0",
              "Retry-After": Math.ceil(config.windowMs / 1000).toString()
            }
          }
        );
      }

      return null; // Allow the request
    }
  } catch (error) {
    console.error("[Rate Limit] Error:", error);
    // Fail open - allow the request if rate limiting fails
    return null;
  }
}

/**
 * Helper function to check rate limit and return early if exceeded
 * Usage: 
 *   const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.auth);
 *   if (rateLimitResponse) return rateLimitResponse;
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<NextResponse | null> {
  return applyRateLimit(request, config);
}
