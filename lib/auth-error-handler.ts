import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { APIError, standardizeError } from './api-error-handler';

// Authentication error types
export interface AuthenticationError extends APIError {
  authCode: string;
  requiresReauth: boolean;
  canRetry: boolean;
  sessionExpired: boolean;
}

// Session management interface
export interface SessionManager {
  refreshSession: () => Promise<{ session: Session | null; error: AuthenticationError | null }>;
  validateSession: () => Promise<boolean>;
  clearSession: () => Promise<void>;
  getSessionStatus: () => SessionStatus;
}

// Session status interface
export interface SessionStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
  needsRefresh: boolean;
  user: User | null;
}

// Token management interface
export interface TokenManager {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  isTokenExpired: (token?: string) => boolean;
  getTokenExpiryTime: (token?: string) => number | null;
  scheduleTokenRefresh: () => void;
  clearTokenRefreshTimer: () => void;
}

// Authentication error codes mapping
const AUTH_ERROR_CODES = {
  // Session errors
  'invalid_token': {
    message: 'Your session is invalid. Please log in again.',
    requiresReauth: true,
    canRetry: false,
    sessionExpired: true,
  },
  'expired_token': {
    message: 'Your session has expired. Please log in again.',
    requiresReauth: true,
    canRetry: true,
    sessionExpired: true,
  },
  'refresh_token_not_found': {
    message: 'Session refresh failed. Please log in again.',
    requiresReauth: true,
    canRetry: false,
    sessionExpired: true,
  },
  'invalid_refresh_token': {
    message: 'Session refresh failed. Please log in again.',
    requiresReauth: true,
    canRetry: false,
    sessionExpired: true,
  },
  
  // Authentication errors
  'invalid_credentials': {
    message: 'Invalid email or password. Please try again.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  'email_not_confirmed': {
    message: 'Please check your email and click the confirmation link.',
    requiresReauth: false,
    canRetry: false,
    sessionExpired: false,
  },
  'too_many_requests': {
    message: 'Too many login attempts. Please wait a moment and try again.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  'weak_password': {
    message: 'Password is too weak. Please choose a stronger password.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  'signup_disabled': {
    message: 'New registrations are currently disabled.',
    requiresReauth: false,
    canRetry: false,
    sessionExpired: false,
  },
  'email_address_invalid': {
    message: 'Please enter a valid email address.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  'user_not_found': {
    message: 'No account found with this email address.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  
  // Network and server errors
  'network_error': {
    message: 'Network error. Please check your connection and try again.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  'server_error': {
    message: 'Server error. Please try again later.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
  
  // Default fallback
  'unknown_error': {
    message: 'An unexpected error occurred. Please try again.',
    requiresReauth: false,
    canRetry: true,
    sessionExpired: false,
  },
} as const;

// Convert Supabase AuthError to AuthenticationError
export function standardizeAuthError(error: AuthError | Error | any): AuthenticationError {
  let authCode = 'unknown_error';
  let message = 'An unexpected error occurred';
  
  // Handle Supabase AuthError
  if (error && typeof error === 'object') {
    if ('message' in error) {
      message = error.message;
    }
    
    // Map common error messages to codes
    if (message.includes('Invalid login credentials')) {
      authCode = 'invalid_credentials';
    } else if (message.includes('Email not confirmed')) {
      authCode = 'email_not_confirmed';
    } else if (message.includes('Too many requests')) {
      authCode = 'too_many_requests';
    } else if (message.includes('Invalid token') || message.includes('JWT')) {
      authCode = 'invalid_token';
    } else if (message.includes('expired')) {
      authCode = 'expired_token';
    } else if (message.includes('refresh_token_not_found')) {
      authCode = 'refresh_token_not_found';
    } else if (message.includes('invalid_refresh_token')) {
      authCode = 'invalid_refresh_token';
    } else if (message.includes('weak password')) {
      authCode = 'weak_password';
    } else if (message.includes('signup_disabled')) {
      authCode = 'signup_disabled';
    } else if (message.includes('invalid email')) {
      authCode = 'email_address_invalid';
    } else if (message.includes('User not found')) {
      authCode = 'user_not_found';
    } else if (message.includes('fetch') || message.includes('network')) {
      authCode = 'network_error';
    } else if (message.includes('500') || message.includes('server')) {
      authCode = 'server_error';
    }
  }
  
  const errorConfig = AUTH_ERROR_CODES[authCode as keyof typeof AUTH_ERROR_CODES] || AUTH_ERROR_CODES.unknown_error;
  const baseError = standardizeError(error);
  
  return {
    ...baseError,
    authCode,
    message: errorConfig.message,
    userMessage: errorConfig.message,
    requiresReauth: errorConfig.requiresReauth,
    canRetry: errorConfig.canRetry,
    sessionExpired: errorConfig.sessionExpired,
    category: 'auth',
    severity: errorConfig.requiresReauth ? 'high' : 'medium',
    retryable: errorConfig.canRetry,
  };
}

// Session Manager Implementation
class SessionManagerImpl implements SessionManager {
  private refreshPromise: Promise<{ session: Session | null; error: AuthenticationError | null }> | null = null;
  private lastRefreshAttempt = 0;
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refresh attempts
  
  async refreshSession(): Promise<{ session: Session | null; error: AuthenticationError | null }> {
    const now = Date.now();
    
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Rate limit refresh attempts
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
      return {
        session: null,
        error: standardizeAuthError(new Error('Refresh rate limited')),
      };
    }
    
    this.lastRefreshAttempt = now;
    
    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async performRefresh(): Promise<{ session: Session | null; error: AuthenticationError | null }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return {
          session: null,
          error: standardizeAuthError(error),
        };
      }
      
      return {
        session: data.session,
        error: null,
      };
    } catch (error) {
      return {
        session: null,
        error: standardizeAuthError(error),
      };
    }
  }
  
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const expiresAt = session.expires_at;
      if (!expiresAt) {
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const expiryBuffer = 5 * 60; // 5 minutes
      
      return expiresAt > (now + expiryBuffer);
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
  
  async clearSession(): Promise<void> {
    try {
      // Clear any pending refresh
      this.refreshPromise = null;
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any local storage items related to auth
      if (typeof window !== 'undefined') {
        // Clear Supabase auth storage
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Clear any custom auth storage
        localStorage.removeItem('auth-user');
        localStorage.removeItem('auth-session');
        
        // Clear dev auth storage if present
        localStorage.removeItem('dev-auth');
      }
    } catch (error) {
      console.error('Error clearing session:', error);
      // Even if there's an error, we should clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('auth-user');
        localStorage.removeItem('auth-session');
        localStorage.removeItem('dev-auth');
      }
    }
  }
  
  getSessionStatus(): SessionStatus {
    try {
      // This is synchronous, so we need to get the session from the client state
      const session = supabase.auth.getSession();
      
      // Since getSession() is async, we'll use a different approach
      // We'll check the current user which is synchronous
      const user = supabase.auth.getUser();
      
      // For now, return a basic status - this will be enhanced by the hook
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false,
        user: null,
      };
    } catch (error) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false,
        user: null,
      };
    }
  }
}

// Token Manager Implementation
class TokenManagerImpl implements TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
  
  getAccessToken(): string | null {
    try {
      // Get from current session
      const session = supabase.auth.getSession();
      // This is async, so we need a different approach
      // For now, return null and let the hook handle this
      return null;
    } catch (error) {
      return null;
    }
  }
  
  getRefreshToken(): string | null {
    try {
      // Similar issue as above - this needs to be handled by the hook
      return null;
    } catch (error) {
      return null;
    }
  }
  
  isTokenExpired(token?: string): boolean {
    if (!token) {
      return true;
    }
    
    try {
      // Decode JWT token to check expiry
      const tokenPart = token.split('.')[1];
      if (!tokenPart) return true;
      const payload = JSON.parse(atob(tokenPart));
      const now = Math.floor(Date.now() / 1000);
      
      return payload.exp <= now;
    } catch (error) {
      return true;
    }
  }
  
  getTokenExpiryTime(token?: string): number | null {
    if (!token) {
      return null;
    }
    
    try {
      const tokenPart = token.split('.')[1];
      if (!tokenPart) return null;
      const payload = JSON.parse(atob(tokenPart));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  }
  
  scheduleTokenRefresh(): void {
    this.clearTokenRefreshTimer();
    
    // This will be implemented in the hook where we have access to the session
  }
  
  clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Authentication Recovery Strategies
export interface AuthRecoveryStrategy {
  name: string;
  canRecover: (error: AuthenticationError) => boolean;
  recover: () => Promise<{ success: boolean; error?: AuthenticationError }>;
}

// Automatic session refresh recovery
export const sessionRefreshRecovery: AuthRecoveryStrategy = {
  name: 'session_refresh',
  canRecover: (error) => error.authCode === 'expired_token' && error.canRetry,
  recover: async () => {
    try {
      const sessionManager = new SessionManagerImpl();
      const result = await sessionManager.refreshSession();
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: standardizeAuthError(error) 
      };
    }
  },
};

// Re-authentication recovery
export const reauthRecovery: AuthRecoveryStrategy = {
  name: 'reauth',
  canRecover: (error) => error.requiresReauth,
  recover: async () => {
    // This will redirect to login - implementation depends on routing
    if (typeof window !== 'undefined') {
      // Clear session first
      const sessionManager = new SessionManagerImpl();
      await sessionManager.clearSession();
      // Redirect to login
      window.location.href = '/auth/login';
      return { success: true };
    }
    // SSR fallback: do nothing
    return { success: false };
  },
};

// Network retry recovery
export const networkRetryRecovery: AuthRecoveryStrategy = {
  name: 'network_retry',
  canRecover: (error) => error.authCode === 'network_error' && error.canRetry,
  recover: async () => {
    // Wait a bit and then indicate that retry is possible
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true };
  },
};

// Authentication Recovery Manager
export class AuthRecoveryManager {
  private strategies: AuthRecoveryStrategy[] = [
    sessionRefreshRecovery,
    networkRetryRecovery,
    reauthRecovery, // This should be last as it's the most disruptive
  ];
  
  async attemptRecovery(error: AuthenticationError): Promise<{ 
    success: boolean; 
    strategy?: string; 
    error?: AuthenticationError 
  }> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const result = await strategy.recover();
          
          if (result.success) {
            return { 
              success: true, 
              strategy: strategy.name 
            };
          } else {
            return { 
              success: false, 
              strategy: strategy.name, 
              error: result.error 
            };
          }
        } catch (recoveryError) {
          console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
          continue;
        }
      }
    }
    
    return { 
      success: false, 
      error: standardizeAuthError(new Error('No recovery strategy available')) 
    };
  }
  
  addStrategy(strategy: AuthRecoveryStrategy): void {
    this.strategies.unshift(strategy); // Add to beginning for priority
  }
  
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }
}

// Create singleton instances
export const sessionManager = new SessionManagerImpl();
export const tokenManager = new TokenManagerImpl();
export const authRecoveryManager = new AuthRecoveryManager();

// Utility functions
export function isAuthError(error: any): error is AuthenticationError {
  return error && typeof error === 'object' && 'authCode' in error;
}

export function requiresReauth(error: any): boolean {
  return isAuthError(error) && error.requiresReauth;
}

export function canRetryAuth(error: any): boolean {
  return isAuthError(error) && error.canRetry;
}

export function isSessionExpired(error: any): boolean {
  return isAuthError(error) && error.sessionExpired;
}

// Export types
// Removed duplicate export of AuthRecoveryStrategy