import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  standardizeError,
  retryWithBackoff,
  smartRetry,
  CircuitBreaker,
  GlobalAPIErrorHandler,
  withErrorHandling,
  APIError,
  DEFAULT_RETRY_CONFIG,
} from '../api-error-handler';

describe('API Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('standardizeError', () => {
    it('should standardize a basic Error object', () => {
      const error = new Error('Test error');
      const result = standardizeError(error);

      expect(result).toMatchObject({
        code: 'GENERIC_ERROR',
        message: 'Test error',
        userMessage: 'An unexpected error occurred. Please try again.',
        retryable: false,
        severity: 'low',
        category: 'unknown',
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle network errors correctly', () => {
      const error = new Error('Failed to fetch');
      const result = standardizeError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.category).toBe('network');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe('Unable to connect to the server. Please check your internet connection and try again.');
    });

    it('should handle timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const result = standardizeError(error);

      expect(result.code).toBe('TIMEOUT');
      expect(result.category).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('should handle Supabase errors correctly', () => {
      const error = {
        message: 'Row not found',
        code: 'PGRST116',
        details: 'No rows found',
        hint: 'Check your query',
      };
      const result = standardizeError(error);

      expect(result.code).toBe('PGRST116');
      expect(result.userMessage).toBe('The requested data was not found.');
      expect(result.retryable).toBe(false);
    });

    it('should handle string errors', () => {
      const result = standardizeError('Simple error message');

      expect(result.code).toBe('STRING_ERROR');
      expect(result.message).toBe('Simple error message');
    });

    it('should categorize errors correctly', () => {
      const authError = standardizeError(new Error('Unauthorized access'));
      expect(authError.category).toBe('auth');

      const validationError = standardizeError(new Error('Invalid input format'));
      expect(validationError.category).toBe('validation');

      const serverError = standardizeError(new Error('Internal server error'));
      expect(serverError.category).toBe('server');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.error).toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const resultPromise = retryWithBackoff(mockOperation, {
        maxRetries: 3,
        baseDelay: 100,
      });

      // Fast-forward timers for delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).code = 'UNAUTHORIZED';
      const mockOperation = vi.fn().mockRejectedValue(authError);

      const result = await retryWithBackoff(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));

      const resultPromise = retryWithBackoff(mockOperation, {
        maxRetries: 2,
        baseDelay: 10,
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('smartRetry', () => {
    it('should use custom retry logic', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Custom error'));
      const customRetryLogic = vi.fn().mockReturnValue(false); // Don't retry

      const result = await smartRetry(mockOperation, {
        customRetryLogic,
        maxRetries: 3,
      });

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(customRetryLogic).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Custom error' }),
        0
      );
    });

    it('should call retry callback', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      const resultPromise = smartRetry(mockOperation, {
        maxRetries: 2,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network error' }),
        0
      );
    });

    it('should adapt delay based on error category', async () => {
      const networkError = new Error('Network timeout');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const resultPromise = smartRetry(mockOperation, { maxRetries: 1 });
      await vi.runAllTimersAsync();
      await resultPromise;

      // Network errors should have faster retry (delay * 0.5)
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow execution when closed', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      const mockOperation = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(circuitBreaker.getState().state).toBe('closed');
    });

    it('should open after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      const mockOperation = vi.fn().mockRejectedValue(new Error('Server error'));

      // Trigger failures to reach threshold
      await circuitBreaker.execute(mockOperation);
      await circuitBreaker.execute(mockOperation);

      expect(circuitBreaker.getState().state).toBe('open');
      expect(circuitBreaker.getState().failures).toBe(2);
    });

    it('should reject execution when open', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      const mockOperation = vi.fn().mockRejectedValue(new Error('Server error'));

      // Trigger failure to open circuit
      await circuitBreaker.execute(mockOperation);

      // Next execution should be rejected
      const result = await circuitBreaker.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Circuit breaker is open');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should transition to half-open after reset timeout', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValue('success');

      // Open the circuit
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState().state).toBe('open');

      // Fast-forward past reset timeout
      vi.advanceTimersByTime(1001);

      // Should allow execution again (half-open)
      const result = await circuitBreaker.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(circuitBreaker.getState().state).toBe('closed');
    });
  });

  describe('GlobalAPIErrorHandler', () => {
    let errorHandler: GlobalAPIErrorHandler;

    beforeEach(() => {
      errorHandler = new GlobalAPIErrorHandler();
    });

    it('should handle errors and notify callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = errorHandler.onError(callback);

      const error = new Error('Test error');
      const result = errorHandler.handleError(error);

      expect(callback).toHaveBeenCalledWith(result);
      expect(result).toMatchObject({
        message: 'Test error',
        code: 'GENERIC_ERROR',
      });

      unsubscribe();
    });

    it('should maintain error history', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler.handleError(error1);
      errorHandler.handleError(error2);

      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 2'); // Most recent first
      expect(history[1].message).toBe('Error 1');
    });

    it('should generate error statistics', () => {
      const networkError = new Error('Network error');
      const authError = new Error('Unauthorized');
      (authError as any).code = 'UNAUTHORIZED';

      errorHandler.handleError(networkError);
      errorHandler.handleError(authError);

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(2);
      expect(stats.byCategory.network).toBe(1);
      expect(stats.byCategory.auth).toBe(1);
    });

    it('should clear error history', () => {
      errorHandler.handleError(new Error('Test error'));
      expect(errorHandler.getErrorHistory()).toHaveLength(1);

      errorHandler.clearHistory();
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap function with error handling', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling(mockFn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle errors in wrapped function', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
      const onError = vi.fn();
      const wrappedFn = withErrorHandling(mockFn, { onError });

      const result = await wrappedFn();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test error');
      expect(onError).toHaveBeenCalled();
    });

    it('should use circuit breaker when provided', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      const mockFn = vi.fn().mockRejectedValue(new Error('Server error'));
      const wrappedFn = withErrorHandling(mockFn, { circuitBreaker });

      // First call should fail and open circuit
      await wrappedFn();
      
      // Second call should be rejected by circuit breaker
      const result = await wrappedFn();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Circuit breaker is open');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error categorization and severity', () => {
    it('should categorize network errors correctly', () => {
      const errors = [
        'Failed to fetch',
        'Network timeout',
        'Connection refused',
        'Request timeout',
      ];

      errors.forEach(errorMessage => {
        const result = standardizeError(new Error(errorMessage));
        expect(result.category).toBe('network');
        expect(result.retryable).toBe(true);
      });
    });

    it('should categorize auth errors correctly', () => {
      const errors = [
        { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { message: 'Forbidden', code: 'FORBIDDEN' },
        { message: 'Invalid token', code: 'INVALID_TOKEN' },
      ];

      errors.forEach(error => {
        const result = standardizeError(error);
        expect(result.category).toBe('auth');
        expect(result.retryable).toBe(false);
      });
    });

    it('should assign correct severity levels', () => {
      const criticalError = { message: 'Server crashed', code: 'SERVER_ERROR' };
      const highError = { message: 'Unauthorized', code: 'UNAUTHORIZED' };
      const mediumError = { message: 'Validation failed', code: 'VALIDATION_ERROR' };
      const lowError = { message: 'Not found', code: 'NOT_FOUND' };

      expect(standardizeError(criticalError).severity).toBe('critical');
      expect(standardizeError(highError).severity).toBe('high');
      expect(standardizeError(mediumError).severity).toBe('medium');
      expect(standardizeError(lowError).severity).toBe('low');
    });
  });

  describe('User-friendly messages', () => {
    it('should provide user-friendly messages for common errors', () => {
      const testCases = [
        {
          error: { message: 'Failed to fetch', code: 'NETWORK_ERROR' },
          expected: 'Unable to connect to the server. Please check your internet connection and try again.',
        },
        {
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
          expected: 'Your session has expired. Please log in again.',
        },
        {
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
          expected: 'Please check your input and try again.',
        },
        {
          error: { message: 'Server error', code: 'SERVER_ERROR' },
          expected: 'A server error occurred. Please try again later.',
        },
      ];

      testCases.forEach(({ error, expected }) => {
        const result = standardizeError(error);
        expect(result.userMessage).toBe(expected);
      });
    });

    it('should fall back to generic message for unknown errors', () => {
      const result = standardizeError({ message: 'Unknown error', code: 'UNKNOWN_CODE' });
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });
});