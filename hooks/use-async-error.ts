import { useCallback, useState } from 'react';
import { standardizeError, APIError } from '@/lib/api-error-handler';

interface AsyncError {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

interface UseAsyncErrorReturn {
  error: APIError | null;
  setError: (error: APIError | null) => void;
  clearError: () => void;
  handleAsyncError: (error: unknown) => void;
  isError: boolean;
}

/**
 * Hook for handling async errors in components
 * Provides error state management and error formatting
 */
export function useAsyncError(): UseAsyncErrorReturn {
  const [error, setError] = useState<APIError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncError = useCallback((error: unknown) => {
    // Use the standardized error handler
    const standardizedError = standardizeError(error);

    // Log error for debugging
    console.error('Async error caught:', standardizedError);

    setError(standardizedError);
  }, []);

  return {
    error,
    setError,
    clearError,
    handleAsyncError,
    isError: error !== null,
  };
}

/**
 * Hook for wrapping async operations with error handling
 */
export function useAsyncOperation() {
  const { error, setError, clearError, handleAsyncError } = useAsyncError();
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: APIError) => void
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      
      const result = await operation();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      handleAsyncError(err);
      
      if (onError && error) {
        onError(error);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, handleAsyncError, error]);

  return {
    execute,
    loading,
    error,
    clearError,
    isError: error !== null,
  };
}