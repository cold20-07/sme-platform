import { useCallback, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { 
  AuthenticationError, 
  SessionStatus, 
  standardizeAuthError, 
  sessionManager, 
  tokenManager, 
  authRecoveryManager,
  isAuthError,
  requiresReauth,
  canRetryAuth,
  isSessionExpired 
} from '@/lib/auth-error-handler';
import { useAPIErrorHandler } from './use-api-error-handler';

// Enhanced authentication state
interface EnhancedAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthenticationError | null;
  sessionStatus: SessionStatus;
  isAuthenticated: boolean;
  isSessionValid: boolean;
  needsRefresh: boolean;
}

// Authentication actions
interface AuthActions {
  signUp: (email: string, password: string, companyData?: any) => Promise<{ success: boolean; error?: AuthenticationError }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthenticationError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthenticationError }>;
  refreshSession: () => Promise<{ success: boolean; error?: AuthenticationError }>;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
  retryLastAction: () => Promise<{ success: boolean; error?: AuthenticationError }>;
}

// Hook return type
interface UseEnhancedAuthReturn extends EnhancedAuthState, AuthActions {
  // Additional utilities
  getSessionTimeRemaining: () => number | null;
  isTokenExpired: () => boolean;
  canRetry: () => boolean;
  requiresReauth: () => boolean;
}

// Last action tracking for retry functionality
interface LastAction {
  type: 'signUp' | 'signIn' | 'signOut' | 'refreshSession';
  args: any[];
  timestamp: number;
}

export function useEnhancedAuth(): UseEnhancedAuthReturn {
  // State management
  const [state, setState] = useState<EnhancedAuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    sessionStatus: {
      isValid: false,
      expiresAt: null,
      timeUntilExpiry: null,
      needsRefresh: false,
      user: null,
    },
    isAuthenticated: false,
    isSessionValid: false,
    needsRefresh: false,
  });
  
  // Refs for tracking
  const lastActionRef = useRef<LastAction | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { handleError } = useAPIErrorHandler();
  
  // Update session status
  const updateSessionStatus = useCallback((session: Session | null, user: User | null) => {
    if (!session || !user) {
      setState(prev => ({
        ...prev,
        sessionStatus: {
          isValid: false,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false,
          user: null,
        },
        isAuthenticated: false,
        isSessionValid: false,
        needsRefresh: false,
      }));
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const expiryTime = expiresAt ? expiresAt * 1000 : null;
    const timeUntilExpiry = expiryTime ? expiryTime - Date.now() : null;
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes
    const needsRefresh = timeUntilExpiry ? timeUntilExpiry < refreshBuffer : false;
    const isValid = expiresAt ? expiresAt > now : false;
    
    setState(prev => ({
      ...prev,
      sessionStatus: {
        isValid,
        expiresAt: expiryTime,
        timeUntilExpiry,
        needsRefresh,
        user,
      },
      isAuthenticated: isValid,
      isSessionValid: isValid,
      needsRefresh,
    }));
  }, []);
  
  // Schedule automatic session refresh
  const scheduleSessionRefresh = useCallback((session: Session | null) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    if (!session || !session.expires_at) {
      return;
    }
    
    const expiryTime = session.expires_at * 1000;
    const now = Date.now();
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
    const refreshTime = expiryTime - refreshBuffer;
    const timeUntilRefresh = refreshTime - now;
    
    if (timeUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        console.log('Auto-refreshing session...');
        await refreshSession();
      }, timeUntilRefresh);
    }
  }, []);
  
  // Schedule periodic session validation
  const scheduleSessionValidation = useCallback(() => {
    // Clear existing timer
    if (validationTimerRef.current) {
      clearInterval(validationTimerRef.current);
      validationTimerRef.current = null;
    }
    
    // Validate session every 30 seconds
    validationTimerRef.current = setInterval(async () => {
      const isValid = await sessionManager.validateSession();
      if (!isValid && state.isAuthenticated) {
        console.log('Session validation failed, refreshing...');
        await refreshSession();
      }
    }, 30000);
  }, [state.isAuthenticated]);
  
  // Handle authentication errors with recovery
  const handleAuthError = useCallback(async (error: any, actionType?: string): Promise<AuthenticationError> => {
    const authError = standardizeAuthError(error);
    
    // Log the error
    console.error(`Authentication error (${actionType}):`, authError);
    
    // Update state with error
    setState(prev => ({ ...prev, error: authError, loading: false }));
    
    // Handle error globally
    handleError(authError);
    
    // Attempt automatic recovery for certain errors
    if (authError.canRetry && !authError.requiresReauth) {
      try {
        const recoveryResult = await authRecoveryManager.attemptRecovery(authError);
        
        if (recoveryResult.success) {
          console.log(`Auto-recovery successful using strategy: ${recoveryResult.strategy}`);
          // Clear the error since recovery was successful
          setState(prev => ({ ...prev, error: null }));
        }
      } catch (recoveryError) {
        console.error('Auto-recovery failed:', recoveryError);
      }
    }
    
    return authError;
  }, [handleError]);
  
  // Sign up function
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    companyData?: any
  ): Promise<{ success: boolean; error?: AuthenticationError }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    lastActionRef.current = { type: 'signUp', args: [email, password, companyData], timestamp: Date.now() };
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        const authError = await handleAuthError(error, 'signUp');
        return { success: false, error: authError };
      }
      
      // Create company and user profile if user was created
      if (data.user && companyData) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .insert({
              name: companyData.name,
              gst_number: companyData.gst_number,
              pan_number: companyData.pan_number,
              industry: companyData.industry,
              legal_structure: companyData.legal_structure,
            })
            .select()
            .single();
          
          if (company) {
            await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                role: 'owner',
                company_id: company.id,
              });
            
            // Create initial wallet
            await supabase
              .from('wallets')
              .insert({
                company_id: company.id,
                balance: 0,
                currency: 'INR',
              });
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail the signup for profile creation errors
        }
      }
      
      setState(prev => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const authError = await handleAuthError(error, 'signUp');
      return { success: false, error: authError };
    }
  }, [handleAuthError]);
  
  // Sign in function
  const signIn = useCallback(async (
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: AuthenticationError }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    lastActionRef.current = { type: 'signIn', args: [email, password], timestamp: Date.now() };
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const authError = await handleAuthError(error, 'signIn');
        return { success: false, error: authError };
      }
      
      setState(prev => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const authError = await handleAuthError(error, 'signIn');
      return { success: false, error: authError };
    }
  }, [handleAuthError]);
  
  // Sign out function
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: AuthenticationError }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    lastActionRef.current = { type: 'signOut', args: [], timestamp: Date.now() };
    
    try {
      // Clear timers first
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (validationTimerRef.current) {
        clearInterval(validationTimerRef.current);
        validationTimerRef.current = null;
      }
      
      // Clear session using session manager for thorough cleanup
      await sessionManager.clearSession();
      
      setState(prev => ({ 
        ...prev, 
        loading: false,
        user: null,
        session: null,
        isAuthenticated: false,
        isSessionValid: false,
        needsRefresh: false,
        sessionStatus: {
          isValid: false,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false,
          user: null,
        }
      }));
      
      return { success: true };
    } catch (error) {
      const authError = await handleAuthError(error, 'signOut');
      return { success: false, error: authError };
    }
  }, [handleAuthError]);
  
  // Refresh session function
  const refreshSession = useCallback(async (): Promise<{ success: boolean; error?: AuthenticationError }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    lastActionRef.current = { type: 'refreshSession', args: [], timestamp: Date.now() };
    
    try {
      const result = await sessionManager.refreshSession();
      
      if (result.error) {
        await handleAuthError(result.error, 'refreshSession');
        return { success: false, error: result.error };
      }
      
      setState(prev => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const authError = await handleAuthError(error, 'refreshSession');
      return { success: false, error: authError };
    }
  }, [handleAuthError]);
  
  // Validate session function
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      return await sessionManager.validateSession();
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, []);
  
  // Clear error function
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  // Retry last action function
  const retryLastAction = useCallback(async (): Promise<{ success: boolean; error?: AuthenticationError }> => {
    if (!lastActionRef.current) {
      return { success: false, error: standardizeAuthError(new Error('No action to retry')) };
    }
    
    const { type, args } = lastActionRef.current;
    
    switch (type) {
      case 'signUp':
        return await signUp(...args);
      case 'signIn':
        return await signIn(...args);
      case 'signOut':
        return await signOut();
      case 'refreshSession':
        return await refreshSession();
      default:
        return { success: false, error: standardizeAuthError(new Error('Unknown action type')) };
    }
  }, [signUp, signIn, signOut, refreshSession]);
  
  // Utility functions
  const getSessionTimeRemaining = useCallback((): number | null => {
    return state.sessionStatus.timeUntilExpiry;
  }, [state.sessionStatus.timeUntilExpiry]);
  
  const isTokenExpired = useCallback((): boolean => {
    return !state.sessionStatus.isValid;
  }, [state.sessionStatus.isValid]);
  
  const canRetry = useCallback((): boolean => {
    return state.error ? canRetryAuth(state.error) : false;
  }, [state.error]);
  
  const requiresReauth = useCallback((): boolean => {
    return state.error ? requiresReauth(state.error) : false;
  }, [state.error]);
  
  // Initialize authentication state
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          await handleAuthError(error, 'initialize');
          return;
        }
        
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));
        
        updateSessionStatus(session, session?.user ?? null);
        
        if (session) {
          scheduleSessionRefresh(session);
          scheduleSessionValidation();
        }
      } catch (error) {
        if (mounted) {
          await handleAuthError(error, 'initialize');
        }
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, [handleAuthError, updateSessionStatus, scheduleSessionRefresh, scheduleSessionValidation]);
  
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));
        
        updateSessionStatus(session, session?.user ?? null);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            if (session) {
              scheduleSessionRefresh(session);
              scheduleSessionValidation();
            }
            break;
          case 'SIGNED_OUT':
            // Clear timers
            if (refreshTimerRef.current) {
              clearTimeout(refreshTimerRef.current);
              refreshTimerRef.current = null;
            }
            if (validationTimerRef.current) {
              clearInterval(validationTimerRef.current);
              validationTimerRef.current = null;
            }
            break;
          case 'TOKEN_REFRESHED':
            if (session) {
              scheduleSessionRefresh(session);
            }
            break;
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [updateSessionStatus, scheduleSessionRefresh, scheduleSessionValidation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (validationTimerRef.current) {
        clearInterval(validationTimerRef.current);
      }
    };
  }, []);
  
  return {
    // State
    ...state,
    
    // Actions
    signUp,
    signIn,
    signOut,
    refreshSession,
    validateSession,
    clearError,
    retryLastAction,
    
    // Utilities
    getSessionTimeRemaining,
    isTokenExpired,
    canRetry,
    requiresReauth,
  };
}