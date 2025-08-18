# API Error Handling System

This document describes the comprehensive API error handling system implemented for the SME Platform. The system provides standardized error handling, automatic retry mechanisms, user-friendly error messages, and circuit breaker patterns.

## Overview

The API error handling system consists of several key components:

1. **Error Standardization** - Converts various error types into a consistent format
2. **Retry Mechanisms** - Automatic retry with exponential backoff and smart retry logic
3. **Circuit Breaker** - Prevents cascading failures by temporarily stopping requests to failing services
4. **User-Friendly Messages** - Maps technical errors to user-understandable messages
5. **Global Error Handling** - Centralized error tracking and notification system
6. **React Integration** - Hooks and components for seamless React integration

## Core Components

### 1. Error Standardization

The `standardizeError` function converts any error into a standardized `APIError` format:

```typescript
interface APIError {
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
```

**Usage:**
```typescript
import { standardizeError } from '@/lib/api-error-handler';

try {
  await apiCall();
} catch (error) {
  const standardizedError = standardizeError(error);
  console.log(standardizedError.userMessage); // User-friendly message
}
```

### 2. Retry Mechanisms

#### Basic Retry with Backoff

```typescript
import { retryWithBackoff } from '@/lib/api-error-handler';

const result = await retryWithBackoff(
  () => fetchData(),
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  }
);

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

#### Smart Retry

```typescript
import { smartRetry } from '@/lib/api-error-handler';

const result = await smartRetry(
  () => fetchData(),
  {
    maxRetries: 3,
    customRetryLogic: (error, attempt) => {
      // Custom logic to determine if retry should happen
      return error.category === 'network' && attempt < 2;
    },
    onRetry: (error, attempt) => {
      console.log(`Retrying after error: ${error.message}, attempt: ${attempt + 1}`);
    },
  }
);
```

### 3. Circuit Breaker

Prevents cascading failures by temporarily stopping requests to failing services:

```typescript
import { CircuitBreaker } from '@/lib/api-error-handler';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  resetTimeout: 60000,    // Try again after 1 minute
  monitoringPeriod: 300000, // Reset failure count after 5 minutes
});

const result = await circuitBreaker.execute(() => fetchData());
```

### 4. Global Error Handler

Centralized error tracking and notification:

```typescript
import { globalErrorHandler } from '@/lib/api-error-handler';

// Register error callback
const unsubscribe = globalErrorHandler.onError((error) => {
  console.log('Global error:', error.userMessage);
  // Show notification, log to service, etc.
});

// Handle an error globally
globalErrorHandler.handleError(new Error('Something went wrong'));

// Get error statistics
const stats = globalErrorHandler.getErrorStats();
console.log(`Total errors: ${stats.total}, Recent: ${stats.recentErrors}`);
```

### 5. Function Wrapper

Wrap any function with comprehensive error handling:

```typescript
import { withErrorHandling } from '@/lib/api-error-handler';

const safeApiCall = withErrorHandling(
  async (id: string) => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  },
  {
    retryConfig: { maxRetries: 3 },
    enableCircuitBreaker: true,
    onError: (error) => console.error('API call failed:', error),
    onRetry: (error, attempt) => console.log(`Retrying... attempt ${attempt + 1}`),
  }
);

const result = await safeApiCall('123');
```

## React Integration

### Hooks

#### useAPICall

Hook for handling individual API calls with error handling and retry:

```typescript
import { useAPICall } from '@/hooks/use-api-error-handler';

function UserProfile({ userId }: { userId: string }) {
  const apiCall = useAPICall(
    async (id: string) => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    {
      retryConfig: { maxRetries: 3 },
      onSuccess: (user) => console.log('User loaded:', user),
      onError: (error) => console.error('Failed to load user:', error),
    }
  );

  const loadUser = () => apiCall.execute(userId);

  return (
    <div>
      <button onClick={loadUser} disabled={apiCall.loading}>
        {apiCall.loading ? 'Loading...' : 'Load User'}
      </button>
      
      {apiCall.error && (
        <APIErrorDisplay
          error={apiCall.error}
          onRetry={loadUser}
          retryCount={apiCall.retryCount}
        />
      )}
      
      {apiCall.data && (
        <div>User: {apiCall.data.name}</div>
      )}
    </div>
  );
}
```

#### useAPIErrorHandler

Hook for global error handling:

```typescript
import { useAPIErrorHandler } from '@/hooks/use-api-error-handler';

function ErrorMonitor() {
  const { errorHistory, clearErrorHistory, getErrorStats } = useAPIErrorHandler();
  const stats = getErrorStats();

  return (
    <div>
      <h3>Error Statistics</h3>
      <p>Total Errors: {stats.total}</p>
      <p>Recent Errors: {stats.recentErrors}</p>
      
      <button onClick={clearErrorHistory}>Clear History</button>
      
      <APIErrorList
        errors={errorHistory}
        onClearAll={clearErrorHistory}
      />
    </div>
  );
}
```

#### useBatchAPICall

Hook for handling multiple API calls:

```typescript
import { useBatchAPICall } from '@/hooks/use-api-error-handler';

function BulkUserLoader() {
  const batchCall = useBatchAPICall(
    async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    {
      maxConcurrent: 5,
      retryConfig: { maxRetries: 2 },
      onComplete: (results) => console.log('Batch completed:', results),
    }
  );

  const loadUsers = () => {
    const userIds = ['1', '2', '3', '4', '5'];
    batchCall.executeBatch(userIds.map(id => [id]));
  };

  return (
    <div>
      <button onClick={loadUsers} disabled={batchCall.loading}>
        Load Users
      </button>
      
      {batchCall.loading && (
        <div>
          Progress: {batchCall.progress.completed}/{batchCall.progress.total}
        </div>
      )}
      
      <div>
        Success Rate: {batchCall.getStats().successRate.toFixed(1)}%
      </div>
    </div>
  );
}
```

#### useAPIHealthMonitor

Hook for monitoring API health:

```typescript
import { useAPIHealthMonitor } from '@/hooks/use-api-error-handler';
import { checkSupabaseHealth } from '@/lib/supabase';

function HealthMonitor() {
  const healthMonitor = useAPIHealthMonitor(
    checkSupabaseHealth,
    {
      interval: 30000, // Check every 30 seconds
      onHealthChange: (isHealthy) => {
        if (!isHealthy) {
          console.warn('API is unhealthy!');
        }
      },
    }
  );

  return (
    <APIHealthIndicator
      health={healthMonitor.health}
      stats={healthMonitor.getHealthStats()}
    />
  );
}
```

### Components

#### APIErrorDisplay

Component for displaying individual errors:

```typescript
import { APIErrorDisplay } from '@/components/ui/api-error-display';

<APIErrorDisplay
  error={error}
  onRetry={() => retryOperation()}
  onDismiss={() => clearError()}
  showDetails={true}
  variant="inline"
  retryCount={2}
  maxRetries={3}
/>
```

#### APIErrorList

Component for displaying multiple errors:

```typescript
import { APIErrorList } from '@/components/ui/api-error-display';

<APIErrorList
  errors={errorHistory}
  onRetry={(error) => retryForError(error)}
  onDismiss={(error) => dismissError(error)}
  onClearAll={() => clearAllErrors()}
  maxVisible={5}
/>
```

#### APIErrorStats

Component for displaying error statistics:

```typescript
import { APIErrorStats } from '@/components/ui/api-error-display';

<APIErrorStats stats={errorStats} />
```

#### APIHealthIndicator

Component for displaying API health status:

```typescript
import { APIHealthIndicator } from '@/components/ui/api-error-display';

<APIHealthIndicator
  health={healthStatus}
  stats={healthStats}
/>
```

## Error Categories and Handling

### Network Errors
- **Retryable**: Yes
- **Severity**: Medium to High
- **Examples**: Connection timeout, DNS resolution failure, network unreachable
- **User Message**: "Unable to connect to the server. Please check your internet connection and try again."

### Authentication Errors
- **Retryable**: No
- **Severity**: High
- **Examples**: Invalid token, expired session, unauthorized access
- **User Message**: "Your session has expired. Please log in again."

### Validation Errors
- **Retryable**: No
- **Severity**: Medium
- **Examples**: Invalid input format, missing required fields, constraint violations
- **User Message**: "Please check your input and try again."

### Server Errors
- **Retryable**: Yes
- **Severity**: High to Critical
- **Examples**: Internal server error, service unavailable, database connection failure
- **User Message**: "A server error occurred. Please try again later."

### Client Errors
- **Retryable**: No
- **Severity**: Low to Medium
- **Examples**: Not found, conflict, rate limited
- **User Message**: Varies based on specific error

## Configuration

### Default Retry Configuration

```typescript
const DEFAULT_RETRY_CONFIG = {
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
```

### Customizing Error Messages

You can extend the error message mapping:

```typescript
import { ERROR_MESSAGE_MAP } from '@/lib/api-error-handler';

// Add custom error messages
ERROR_MESSAGE_MAP['CUSTOM_ERROR'] = 'This is a custom error message for users.';
```

## Integration with React Query

The error handling system is integrated with React Query for automatic error handling:

```typescript
// In lib/react-query.ts
import { standardizeError, globalErrorHandler } from './api-error-handler';

function handleQueryError(error: unknown): void {
  const apiError = standardizeError(error);
  globalErrorHandler.handleError(apiError);
  
  // Show toast for non-silent errors
  if (!silentErrors.includes(apiError.code)) {
    toast.error(apiError.userMessage);
  }
}
```

## Best Practices

1. **Always use standardizeError** for consistent error handling
2. **Set appropriate retry policies** based on error types
3. **Use circuit breakers** for external service calls
4. **Monitor error rates** and set up alerts
5. **Provide meaningful user messages** that guide users on next steps
6. **Log detailed errors** in development for debugging
7. **Use global error handler** for centralized error tracking
8. **Test error scenarios** to ensure proper handling
9. **Consider user experience** when showing errors and retry options
10. **Implement graceful degradation** when services are unavailable

## Testing

The system includes comprehensive tests covering:

- Error standardization for various error types
- Retry mechanisms with different configurations
- Circuit breaker functionality
- Global error handler behavior
- User-friendly message mapping
- Error categorization and severity assignment

Run tests with:
```bash
npm test -- lib/__tests__/api-error-handler.test.ts
```

## Examples

See the complete demo implementation in:
- `components/examples/api-error-handling-demo.tsx`

This demo shows all features in action including:
- Single API calls with different error types
- Batch API calls with progress tracking
- Error history and statistics
- Health monitoring
- Circuit breaker behavior

## Troubleshooting

### Common Issues

1. **Tests timing out**: Ensure proper timer handling in tests with `vi.runAllTimersAsync()`
2. **Errors not being caught**: Make sure to wrap API calls with error handling
3. **Circuit breaker not working**: Check failure threshold and timeout configurations
4. **User messages not showing**: Verify error codes are mapped in ERROR_MESSAGE_MAP
5. **Retries not happening**: Check if error is marked as retryable

### Debug Mode

Enable detailed logging in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  globalErrorHandler.onError((error) => {
    console.group('🚨 API Error');
    console.error('Error:', error);
    console.error('Stack:', error.details?.stack);
    console.groupEnd();
  });
}
```

This comprehensive error handling system ensures robust, user-friendly error management throughout the SME Platform application.