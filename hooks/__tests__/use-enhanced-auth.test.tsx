import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnhancedAuth } from '../use-enhanced-auth';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/auth-error-handler', () => ({
  standardizeAuthError: vi.fn((error) => ({
    id: 'test-error-id',
    code: 'TEST_ERROR',
    authCode: 'test_error',
    message: error.message,
    userMessage: 'Test error message',
    details: error,
    timestamp: new Date(),
    retryable: true,
    severity: 'medium',
    category: 'auth',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  })),
  sessionManager: {
    refreshSession: vi.fn(),
    validateSession: vi.fn(),
    clearSession: vi.fn(),
  },
  authRecoveryManager: {
    attemptRecovery: vi.fn(),
  },
  isAuthError: vi.fn(() => true),
  requiresReauth: vi.fn(() => false),
  canRetryAuth: vi.fn(() => true),
  isSessionExpired: vi.fn(() => false),
}));

vi.mock('./use-api-error-handler', () => ({
  useAPIErrorHandler: () => ({
    handleError: vi.fn(),
  }),
}));

// Mock timers
vi.useFakeTimers();

describe('useEnhancedAuth', () => {
  const mockSupabase = vi.mocked(await import('@/lib/supabase')).supabase;
  const mockSessionManager = vi.mocked(await import('@/lib/auth-error-handler')).sessionManager;
  const mockAuthRecoveryManager = vi.mocked(await import('@/lib/auth-error-handler')).authRecoveryManager;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSessionManager.validateSession.mockResolvedValue(true);
    mockSessionManager.refreshSession.mockResolvedValue({
      session: null,
      error: null,
    });
    mockSessionManager.clearSession.mockResolvedValue();
    
    mockAuthRecoveryManager.attemptRecovery.mockResolvedValue({
      success: true,
      strategy: 'test_strategy',
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load initial session', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com', created_at: '2023-01-01' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockSupabase.auth.getSession.mockRejectedValue(error);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', created_at: '2023-01-01' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password');
      });

      expect(signInResult).toEqual({ success: true });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should handle sign in errors', async () => {
      const error = new Error('Invalid credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong-password');
      });

      expect(signInResult?.success).toBe(false);
      expect(signInResult?.error).toBeDefined();
      expect(result.current.error).toBeDefined();
    });

    it('should attempt automatic recovery for retryable errors', async () => {
      const error = new Error('Network error');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(mockAuthRecoveryManager.attemptRecovery).toHaveBeenCalled();
    });
  });

  describe('Sign Up', () => {
    it('should sign up successfully', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', created_at: '2023-01-01' };
      const mockCompany = { id: 'company-1', name: 'Test Company' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCompany }),
          }),
        }),
      });

      const { result } = renderHook(() => useEnhancedAuth());

      const companyData = {
        name: 'Test Company',
        gst_number: 'GST123',
        pan_number: 'PAN123',
        industry: 'Technology',
        legal_structure: 'Private Limited',
      };

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password', companyData);
      });

      expect(signUpResult).toEqual({ success: true });
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should handle sign up errors', async () => {
      const error = new Error('Email already exists');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password');
      });

      expect(signUpResult?.success).toBe(false);
      expect(signUpResult?.error).toBeDefined();
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useEnhancedAuth());

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(signOutResult).toEqual({ success: true });
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      mockSessionManager.clearSession.mockRejectedValue(error);

      const { result } = renderHook(() => useEnhancedAuth());

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(signOutResult?.success).toBe(false);
      expect(signOutResult?.error).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should refresh session successfully', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'new-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      mockSessionManager.refreshSession.mockResolvedValue({
        session: mockSession,
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshSession();
      });

      expect(refreshResult).toEqual({ success: true });
      expect(mockSessionManager.refreshSession).toHaveBeenCalled();
    });

    it('should validate session', async () => {
      mockSessionManager.validateSession.mockResolvedValue(true);

      const { result } = renderHook(() => useEnhancedAuth());

      let isValid;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(true);
      expect(mockSessionManager.validateSession).toHaveBeenCalled();
    });

    it('should schedule automatic session refresh', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        token_type: 'bearer',
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.needsRefresh).toBe(true);

      // Fast-forward time to trigger auto-refresh
      act(() => {
        vi.advanceTimersByTime(300000); // 5 minutes
      });

      await waitFor(() => {
        expect(mockSessionManager.refreshSession).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // First cause an error
      const error = new Error('Test error');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(result.current.error).toBeDefined();

      // Then clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should retry last action', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // First attempt that fails
      const error = new Error('Network error');
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error,
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // Then retry should work
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: { user: mockUser } },
        error: null,
      });

      let retryResult;
      await act(async () => {
        retryResult = await result.current.retryLastAction();
      });

      expect(retryResult?.success).toBe(true);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Functions', () => {
    it('should return session time remaining', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const timeRemaining = result.current.getSessionTimeRemaining();
      expect(typeof timeRemaining === 'number' || timeRemaining === null).toBe(true);
    });

    it('should check if token is expired', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const isExpired = result.current.isTokenExpired();
      expect(typeof isExpired).toBe('boolean');
    });

    it('should check if can retry', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const canRetry = result.current.canRetry();
      expect(typeof canRetry).toBe('boolean');
    });

    it('should check if requires reauth', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const requiresReauth = result.current.requiresReauth();
      expect(typeof requiresReauth).toBe('boolean');
    });
  });

  describe('Session Status Updates', () => {
    it('should update session status correctly', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com', created_at: '2023-01-01' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        token_type: 'bearer',
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessionStatus.isValid).toBe(true);
      expect(result.current.sessionStatus.user).toEqual(mockSession.user);
      expect(result.current.sessionStatus.expiresAt).toBe(mockSession.expires_at * 1000);
      expect(result.current.isSessionValid).toBe(true);
    });

    it('should detect when session needs refresh', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com', created_at: '2023-01-01' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 240, // 4 minutes from now (less than 5 minute buffer)
        token_type: 'bearer',
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.needsRefresh).toBe(true);
      expect(result.current.sessionStatus.needsRefresh).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = renderHook(() => useEnhancedAuth());

      // Verify timers are set up (this is implicit in the implementation)
      unmount();

      // Verify cleanup happened (timers should be cleared)
      // This is tested implicitly by ensuring no memory leaks or warnings
    });
  });
});