/**
 * Security validation and sanitization utilities
 * Provides input validation, sanitization, and security checks
 */

let DOMPurify: any = null;
if (typeof window !== 'undefined') {
  // Only import DOMPurify on the client
  DOMPurify = require('isomorphic-dompurify');
}
import { z } from 'zod';

// Common validation schemas
export const securitySchemas = {
  email: z.string().email().max(254),
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  companyName: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s&.,'-]+$/, 'Company name contains invalid characters'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').max(20),
  url: z.string().url().max(2048),
  uuid: z.string().uuid(),
  positiveNumber: z.number().positive(),
  nonNegativeNumber: z.number().min(0),
};

// Input sanitization functions
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (DOMPurify) {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
      });
    }
    // On server, return input unchanged or use a server-side sanitizer if needed
    return input;
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    return input
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags completely
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    return input
      .replace(/[';-]/g, '') // Remove SQL comment and statement terminators
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, ''); // Remove dangerous SQL keywords
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize URL to prevent open redirect attacks
   */
  static sanitizeUrl(url: string, allowedDomains: string[] = []): string | null {
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      // Check against allowed domains if provided
      if (allowedDomains.length > 0 && !allowedDomains.includes(urlObj.hostname)) {
        return null;
      }

      return urlObj.toString();
    } catch {
      return null;
    }
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (record.count >= maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  /**
   * Reset rate limit for a key
   */
  static resetRateLimit(key: string): void {
    this.attempts.delete(key);
  }
}

// Content Security Policy helpers
export const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
};

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': Object.entries(cspDirectives)
    .map(([key, values]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()} ${values.join(' ')}`)
    .join('; '),
};

// Validation middleware for API routes
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

// CSRF token utilities
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static tokens = new Set<string>();

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(this.TOKEN_LENGTH)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    this.tokens.add(token);
    
    // Clean up old tokens (keep last 100)
    if (this.tokens.size > 100) {
      const tokensArray = Array.from(this.tokens);
      this.tokens.clear();
      tokensArray.slice(-50).forEach(t => this.tokens.add(t));
    }
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string): boolean {
    const isValid = this.tokens.has(token);
    if (isValid) {
      this.tokens.delete(token); // One-time use
    }
    return isValid;
  }
}