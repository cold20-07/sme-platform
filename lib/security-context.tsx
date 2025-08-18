/**
 * Security context provider for React components
 * Manages CSRF tokens and security state
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCSRFToken } from './security-middleware';

interface SecurityContextType {
  csrfToken: string | null;
  isSecureContext: boolean;
  refreshCSRFToken: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' 
    ? window.isSecureContext 
    : false;

  const refreshCSRFToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getCSRFToken();
      setCSRFToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get CSRF token');
      console.error('Error refreshing CSRF token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCSRFToken();
  }, []);

  const value: SecurityContextType = {
    csrfToken,
    isSecureContext,
    refreshCSRFToken,
    isLoading,
    error,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityContext(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
}

/**
 * Hook for secure form submissions with CSRF protection
 */
export function useSecureForm() {
  const { csrfToken, refreshCSRFToken } = useSecurityContext();

  const submitSecurely = async (
    url: string,
    data: any,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!csrfToken) {
      await refreshCSRFToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      method: options.method || 'POST',
      headers,
      body: JSON.stringify(data),
    });
  };

  return { submitSecurely, csrfToken };
}

/**
 * Higher-order component to wrap components with security context
 */
export function withSecurity<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function SecurityWrappedComponent(props: P) {
    return (
      <SecurityProvider>
        <Component {...props} />
      </SecurityProvider>
    );
  };
}