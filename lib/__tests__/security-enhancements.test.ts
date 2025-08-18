/**
 * Tests for security enhancements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputSanitizer, RateLimiter, CSRFProtection } from '../security-validation';
import { getSecurityConfig, SECURITY_EVENTS } from '../security-config';

// Mock Supabase client
vi.mock('../supabase', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                limit: vi.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Import SecurityAudit after mocking
const { SecurityAudit } = await import('../security-audit');

describe('InputSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = InputSanitizer.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should allow safe HTML tags', () => {
      const input = '<b>Bold</b> and <i>italic</i> text';
      const result = InputSanitizer.sanitizeHtml(input);
      expect(result).toBe('<b>Bold</b> and <i>italic</i> text');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags from plain text', () => {
      const input = 'Hello <script>alert("xss")</script> world';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('Hello alert("xss") world');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('alert("xss")');
    });
  });

  describe('sanitizeFileName', () => {
    it('should replace special characters with underscores', () => {
      const input = 'my file<>:"/\\|?*.txt';
      const result = InputSanitizer.sanitizeFileName(input);
      expect(result).toBe('my_file_________.txt');
    });

    it('should limit file name length', () => {
      const input = 'a'.repeat(300) + '.txt';
      const result = InputSanitizer.sanitizeFileName(input);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
      const input = 'https://example.com/path';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBe(input);
    });

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const result = InputSanitizer.sanitizeUrl(input);
      expect(result).toBeNull();
    });

    it('should check against allowed domains', () => {
      const input = 'https://malicious.com/path';
      const result = InputSanitizer.sanitizeUrl(input, ['example.com']);
      expect(result).toBeNull();
    });

    it('should allow URLs from allowed domains', () => {
      const input = 'https://example.com/path';
      const result = InputSanitizer.sanitizeUrl(input, ['example.com']);
      expect(result).toBe(input);
    });
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear rate limiter state
    RateLimiter.resetRateLimit('test-key');
  });

  it('should allow requests within limit', () => {
    const key = 'test-key';
    const maxAttempts = 5;
    
    for (let i = 0; i < maxAttempts; i++) {
      expect(RateLimiter.isRateLimited(key, maxAttempts)).toBe(false);
    }
  });

  it('should block requests exceeding limit', () => {
    const key = 'test-key';
    const maxAttempts = 3;
    
    // Make requests up to the limit
    for (let i = 0; i < maxAttempts; i++) {
      RateLimiter.isRateLimited(key, maxAttempts);
    }
    
    // Next request should be rate limited
    expect(RateLimiter.isRateLimited(key, maxAttempts)).toBe(true);
  });

  it('should reset rate limit when called', () => {
    const key = 'test-key';
    const maxAttempts = 2;
    
    // Exceed the limit
    RateLimiter.isRateLimited(key, maxAttempts);
    RateLimiter.isRateLimited(key, maxAttempts);
    expect(RateLimiter.isRateLimited(key, maxAttempts)).toBe(true);
    
    // Reset and try again
    RateLimiter.resetRateLimit(key);
    expect(RateLimiter.isRateLimited(key, maxAttempts)).toBe(false);
  });
});

describe('CSRFProtection', () => {
  it('should generate unique tokens', () => {
    const token1 = CSRFProtection.generateToken();
    const token2 = CSRFProtection.generateToken();
    
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(0);
    expect(token2.length).toBeGreaterThan(0);
  });

  it('should validate generated tokens', () => {
    const token = CSRFProtection.generateToken();
    expect(CSRFProtection.validateToken(token)).toBe(true);
  });

  it('should reject invalid tokens', () => {
    expect(CSRFProtection.validateToken('invalid-token')).toBe(false);
  });

  it('should use tokens only once', () => {
    const token = CSRFProtection.generateToken();
    
    // First validation should succeed
    expect(CSRFProtection.validateToken(token)).toBe(true);
    
    // Second validation should fail (one-time use)
    expect(CSRFProtection.validateToken(token)).toBe(false);
  });
});

describe('SecurityAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log security events', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.spyOn(SecurityAudit as any, 'client', 'get').mockReturnValue({
      rpc: mockRpc,
    });

    await SecurityAudit.logEvent({
      action: 'test_action',
      resourceType: 'test_resource',
      success: true,
    });

    expect(mockRpc).toHaveBeenCalledWith('log_security_event', {
      p_action: 'test_action',
      p_resource_type: 'test_resource',
      p_resource_id: null,
      p_ip_address: null,
      p_user_agent: null,
      p_success: true,
      p_error_message: null,
      p_metadata: null,
    });
  });

  it('should log authentication events', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.spyOn(SecurityAudit as any, 'client', 'get').mockReturnValue({
      rpc: mockRpc,
    });

    await SecurityAudit.logAuthEvent('login', true);

    expect(mockRpc).toHaveBeenCalledWith('log_security_event', {
      p_action: 'login',
      p_resource_type: 'auth',
      p_resource_id: null,
      p_ip_address: null,
      p_user_agent: null,
      p_success: true,
      p_error_message: null,
      p_metadata: null,
    });
  });

  it('should log security violations', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.spyOn(SecurityAudit as any, 'client', 'get').mockReturnValue({
      rpc: mockRpc,
    });

    await SecurityAudit.logSecurityViolation('csrf_failure', 'CSRF token invalid');

    expect(mockRpc).toHaveBeenCalledWith('log_security_event', {
      p_action: 'security_violation',
      p_resource_type: 'csrf_failure',
      p_resource_id: null,
      p_ip_address: null,
      p_user_agent: null,
      p_success: false,
      p_error_message: 'CSRF token invalid',
      p_metadata: null,
    });
  });
});

describe('Security Configuration', () => {
  it('should return default configuration', () => {
    const config = getSecurityConfig();
    
    expect(config.csrf.enabled).toBe(true);
    expect(config.rateLimit.enabled).toBeDefined();
    expect(config.password.minLength).toBeGreaterThan(0);
    expect(config.audit.enabled).toBe(true);
  });

  it('should have all required security events', () => {
    expect(SECURITY_EVENTS.AUTH.LOGIN_SUCCESS).toBe('login_success');
    expect(SECURITY_EVENTS.DATA.READ).toBe('data_read');
    expect(SECURITY_EVENTS.SECURITY.CSRF_FAILURE).toBe('csrf_failure');
    expect(SECURITY_EVENTS.ADMIN.USER_CREATED).toBe('admin_user_created');
  });
});

describe('Security Headers', () => {
  it('should include all required security headers', async () => {
    const { securityHeaders } = await import('../security-validation');
    
    expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block');
    expect(securityHeaders['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(securityHeaders['Content-Security-Policy']).toContain('default-src');
  });
});