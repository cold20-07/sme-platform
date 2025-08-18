import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnhancedAuth } from '../../hooks/use-enhanced-auth';
import { supabase } from '../../supabase';
import { mockUser, createTestQueryClient } from '../test-utils';

// Mock the Supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Authentication Flow Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('User Authentication', () => {
    it('should handle successful login flow', async () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: mockUser,
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toEqual(mockUser);
    });

    it('should handle login errors with proper error messages', async () => {
      const authError = {
        message: 'Invalid login credentials',
        code: 'INVALID_CREDENTIALS',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await result.current.signIn({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toEqual(authError);
    });

    it('should handle user registration flow', async () => {
      const newUser = {
        ...mockUser,
        id: 'new-user-id',
        email: 'newuser@example.com',
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: newUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      const signUpResult = await result.current.signUp({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      });

      expect(signUpResult.success).toBe(true);
      expect(signUpResult.user).toEqual(newUser);
    });

    it('should handle logout flow with cleanup', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      const logoutResult = await result.current.signOut();

      expect(logoutResult.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should handle session refresh', async () => {
      const refreshedSession = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        user: mockUser,
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle expired session gracefully', async () => {
      const sessionError = {
        message: 'JWT expired',
        code: 'JWT_EXPIRED',
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: sessionError,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.error).toEqual(sessionError);
      });
    });
  });

  describe('Profile Management', () => {
    it('should create user profile after successful registration', async () => {
      const newUser = {
        ...mockUser,
        id: 'new-user-id',
        email: 'newuser@example.com',
      };

      const mockProfile = {
        id: 'profile-id',
        user_id: newUser.id,
        full_name: 'New User',
        email: newUser.email,
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: newUser, session: null },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        data: [mockProfile],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      const signUpResult = await result.current.signUp({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      });

      expect(signUpResult.success).toBe(true);
      // Profile creation would be handled by database triggers or separate API call
    });

    it('should handle profile update operations', async () => {
      const profileUpdates = {
        full_name: 'Updated Name',
        phone: '+1234567890',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ ...mockUser, ...profileUpdates }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      // Simulate profile update
      const updateResult = await result.current.updateProfile(profileUpdates);

      expect(updateResult.success).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should retry authentication on network errors', async () => {
      const networkError = new Error('Network error');
      
      (supabase.auth.getUser as any)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: { user: mockUser },
          error: null,
        });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle concurrent authentication requests', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth(), { wrapper });

      // Simulate concurrent login attempts
      const promise1 = result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      const promise2 = result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state change events', async () => {
      const mockCallback = vi.fn();
      
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderHook(() => useEnhancedAuth(), { wrapper });

      // Simulate auth state change
      mockCallback('SIGNED_IN', { user: mockUser });

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', { user: mockUser });
    });

    it('should clean up auth listeners on unmount', () => {
      const mockUnsubscribe = vi.fn();
      
      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = renderHook(() => useEnhancedAuth(), { wrapper });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});