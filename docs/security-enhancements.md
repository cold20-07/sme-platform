# Security Enhancements

This document describes the comprehensive security enhancements implemented in the SME Platform application.

## Overview

The security enhancements provide multiple layers of protection including:

- Input validation and sanitization
- CSRF protection
- Rate limiting
- Security headers
- Enhanced Row Level Security (RLS) policies
- Security audit logging
- Suspicious activity detection

## Components

### 1. Input Validation and Sanitization

**Location:** `lib/security-validation.ts`

#### Features:
- **HTML Sanitization:** Removes dangerous HTML tags while preserving safe ones
- **Text Sanitization:** Removes HTML tags, JavaScript protocols, and event handlers
- **SQL Input Sanitization:** Prevents SQL injection attacks
- **File Name Sanitization:** Ensures safe file names
- **URL Sanitization:** Validates and sanitizes URLs with domain whitelisting

#### Usage:
```typescript
import { InputSanitizer } from '@/lib/security-validation';

// Sanitize HTML content
const safeHtml = InputSanitizer.sanitizeHtml(userInput);

// Sanitize plain text
const safeText = InputSanitizer.sanitizeText(userInput);

// Sanitize file names
const safeFileName = InputSanitizer.sanitizeFileName(fileName);

// Sanitize URLs
const safeUrl = InputSanitizer.sanitizeUrl(url, ['trusted-domain.com']);
```

### 2. CSRF Protection

**Location:** `lib/security-validation.ts`, `lib/security-middleware.ts`

#### Features:
- Token generation and validation
- One-time use tokens
- Automatic token cleanup
- Integration with forms and API routes

#### Usage:
```typescript
import { CSRFProtection } from '@/lib/security-validation';

// Generate token
const token = CSRFProtection.generateToken();

// Validate token
const isValid = CSRFProtection.validateToken(token);
```

### 3. Rate Limiting

**Location:** `lib/security-validation.ts`

#### Features:
- IP-based rate limiting
- Configurable limits and time windows
- Automatic cleanup of old records

#### Usage:
```typescript
import { RateLimiter } from '@/lib/security-validation';

// Check if rate limited
const isLimited = RateLimiter.isRateLimited('user-ip', 100, 15 * 60 * 1000);

// Reset rate limit
RateLimiter.resetRateLimit('user-ip');
```

### 4. Security Middleware

**Location:** `lib/security-middleware.ts`

#### Features:
- Automatic security header injection
- CSRF token validation
- Rate limiting enforcement
- CORS handling
- Authentication checks

#### Usage:
```typescript
import { withSecurity } from '@/lib/security-middleware';

export const POST = withSecurity(async (req) => {
  // Your API logic here
}, {
  enableCSRF: true,
  enableRateLimit: true,
  rateLimitMax: 50,
  requireAuth: true
});
```

### 5. Secure Form Components

**Location:** `components/ui/secure-form.tsx`

#### Features:
- Automatic CSRF token inclusion
- Input sanitization
- Built-in validation
- Error handling

#### Usage:
```tsx
import { SecureForm, SecureInput } from '@/components/ui/secure-form';

<SecureForm action="/api/submit" onSuccess={handleSuccess}>
  <SecureInput name="email" type="email" required />
  <SecureInput name="name" allowedChars={/^[a-zA-Z\s]*$/} />
</SecureForm>
```

### 6. Security Context

**Location:** `lib/security-context.tsx`

#### Features:
- CSRF token management
- Secure context detection
- Secure form submission utilities

#### Usage:
```tsx
import { useSecurityContext, useSecureForm } from '@/lib/security-context';

function MyComponent() {
  const { csrfToken, isSecureContext } = useSecurityContext();
  const { submitSecurely } = useSecureForm();
  
  const handleSubmit = async (data) => {
    await submitSecurely('/api/endpoint', data);
  };
}
```

### 7. Enhanced RLS Policies

**Location:** `database/migrations/004_enhance_rls_policies.sql`

#### Features:
- Comprehensive row-level security for all tables
- Role-based access control
- Company-based data isolation
- Security audit logging at database level

#### Key Policies:
- Users can only view/edit their own profiles
- Company members can view other company members
- Admins can manage users within their company
- Super admins have cross-company access
- All data access is logged for audit purposes

### 8. Security Audit System

**Location:** `lib/security-audit.ts`

#### Features:
- Comprehensive event logging
- Suspicious activity detection
- Audit trail management
- Security metrics

#### Usage:
```typescript
import { SecurityAudit } from '@/lib/security-audit';

// Log authentication events
await SecurityAudit.logAuthEvent('login', true);

// Log data access
await SecurityAudit.logDataAccess('read', 'users', userId);

// Log security violations
await SecurityAudit.logSecurityViolation('csrf_failure', 'Invalid token');

// Detect suspicious activity
const result = await SecurityAudit.detectSuspiciousActivity(userId);
```

### 9. Security Configuration

**Location:** `lib/security-config.ts`

#### Features:
- Centralized security settings
- Environment-specific configurations
- Feature flags for security features
- Security event constants

### 10. Security Headers

**Location:** `middleware.ts`

#### Implemented Headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: [restrictive policy]`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Security Best Practices

### 1. Input Validation
- Always validate and sanitize user input
- Use type-safe validation schemas (Zod)
- Implement both client-side and server-side validation

### 2. Authentication & Authorization
- Use strong password policies
- Implement proper session management
- Use role-based access control
- Log all authentication events

### 3. Data Protection
- Use HTTPS in production
- Implement proper CORS policies
- Use secure cookies
- Encrypt sensitive data

### 4. Monitoring & Logging
- Log all security events
- Monitor for suspicious activity
- Set up alerts for security violations
- Regular security audits

## Testing

Security enhancements are thoroughly tested in:
- `lib/__tests__/security-enhancements.test.ts`

Run tests with:
```bash
npm test -- lib/__tests__/security-enhancements.test.ts
```

## Demo

A comprehensive security demo is available at:
- `components/examples/security-demo.tsx`

This demonstrates all security features including:
- Input sanitization
- Secure form submission
- CSRF protection
- Security audit logging

## Configuration

### Environment Variables
```env
# Security settings
SECURITY_CSRF_ENABLED=true
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_AUDIT_ENABLED=true
```

### Development vs Production
- Rate limiting is disabled in development
- CSP is report-only in development
- Additional logging in development
- Stricter policies in production

## Compliance

These security enhancements help meet various compliance requirements:
- **OWASP Top 10:** Protection against common web vulnerabilities
- **GDPR:** Data protection and audit trails
- **SOC 2:** Security controls and monitoring
- **ISO 27001:** Information security management

## Maintenance

### Regular Tasks:
1. Review and update security policies
2. Monitor audit logs for suspicious activity
3. Update dependencies for security patches
4. Review and test security configurations
5. Conduct security assessments

### Monitoring:
- Failed authentication attempts
- Rate limiting violations
- CSRF token failures
- Suspicious activity patterns
- Security policy violations

## Support

For security-related issues or questions:
1. Check the audit logs for relevant events
2. Review the security configuration
3. Test with the security demo component
4. Consult the test files for usage examples