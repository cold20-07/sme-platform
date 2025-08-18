/**
 * Security middleware for Next.js API routes
 * Provides CSRF protection, rate limiting, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { CSRFProtection, RateLimiter, securityHeaders } from './security-validation';

export interface SecurityConfig {
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  allowedOrigins?: string[];
  requireAuth?: boolean;
}

const defaultConfig: SecurityConfig = {
  enableCSRF: true,
  enableRateLimit: true,
  rateLimitMax: 100,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  allowedOrigins: [],
  requireAuth: false,
};

/**
 * Security middleware wrapper for API routes
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Apply security headers
      const response = NextResponse.next();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // CORS check
      const origin = req.headers.get('origin');
      if (origin && finalConfig.allowedOrigins?.length) {
        if (!finalConfig.allowedOrigins.includes(origin)) {
          return new NextResponse('Forbidden', { status: 403 });
        }
        response.headers.set('Access-Control-Allow-Origin', origin);
      }

      // Rate limiting
      if (finalConfig.enableRateLimit) {
        const clientIP = getClientIP(req);
        const rateLimitKey = `rate_limit:${clientIP}`;
        
        if (RateLimiter.isRateLimited(
          rateLimitKey,
          finalConfig.rateLimitMax,
          finalConfig.rateLimitWindowMs
        )) {
          return new NextResponse('Too Many Requests', { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(finalConfig.rateLimitWindowMs! / 1000).toString(),
            },
          });
        }
      }

      // CSRF protection for state-changing methods
      if (finalConfig.enableCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfToken = req.headers.get('x-csrf-token');
        if (!csrfToken || !CSRFProtection.validateToken(csrfToken)) {
          return new NextResponse('CSRF token invalid', { status: 403 });
        }
      }

      // Authentication check
      if (finalConfig.requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new NextResponse('Unauthorized', { status: 401 });
        }
      }

      // Call the actual handler
      return await handler(req);
    } catch (error) {
      console.error('Security middleware error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return req.ip || 'unknown';
}

/**
 * Middleware for CSRF token generation endpoint
 */
export async function handleCSRFToken(req: NextRequest): Promise<NextResponse> {
  if (req.method !== 'GET') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  const token = CSRFProtection.generateToken();
  
  return NextResponse.json({ csrfToken: token }, {
    headers: {
      ...securityHeaders,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Security context for React components
 */
export interface SecurityContext {
  csrfToken: string | null;
  isSecureContext: boolean;
}

/**
 * Hook to get CSRF token for forms
 */
export async function getCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
      throw new Error('Failed to get CSRF token');
    }
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw error;
  }
}