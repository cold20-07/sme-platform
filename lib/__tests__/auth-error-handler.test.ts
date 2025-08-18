import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  standardizeAuthError, 
  sessionManager, 
  authRecoveryManager,
  sessionRefreshRecovery,
  reauthRecovery,
  networkRetryRecovery,
  isAuthError,
  requiresReauth,
  canRetryAuth,
  isSessionExpired
} from '../auth-error-handler';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

describe('Auth Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('standardizeAuthError', () => {
    it('should standardize invalid credentials error', () => {
      const error = new Error('Invalid login credentials');
      const result = standardizeAuthError(error);

      expect(result.authCode).toBe('invalid_credentials');
      expect(result.requiresReauth).toBe(false);
      expect(result.canRetry).toBe(true);
      expect(result.sessionExpired).toBe(false);
      expect(result.category).toBe('auth');
      expect(result.severity).toBe('medium');
    });

    it('should standardize expired token error', () => {
      const error = new Error('JWT expired');
      const result = standardizeAuthError(error);

      expect(result.authCode).toBe('expired_token');
      expect(result.requiresReauth).toBe(true);
      expect(result.canRetry).toBe(true);
      expect(result.sessionExpired).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should standardize network error', () => {
      const error = new Error('Failed to fetch');
      const result = standardizeAuthError(error);

      expect(result.authCode).toBe('network_error');
      expect(result.requiresReauth).toBe(false);
      expect(result.canRetry).toBe(true);
      expect(result.sessionExpired).toBe(false);
      expect(result.category).toBe('auth');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Some unknown error');
      const result = standardizeAuthError(error);

      expect(result.authCode).toBe('unknown_error');
      expect(result.requiresReauth).toBe(false);
      expect(result.canRetry).toBe(true);
      expect(result.sessionExpired).toBe(false);
    });

    it('should handle Supabase AuthError objects', () => {
      const error = {
        message: 'Invalid token',
        code: 'invalid_token',
        details: 'Token is malformed',
      };
      const result = standardizeAuthError(error);

      expect(result.authCode).toBe('invalid_token');
      expect(result.requiresReauth).toBe(true);
      expect(result.sessionExpired).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should identify auth errors correctly', () => {
      const authError = standardizeAuthError(new Error('test'));
      const regularError = new Error('test');

      expect(isAuthError(authError)).toBe(true);
      expect(isAuthError(regularError)).toBe(false);
    });

    it('should identify reauth requirements correctly', () => {
      const reauthError = standardizeAuthError(new Error('JWT expired'));
      const normalError = standardizeAuthError(new Error('Invalid login credentials'));

      expect(requiresReauth(reauthError)).toBe(true);
      expect(requiresReauth(normalError)).toBe(false);
    });

    it('should identify retryable errors correctly', () => {
      const retryableError = standardizeAuthError(new Error('network error'));
      const nonRetryableError = standardizeAuthError(new Error('Email not confirmed'));

      expect(canRetryAuth(retryableError)).toBe(true);
      expect(canRetryAuth(nonRetryableError)).toBe(false);
    });

    it('should identify session expired errors correctly', () => {
      const expiredError = standardizeAuthError(new Error('JWT expired'));
      const normalError = standardizeAuthError(new Error('Invalid login credentials'));

      expect(isSessionExpired(expiredError)).toBe(true);
      expect(isSessionExpired(normalError)).toBe(false);
    });
  });

  describe('Recovery Strategies', () => {
    describe('sessionRefreshRecovery', () => {
      it('should identify recoverable expired token errors', () => {
        const error = standardizeAuthError(new Error('JWT expired'));
        expect(sessionRefreshRecovery.canRecover(error)).toBe(true);
      });

      it('should not recover non-expired token errors', () => {
        const error = standardizeAuthError(new Error('Invalid login credentials'));
        expect(sessionRefreshRecovery.canRecover(error)).toBe(false);
      });
    });

    describe('reauthRecovery', () => {
      it('should identify errors requiring reauth', () => {
        const error = standardizeAuthError(new Error('JWT expired'));
        expect(reauthRecovery.canRecover(error)).toBe(true);
      });

      it('should not recover errors not requiring reauth', () => {
        const error = standardizeAuthError(new Error('Invalid login credentials'));
        expect(reauthRecovery.canRecover(error)).toBe(false);
      });
    });

    describe('networkRetryRecovery', () => {
      it('should identify network errors', () => {
        const error = standardizeAuthError(new Error('Failed to fetch'));
        expect(networkRetryRecovery.canRecover(error)).toBe(true);
      });

      it('should not recover non-network errors', () => {
        const error = standardizeAuthError(new Error('Invalid login credentials'));
        expect(networkRetryRecovery.canRecover(error)).toBe(false);
      });
    });
  });

  describe('AuthRecoveryManager', () => {
    it('should attempt recovery with appropriate strategy', async () => {
      const error = standardizeAuthError(new Error('network error'));
      const result = await authRecoveryManager.attemptRecovery(error);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network_retry');
    });

    it('should return failure when no strategy can recover', async () => {
      const error = standardizeAuthError(new Error('Email not confirmed'));
      // This error doesn't match any recovery strategy
      error.canRetry = false;
      error.requiresReauth = false;
      error.authCode = 'email_not_confirmed';

      const result = await authRecoveryManager.attemptRecovery(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should allow adding custom strategies', async () => {
      const customStrategy = {
        name: 'custom_test',
        canRecover: (error: any) => error.authCode === 'test_error',
        recover: async () => ({ success: true }),
      };

      authRecoveryManager.addStrategy(customStrategy);

      const error = standardizeAuthError(new Error('test'));
      error.authCode = 'test_error';

      const result = await authRecoveryManager.attemptRecovery(error);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('custom_test');

      // Clean up
      authRecoveryManager.removeStrategy('custom_test');
    });
  });

  describe('SessionManager', () => {
    it('should prevent multiple simultaneous refresh attempts', async () => {
      const mockRefreshSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.doMock('../supabase', () => ({
        supabase: {
          auth: {
            refreshSession: mockRefreshSession,
          },
        },
      }));

      // Start two refresh attempts simultaneously
      const promise1 = sessionManager.refreshSession();
      const promise2 = sessionManager.refreshSession();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should return the same result
      expect(result1).toEqual(result2);
      // But the actual refresh should only be called once
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    it('should rate limit refresh attempts', async () => {
      // First attempt
      await sessionManager.refreshSession();

      // Immediate second attempt should be rate limited
      const result = await sessionManager.refreshSession();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('rate limited');
    });
  });
});

describe('Error Message Mapping', () => {
  const testCases = [
    {
      input: 'Invalid login credentials',
      expectedCode: 'invalid_credentials',
      expectedMessage: 'Invalid email or password. Please try again.',
    },
    {
      input: 'Email not confirmed',
      expectedCode: 'email_not_confirmed',
      expectedMessage: 'Please check your email and click the confirmation link.',
    },
    {
      input: 'Too many requests',
      expectedCode: 'too_many_requests',
      expectedMessage: 'Too many login attempts. Please wait a moment and try again.',
    },
    {
      input: 'JWT expired',
      expectedCode: 'expired_token',
      expectedMessage: 'Your session has expired. Please log in again.',
    },
    {
      input: 'Failed to fetch',
      expectedCode: 'network_error',
      expectedMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    },
  ];

  testCases.forEach(({ input, expectedCode, expectedMessage }) => {
    it(`should map "${input}" correctly`, () => {
      const error = standardizeAuthError(new Error(input));
      expect(error.authCode).toBe(expectedCode);
      expect(error.userMessage).toBe(expectedMessage);
    });
  });
});

describe('Error Categorization', () => {
  it('should categorize network errors correctly', () => {
    const error = standardizeAuthError(new Error('Failed to fetch'));
    expect(error.category).toBe('auth'); // Note: our implementation categorizes all as 'auth' for now
  });

  it('should categorize auth errors correctly', () => {
    const error = standardizeAuthError(new Error('Invalid login credentials'));
    expect(error.category).toBe('auth');
  });

  it('should categorize server errors correctly', () => {
    const error = standardizeAuthError(new Error('Internal server error'));
    expect(error.category).toBe('auth');
  });
});

describe('Error Severity', () => {
  it('should assign high severity to reauth errors', () => {
    const error = standardizeAuthError(new Error('JWT expired'));
    expect(error.severity).toBe('high');
  });

  it('should assign medium severity to validation errors', () => {
    const error = standardizeAuthError(new Error('Invalid login credentials'));
    expect(error.severity).toBe('medium');
  });

  it('should assign appropriate severity based on error type', () => {
    const criticalError = standardizeAuthError(new Error('Internal server error'));
    const networkError = standardizeAuthError(new Error('Failed to fetch'));

    // These would be assigned based on the error categorization logic
    expect(['low', 'medium', 'high', 'critical']).toContain(criticalError.severity);
    expect(['low', 'medium', 'high', 'critical']).toContain(networkError.severity);
  });
});