import { SupabaseError } from './supabase';

// Standardized API error interface
export interface APIError {
  id: string;
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
}

// Error response interface for API calls
export interface APIResponse<T = any> {
  data: T | null;
  error: APIError | null;
  success: boolean;
  metadata?: {
    requestId?: string;
    timestamp: Date;
    retryCount?: number;
  };
}

// Retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
    'RATE_LIMITED',
    'CONNECTION_ERROR',
    'FETCH_ERROR',
  ],
  nonRetryableErrors: [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'INVALID_REQUEST',
    'CONFLICT',
  ],
};

// User-friendly error message mapping
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Network errors
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection and try again.',
  'TIMEOUT': 'The request timed out. Please try again.',
  'CONNECTION_ERROR': 'Connection failed. Please check your internet connection.',
  'FETCH_ERROR': 'Failed to fetch data. Please try again.',
  
  // Authentication errors
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'FORBIDDEN': 'You don\'t have permission to perform this action.',
  'INVALID_TOKEN': 'Your session is invalid. Please log in again.',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'INVALID_REQUEST': 'The request is invalid. Please check your input.',
  'MISSING_REQUIRED_FIELD': 'Please fill in all required fields.',
  'INVALID_FORMAT': 'Please check the format of your input.',
  
  // Server errors
  'SERVER_ERROR': 'A server error occurred. Please try again later.',
  'INTERNAL_ERROR': 'An internal error occurred. Please try again later.',
  'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable. Please try again later.',
  'MAINTENANCE': 'The system is under maintenance. Please try again later.',
  
  // Client errors
  'NOT_FOUND': 'The requested resource was not found.',
  'CONFLICT': 'This action conflicts with existing data.',
  'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
  'QUOTA_EXCEEDED': 'You have exceeded your quota. Please try again later.',
  
  // Database errors (Supabase specific)
  'PGRST116': 'The requested data was not found.',
  'PGRST301': 'You do not have permission to access this data.',
  'PGRST204': 'No data was found matching your request.',
  '23505': 'This record already exists.',
  '23503': 'Cannot delete this record because it is referenced by other data.',
  '23502': 'Required information is missing.',
  '42501': 'You do not have permission to perform this action.',
  
  // Auth specific errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
};

// Error categorization patterns
const ERROR_PATTERNS = {
  network: [/network/i, /fetch/i, /connection/i, /timeout/i, /offline/i],
  auth: [/auth/i, /unauthorized/i, /forbidden/i, /token/i, /session/i, /login/i],
  validation: [/validation/i, /invalid/i, /required/i, /format/i, /constraint/i],
  server: [/server/i, /internal/i, /500/i, /503/i, /502/i, /504/i],
  client: [/400/i, /404/i, /409/i, /429/i, /client/i],
};

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Categorize error based on message and code
function categorizeError(message: string, code?: string): APIError['category'] {
  const text = `${message} ${code || ''}`.toLowerCase();
  
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(text))) {
      return category as APIError['category'];
    }
  }
  
  return 'unknown';
}

// Determine error severity
function determineErrorSeverity(category: APIError['category'], code?: string): APIError['severity'] {
  // Critical errors that require immediate attention
  if (code === 'SERVER_ERROR' || code === 'INTERNAL_ERROR') {
    return 'critical';
  }
  
  // High severity errors
  if (category === 'server' || code === 'UNAUTHORIZED') {
    return 'high';
  }
  
  // Medium severity errors
  if (category === 'auth' || category === 'validation') {
    return 'medium';
  }
  
  // Low severity errors
  return 'low';
}

// Check if error is retryable
function isRetryableError(code: string, category: APIError['category']): boolean {
  // Check explicit non-retryable errors
  if (DEFAULT_RETRY_CONFIG.nonRetryableErrors.includes(code)) {
    return false;
  }
  
  // Check explicit retryable errors
  if (DEFAULT_RETRY_CONFIG.retryableErrors.includes(code)) {
    return true;
  }
  
  // Category-based retry logic
  switch (category) {
    case 'network':
    case 'server':
      return true;
    case 'auth':
    case 'validation':
    case 'client':
      return false;
    default:
      return false;
  }
}

// Convert various error types to standardized APIError
export function standardizeError(error: any): APIError {
  let code = 'UNKNOWN_ERROR';
  let message = 'An unknown error occurred';
  let details = error;
  
  // Handle different error types
  if (error instanceof Error) {
    message = error.message;
    code = (error as any).code || 'GENERIC_ERROR';
  } else if (typeof error === 'string') {
    message = error;
    code = 'STRING_ERROR';
  } else if (error && typeof error === 'object') {
    message = error.message || error.error || 'Object error';
    code = error.code || error.error_code || 'OBJECT_ERROR';
    details = error;
  }
  
  // Handle Supabase errors specifically
  if (error && (error.code || error.details || error.hint)) {
    const supabaseError = error as SupabaseError;
    code = supabaseError.code || 'SUPABASE_ERROR';
    message = supabaseError.message;
    details = {
      code: supabaseError.code,
      details: supabaseError.details,
      hint: supabaseError.hint,
    };
  }
  
  // Handle fetch/network errors
  if (message.includes('fetch') || message.includes('Failed to fetch')) {
    code = 'NETWORK_ERROR';
  } else if (message.includes('timeout') || message.includes('timed out')) {
    code = 'TIMEOUT';
  } else if (message.includes('NetworkError') || message.includes('network')) {
    code = 'CONNECTION_ERROR';
  }
  
  const category = categorizeError(message, code);
  const severity = determineErrorSeverity(category, code);
  const retryable = isRetryableError(code, category);
  
  // Get user-friendly message
  const userMessage = ERROR_MESSAGE_MAP[code] || 
                     ERROR_MESSAGE_MAP[category.toUpperCase() + '_ERROR'] || 
                     'An unexpected error occurred. Please try again.';
  
  return {
    id: generateErrorId(),
    code,
    message,
    userMessage,
    details,
    timestamp: new Date(),
    retryable,
    severity,
    category,
  };
}

// Retry mechanism with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<APIResponse<T>> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: APIError;
  let retryCount = 0;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      
      return {
        data: result,
        error: null,
        success: true,
        metadata: {
          timestamp: new Date(),
          retryCount,
        },
      };
    } catch (error) {
      lastError = standardizeError(error);
      retryCount = attempt;
      
      // Don't retry if error is not retryable or we've reached max retries
      if (!lastError.retryable || attempt === retryConfig.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(baseDelay + jitter, retryConfig.maxDelay);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    data: null,
    error: lastError!,
    success: false,
    metadata: {
      timestamp: new Date(),
      retryCount,
    },
  };
}

// Smart retry that adapts based on error type
export async function smartRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    customRetryLogic?: (error: APIError, attempt: number) => boolean;
    onRetry?: (error: APIError, attempt: number) => void;
    onError?: (error: APIError) => void;
  } = {}
): Promise<APIResponse<T>> {
  const { maxRetries = 3, customRetryLogic, onRetry, onError } = options;
  let lastError: APIError;
  let retryCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      return {
        data: result,
        error: null,
        success: true,
        metadata: {
          timestamp: new Date(),
          retryCount,
        },
      };
    } catch (error) {
      lastError = standardizeError(error);
      retryCount = attempt;
      
      // Call error callback
      if (onError) {
        onError(lastError);
      }
      
      // Check if we should retry
      const shouldRetry = customRetryLogic 
        ? customRetryLogic(lastError, attempt)
        : lastError.retryable && attempt < maxRetries;
      
      if (!shouldRetry) {
        break;
      }
      
      // Call retry callback
      if (onRetry) {
        onRetry(lastError, attempt);
      }
      
      // Calculate adaptive delay based on error type
      let delay = 1000 * Math.pow(2, attempt); // Base exponential backoff
      
      // Adjust delay based on error category
      switch (lastError.category) {
        case 'network':
          delay *= 0.5; // Faster retry for network issues
          break;
        case 'server':
          delay *= 2; // Slower retry for server issues
          break;
        case 'auth':
          delay *= 3; // Much slower retry for auth issues
          break;
      }
      
      // Add jitter and cap the delay
      delay = Math.min(delay + Math.random() * 1000, 30000);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    data: null,
    error: lastError!,
    success: false,
    metadata: {
      timestamp: new Date(),
      retryCount,
    },
  };
}

// Circuit breaker pattern for failing operations
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
    }
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<APIResponse<T>> {
    if (!this.canExecute()) {
      return {
        data: null,
        error: standardizeError(new Error('Circuit breaker is open')),
        success: false,
        metadata: {
          timestamp: new Date(),
        },
      };
    }
    
    try {
      const result = await operation();
      this.recordSuccess();
      
      return {
        data: result,
        error: null,
        success: true,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.recordFailure();
      
      return {
        data: null,
        error: standardizeError(error),
        success: false,
        metadata: {
          timestamp: new Date(),
        },
      };
    }
  }
  
  private canExecute(): boolean {
    const now = Date.now();
    
    // Reset if monitoring period has passed
    if (now - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failures = 0;
      this.state = 'closed';
    }
    
    // If circuit is open, check if we should try again
    if (this.state === 'open') {
      if (now - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  private recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }
  
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global error handler for unhandled API errors
export class GlobalAPIErrorHandler {
  private errorCallbacks: Array<(error: APIError) => void> = [];
  private errorHistory: APIError[] = [];
  private maxHistorySize = 100;
  
  // Register error callback
  onError(callback: (error: APIError) => void): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }
  
  // Handle error globally
  handleError(error: any): APIError {
    const standardizedError = standardizeError(error);
    
    // Add to history
    this.errorHistory.unshift(standardizedError);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
    
    // Notify all callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(standardizedError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
    
    return standardizedError;
  }
  
  // Get error history
  getErrorHistory(): APIError[] {
    return [...this.errorHistory];
  }
  
  // Get error statistics
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp.getTime() > oneHourAgo
    ).length;
    
    const byCategory = this.errorHistory.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: this.errorHistory.length,
      byCategory,
      bySeverity,
      recentErrors,
    };
  }
  
  // Clear error history
  clearHistory(): void {
    this.errorHistory = [];
  }
}

// Create global error handler instance
export const globalErrorHandler = new GlobalAPIErrorHandler();

// Utility function to wrap API calls with error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    retryConfig?: Partial<RetryConfig>;
    circuitBreaker?: CircuitBreaker;
    onError?: (error: APIError) => void;
    onRetry?: (error: APIError, attempt: number) => void;
  } = {}
) {
  return async (...args: T): Promise<APIResponse<R>> => {
    const { retryConfig, circuitBreaker, onError, onRetry } = options;
    
    const operation = () => fn(...args);
    
    let result: APIResponse<R>;
    
    if (circuitBreaker) {
      result = await circuitBreaker.execute(operation);
    } else {
      result = await smartRetry(operation, {
        maxRetries: retryConfig?.maxRetries,
        onError,
        onRetry,
      });
    }
    
    // Handle error globally if it failed
    if (!result.success && result.error) {
      globalErrorHandler.handleError(result.error);
    }
    
    return result;
  };
}

// Export types and utilities
export type { RetryConfig, APIResponse };
export { DEFAULT_RETRY_CONFIG, ERROR_MESSAGE_MAP };