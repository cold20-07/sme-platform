/**
 * Security configuration and constants
 */

export const SECURITY_CONFIG = {
  // CSRF Protection
  csrf: {
    enabled: true,
    tokenLength: 32,
    maxTokens: 100,
  },

  // Rate Limiting
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: {
      api: 100,
      auth: 5,
      upload: 10,
    },
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '@$!%*?&',
  },

  // Session Management
  session: {
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    refreshThreshold: 60 * 60, // 1 hour in seconds
    maxConcurrentSessions: 5,
  },

  // File Upload Security
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.csv'],
    scanForMalware: true,
  },

  // Input Validation
  validation: {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    sanitizeHtml: true,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  },

  // Audit Logging
  audit: {
    enabled: true,
    logSuccessfulAuth: true,
    logFailedAuth: true,
    logDataAccess: true,
    logAdminActions: true,
    retentionDays: 90,
  },

  // Security Headers
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      reportOnly: false,
      reportUri: '/api/csp-report',
    },
    frameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },

  // Allowed Origins for CORS
  allowedOrigins: [
    'http://localhost:3000',
    'https://localhost:3000',
    // Add production domains here
  ],

  // Trusted Domains for redirects
  trustedDomains: [
    'localhost',
    // Add production domains here
  ],

  // IP Whitelist for admin functions (optional)
  adminIpWhitelist: [
    // Add admin IP addresses here if needed
  ],

  // Feature Flags
  features: {
    enableBruteForceProtection: true,
    enableSuspiciousActivityDetection: true,
    enableRealTimeSecurityAlerts: true,
    enableSecurityMetrics: true,
  },
} as const;

// Environment-specific overrides
export function getSecurityConfig() {
  const config = { ...SECURITY_CONFIG };

  // Development environment adjustments
  if (process.env.NODE_ENV === 'development') {
    config.rateLimit.enabled = false; // Disable rate limiting in dev
    config.headers.csp.reportOnly = true; // Use report-only CSP in dev
  }

  // Production environment adjustments
  if (process.env.NODE_ENV === 'production') {
    config.audit.logDataAccess = false; // Reduce logging in production
    config.features.enableRealTimeSecurityAlerts = true;
  }

  return config;
}

// Security event types for audit logging
export const SECURITY_EVENTS = {
  AUTH: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    SIGNUP: 'signup',
    PASSWORD_RESET: 'password_reset',
    TOKEN_REFRESH: 'token_refresh',
    SESSION_EXPIRED: 'session_expired',
  },
  DATA: {
    READ: 'data_read',
    CREATE: 'data_create',
    UPDATE: 'data_update',
    DELETE: 'data_delete',
    EXPORT: 'data_export',
  },
  SECURITY: {
    CSRF_FAILURE: 'csrf_failure',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    INVALID_INPUT: 'invalid_input',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
  },
  ADMIN: {
    USER_CREATED: 'admin_user_created',
    USER_DELETED: 'admin_user_deleted',
    ROLE_CHANGED: 'admin_role_changed',
    SETTINGS_CHANGED: 'admin_settings_changed',
    SYSTEM_MAINTENANCE: 'admin_system_maintenance',
  },
} as const;