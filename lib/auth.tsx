'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth';
import { AuthenticationError } from './auth-error-handler';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthenticationError | null;
  isAuthenticated: boolean;
  isSessionValid: boolean;
  needsRefresh: boolean;
  signUp: (email: string, password: string, companyData: any) => Promise<{ success: boolean; error?: AuthenticationError }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthenticationError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthenticationError }>;
  refreshSession: () => Promise<{ success: boolean; error?: AuthenticationError }>;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
  retryLastAction: () => Promise<{ success: boolean; error?: AuthenticationError }>;
  getSessionTimeRemaining: () => number | null;
  canRetry: () => boolean;
  requiresReauth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const enhancedAuth = useEnhancedAuth();

  // Legacy signUp wrapper for backward compatibility
  const legacySignUp = async (email: string, password: string, companyData: any) => {
    const result = await enhancedAuth.signUp(email, password, companyData);
    if (!result.success && result.error) {
      throw result.error;
    }
    return { user: enhancedAuth.user, session: enhancedAuth.session };
  };

  // Legacy signIn wrapper for backward compatibility
  const legacySignIn = async (email: string, password: string) => {
    const result = await enhancedAuth.signIn(email, password);
    if (!result.success && result.error) {
      throw result.error;
    }
    return { user: enhancedAuth.user, session: enhancedAuth.session };
  };

  // Legacy signOut wrapper for backward compatibility
  const legacySignOut = async () => {
    const result = await enhancedAuth.signOut();
    if (!result.success && result.error) {
      throw result.error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // Enhanced auth state
        user: enhancedAuth.user,
        session: enhancedAuth.session,
        loading: enhancedAuth.loading,
        error: enhancedAuth.error,
        isAuthenticated: enhancedAuth.isAuthenticated,
        isSessionValid: enhancedAuth.isSessionValid,
        needsRefresh: enhancedAuth.needsRefresh,
        
        // Enhanced auth actions
        signUp: enhancedAuth.signUp,
        signIn: enhancedAuth.signIn,
        signOut: enhancedAuth.signOut,
        refreshSession: enhancedAuth.refreshSession,
        validateSession: enhancedAuth.validateSession,
        clearError: enhancedAuth.clearError,
        retryLastAction: enhancedAuth.retryLastAction,
        
        // Utility functions
        getSessionTimeRemaining: enhancedAuth.getSessionTimeRemaining,
        canRetry: enhancedAuth.canRetry,
        requiresReauth: enhancedAuth.requiresReauth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe default instead of throwing
    return {
      user: null,
      loading: true,
      signIn: () => {},
      signOut: () => {},
      // ...add other default no-op methods as needed
    };
  }
  return context;
}

// Legacy auth provider for backward compatibility
export function LegacyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, companyData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create company and user profile
    if (data.user) {
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
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error: null,
        isAuthenticated: !!user,
        isSessionValid: !!session,
        needsRefresh: false,
        signUp: async (email, password, companyData) => {
          try {
            await signUp(email, password, companyData);
            return { success: true };
          } catch (error: any) {
            return { success: false, error };
          }
        },
        signIn: async (email, password) => {
          try {
            await signIn(email, password);
            return { success: true };
          } catch (error: any) {
            return { success: false, error };
          }
        },
        signOut: async () => {
          try {
            await signOut();
            return { success: true };
          } catch (error: any) {
            return { success: false, error };
          }
        },
        refreshSession: async () => ({ success: true }),
        validateSession: async () => !!session,
        clearError: () => {},
        retryLastAction: async () => ({ success: true }),
        getSessionTimeRemaining: () => null,
        canRetry: () => false,
        requiresReauth: () => false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}