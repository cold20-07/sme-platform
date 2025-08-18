'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorToast } from '@/components/ui/error-display';

interface GlobalError {
  id: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
}

interface ErrorContextValue {
  errors: GlobalError[];
  addError: (error: Omit<GlobalError, 'id' | 'timestamp'>) => string;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
  autoRemoveDelay?: number;
}

export function ErrorProvider({ 
  children, 
  maxErrors = 5,
  autoRemoveDelay = 5000 
}: ErrorProviderProps) {
  const [errors, setErrors] = useState<GlobalError[]>([]);

  const addError = useCallback((errorData: Omit<GlobalError, 'id' | 'timestamp'>) => {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newError: GlobalError = {
      ...errorData,
      id,
      timestamp: new Date(),
    };

    setErrors(prev => {
      const updated = [newError, ...prev];
      // Keep only the most recent errors
      return updated.slice(0, maxErrors);
    });

    // Auto-remove error after delay
    if (autoRemoveDelay > 0) {
      setTimeout(() => {
        removeError(id);
      }, autoRemoveDelay);
    }

    return id;
  }, [maxErrors, autoRemoveDelay]);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: ErrorContextValue = {
    errors,
    addError,
    removeError,
    clearAllErrors,
    hasErrors: errors.length > 0,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {/* Render error toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {errors.map((error) => (
          <ErrorToast
            key={error.id}
            error={error}
            onDismiss={() => removeError(error.id)}
            onRetry={undefined} // Global errors typically don't have retry actions
          />
        ))}
      </div>
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}

// Convenience hooks for common error operations
export function useGlobalError() {
  const { addError } = useErrorContext();

  const showError = useCallback((message: string, code?: string, details?: any) => {
    return addError({
      message,
      code,
      details,
      type: 'error',
    });
  }, [addError]);

  const showWarning = useCallback((message: string, code?: string, details?: any) => {
    return addError({
      message,
      code,
      details,
      type: 'warning',
    });
  }, [addError]);

  const showInfo = useCallback((message: string, code?: string, details?: any) => {
    return addError({
      message,
      code,
      details,
      type: 'info',
    });
  }, [addError]);

  return {
    showError,
    showWarning,
    showInfo,
  };
}

// Error boundary integration
export function useErrorBoundaryHandler() {
  const { addError } = useErrorContext();

  return useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    addError({
      message: error.message,
      code: 'COMPONENT_ERROR',
      details: {
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
      },
      type: 'error',
    });
  }, [addError]);
}