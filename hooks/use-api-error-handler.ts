import { useCallback, useEffect, useState } from 'react';
import { 
  APIError, 
  APIResponse, 
  globalErrorHandler, 
  withErrorHandling,
  CircuitBreaker,
  RetryConfig 
} from '@/lib/api-error-handler';
import { useErrorContext } from '@/lib/error-context';

// Hook for handling API errors with automatic retry
export function useAPIErrorHandler() {
  const { addError } = useErrorContext();
  const [errorHistory, setErrorHistory] = useState<APIError[]>([]);
  
  // Handle API error and show user-friendly message
  const handleError = useCallback((error: APIError) => {
    // Add to global error context for display
    addError({
      message: error.userMessage,
      code: error.code,
      details: error.details,
      type: error.severity === 'critical' ? 'error' : 
            error.severity === 'high' ? 'error' : 
            error.severity === 'medium' ? 'warning' : 'info',
    });
    
    // Update local error history
    setErrorHistory(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
  }, [addError]);
  
  // Register global error handler
  useEffect(() => {
    const unsubscribe = globalErrorHandler.onError(handleError);
    return unsubscribe;
  }, [handleError]);
  
  // Clear error history
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);
  
  // Get error statistics
  const getErrorStats = useCallback(() => {
    return globalErrorHandler.getErrorStats();
  }, []);
  
  return {
    errorHistory,
    clearErrorHistory,
    getErrorStats,
    handleError,
  };
}

// Hook for wrapping API calls with error handling and retry logic
export function useAPICall<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  options: {
    retryConfig?: Partial<RetryConfig>;
    enableCircuitBreaker?: boolean;
    circuitBreakerOptions?: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    };
    onError?: (error: APIError) => void;
    onRetry?: (error: APIError, attempt: number) => void;
    onSuccess?: (data: R) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const [data, setData] = useState<R | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Create circuit breaker if enabled
  const [circuitBreaker] = useState(() => {
    if (options.enableCircuitBreaker) {
      return new CircuitBreaker(options.circuitBreakerOptions);
    }
    return undefined;
  });
  
  // Wrap the API function with error handling
  const wrappedFunction = useCallback(
    withErrorHandling(apiFunction, {
      retryConfig: options.retryConfig,
      circuitBreaker,
      onError: (error) => {
        setError(error);
        if (options.onError) {
          options.onError(error);
        }
      },
      onRetry: (error, attempt) => {
        setRetryCount(attempt + 1);
        if (options.onRetry) {
          options.onRetry(error, attempt);
        }
      },
    }),
    [apiFunction, options.retryConfig, circuitBreaker, options.onError, options.onRetry]
  );
  
  // Execute the API call
  const execute = useCallback(async (...args: T): Promise<APIResponse<R>> => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    
    try {
      const result = await wrappedFunction(...args);
      
      if (result.success && result.data) {
        setData(result.data);
        if (options.onSuccess) {
          options.onSuccess(result.data);
        }
      } else if (result.error) {
        setError(result.error);
      }
      
      setRetryCount(result.metadata?.retryCount || 0);
      return result;
    } finally {
      setLoading(false);
    }
  }, [wrappedFunction, options.onSuccess]);
  
  // Reset state
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    setRetryCount(0);
  }, []);
  
  // Get circuit breaker state if available
  const getCircuitBreakerState = useCallback(() => {
    return circuitBreaker?.getState();
  }, [circuitBreaker]);
  
  return {
    execute,
    loading,
    error,
    data,
    retryCount,
    reset,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    getCircuitBreakerState,
  };
}

// Hook for automatic API calls with error handling
export function useAutoAPICall<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  args: T,
  options: {
    enabled?: boolean;
    retryConfig?: Partial<RetryConfig>;
    enableCircuitBreaker?: boolean;
    circuitBreakerOptions?: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    };
    onError?: (error: APIError) => void;
    onRetry?: (error: APIError, attempt: number) => void;
    onSuccess?: (data: R) => void;
    dependencies?: any[];
  } = {}
) {
  const { enabled = true, dependencies = [] } = options;
  const apiCall = useAPICall(apiFunction, options);
  
  // Auto-execute when dependencies change
  useEffect(() => {
    if (enabled) {
      apiCall.execute(...args);
    }
  }, [enabled, ...dependencies, ...args]);
  
  return apiCall;
}

// Hook for batch API calls with error handling
export function useBatchAPICall<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  options: {
    retryConfig?: Partial<RetryConfig>;
    enableCircuitBreaker?: boolean;
    maxConcurrent?: number;
    onError?: (error: APIError, index: number) => void;
    onRetry?: (error: APIError, attempt: number, index: number) => void;
    onSuccess?: (data: R, index: number) => void;
    onComplete?: (results: APIResponse<R>[]) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<APIResponse<R>[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const { maxConcurrent = 5 } = options;
  
  // Execute batch of API calls
  const executeBatch = useCallback(async (argsList: T[]): Promise<APIResponse<R>[]> => {
    setLoading(true);
    setResults([]);
    setProgress({ completed: 0, total: argsList.length });
    
    const results: APIResponse<R>[] = [];
    
    // Process in batches to limit concurrency
    for (let i = 0; i < argsList.length; i += maxConcurrent) {
      const batch = argsList.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (args, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        const wrappedFunction = withErrorHandling(apiFunction, {
          retryConfig: options.retryConfig,
          onError: (error) => {
            if (options.onError) {
              options.onError(error, globalIndex);
            }
          },
          onRetry: (error, attempt) => {
            if (options.onRetry) {
              options.onRetry(error, attempt, globalIndex);
            }
          },
        });
        
        const result = await wrappedFunction(...args);
        
        if (result.success && result.data && options.onSuccess) {
          options.onSuccess(result.data, globalIndex);
        }
        
        // Update progress
        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Update results state
      setResults([...results]);
    }
    
    setLoading(false);
    
    if (options.onComplete) {
      options.onComplete(results);
    }
    
    return results;
  }, [apiFunction, maxConcurrent, options]);
  
  // Get batch statistics
  const getStats = useCallback(() => {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalRetries = results.reduce((sum, r) => sum + (r.metadata?.retryCount || 0), 0);
    
    return {
      total: results.length,
      successful,
      failed,
      successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
      totalRetries,
      averageRetries: results.length > 0 ? totalRetries / results.length : 0,
    };
  }, [results]);
  
  return {
    executeBatch,
    loading,
    results,
    progress,
    getStats,
  };
}

// Hook for monitoring API health
export function useAPIHealthMonitor(
  healthCheckFunction: () => Promise<{ isHealthy: boolean; latency: number; error?: string }>,
  options: {
    interval?: number;
    enabled?: boolean;
    onHealthChange?: (isHealthy: boolean) => void;
  } = {}
) {
  const { interval = 60000, enabled = true } = options; // Default 1 minute
  const [health, setHealth] = useState<{
    isHealthy: boolean;
    latency: number;
    error?: string;
    lastCheck: Date;
  } | null>(null);
  
  const [history, setHistory] = useState<Array<{
    timestamp: Date;
    isHealthy: boolean;
    latency: number;
    error?: string;
  }>>([]);
  
  // Perform health check
  const performHealthCheck = useCallback(async () => {
    try {
      const result = await healthCheckFunction();
      const newHealth = {
        ...result,
        lastCheck: new Date(),
      };
      
      setHealth(prevHealth => {
        // Call health change callback if status changed
        if (prevHealth && prevHealth.isHealthy !== result.isHealthy && options.onHealthChange) {
          options.onHealthChange(result.isHealthy);
        }
        return newHealth;
      });
      
      // Add to history (keep last 100 checks)
      setHistory(prev => [
        { timestamp: new Date(), ...result },
        ...prev.slice(0, 99)
      ]);
      
    } catch (error) {
      const errorHealth = {
        isHealthy: false,
        latency: 0,
        error: (error as Error).message,
        lastCheck: new Date(),
      };
      
      setHealth(errorHealth);
      setHistory(prev => [
        { timestamp: new Date(), ...errorHealth },
        ...prev.slice(0, 99)
      ]);
    }
  }, [healthCheckFunction, options.onHealthChange]);
  
  // Set up periodic health checks
  useEffect(() => {
    if (!enabled) return;
    
    // Perform initial check
    performHealthCheck();
    
    // Set up interval
    const intervalId = setInterval(performHealthCheck, interval);
    
    return () => clearInterval(intervalId);
  }, [enabled, interval, performHealthCheck]);
  
  // Get health statistics
  const getHealthStats = useCallback(() => {
    if (history.length === 0) return null;
    
    const recentHistory = history.slice(0, 10); // Last 10 checks
    const healthyCount = recentHistory.filter(h => h.isHealthy).length;
    const averageLatency = recentHistory.reduce((sum, h) => sum + h.latency, 0) / recentHistory.length;
    
    return {
      uptime: (healthyCount / recentHistory.length) * 100,
      averageLatency,
      totalChecks: history.length,
      recentHealthy: healthyCount,
      recentTotal: recentHistory.length,
    };
  }, [history]);
  
  return {
    health,
    history: history.slice(0, 20), // Return last 20 checks
    performHealthCheck,
    getHealthStats,
  };
}

// Hook for error recovery strategies
export function useErrorRecovery() {
  const [recoveryAttempts, setRecoveryAttempts] = useState<Record<string, number>>({});
  
  // Attempt to recover from an error
  const attemptRecovery = useCallback(async (
    errorCode: string,
    recoveryFunction: () => Promise<void>,
    maxAttempts: number = 3
  ): Promise<boolean> => {
    const currentAttempts = recoveryAttempts[errorCode] || 0;
    
    if (currentAttempts >= maxAttempts) {
      return false;
    }
    
    try {
      await recoveryFunction();
      
      // Reset attempts on successful recovery
      setRecoveryAttempts(prev => ({
        ...prev,
        [errorCode]: 0,
      }));
      
      return true;
    } catch (error) {
      // Increment attempts on failure
      setRecoveryAttempts(prev => ({
        ...prev,
        [errorCode]: currentAttempts + 1,
      }));
      
      return false;
    }
  }, [recoveryAttempts]);
  
  // Reset recovery attempts for a specific error
  const resetRecoveryAttempts = useCallback((errorCode: string) => {
    setRecoveryAttempts(prev => ({
      ...prev,
      [errorCode]: 0,
    }));
  }, []);
  
  // Get recovery attempt count
  const getRecoveryAttempts = useCallback((errorCode: string): number => {
    return recoveryAttempts[errorCode] || 0;
  }, [recoveryAttempts]);
  
  return {
    attemptRecovery,
    resetRecoveryAttempts,
    getRecoveryAttempts,
    recoveryAttempts,
  };
}