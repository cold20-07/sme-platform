# Real-time Subscriptions

This document describes the enhanced real-time subscription system for the SME Platform, which provides robust real-time data synchronization with Supabase.

## Overview

The real-time subscription system consists of:

1. **RealtimeSubscriptionManager** - Core subscription management with error recovery
2. **React Hooks** - Easy-to-use hooks for components
3. **UI Components** - Status monitoring and debugging components
4. **Type Safety** - Full TypeScript support with database types

## Features

- ✅ Automatic error recovery and retry logic
- ✅ Connection health monitoring
- ✅ Subscription cleanup and memory leak prevention
- ✅ React hooks for easy component integration
- ✅ TypeScript support with database types
- ✅ Debug tools and status monitoring
- ✅ Multiple subscription patterns
- ✅ Comprehensive testing

## Quick Start

### Basic Usage with React Hooks

```tsx
import { useRealtimeSubscription } from '../hooks/use-realtime-subscription';

function UserProfile({ userId }: { userId: string }) {
  const [userData, setUserData] = useState(null);

  const { isConnected, error } = useRealtimeSubscription(
    `user_${userId}`,
    'users',
    (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new.id === userId) {
        setUserData(payload.new);
      }
    },
    {
      filter: `id=eq.${userId}`,
      event: 'UPDATE',
    }
  );

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error.message}</div>}
      {userData && <pre>{JSON.stringify(userData, null, 2)}</pre>}
    </div>
  );
}
```

### Specialized Hooks

```tsx
import {
  useUserRealtimeSubscription,
  useCompanyRealtimeSubscription,
  useOrderRealtimeSubscription,
  useProductRealtimeSubscription,
} from '../hooks/use-realtime-subscription';

// User-specific changes
const { isConnected } = useUserRealtimeSubscription(userId, (payload) => {
  console.log('User updated:', payload.new);
});

// Company-specific changes
const { isConnected } = useCompanyRealtimeSubscription(companyId, (payload) => {
  console.log('Company updated:', payload.new);
});

// Orders for a specific user
const { isConnected } = useOrderRealtimeSubscription(userId, (payload) => {
  console.log('Order changed:', payload);
});

// Products (optionally filtered by company)
const { isConnected } = useProductRealtimeSubscription(
  (payload) => console.log('Product changed:', payload),
  { companyId: 'optional-company-id' }
);
```

### Multiple Subscriptions

```tsx
import { useMultipleRealtimeSubscriptions } from '../hooks/use-realtime-subscription';

function Dashboard() {
  const { subscriptions, isAllConnected, reconnectAll } = useMultipleRealtimeSubscriptions([
    {
      id: 'user_updates',
      table: 'users',
      callback: (payload) => console.log('User:', payload),
      event: 'UPDATE',
    },
    {
      id: 'new_orders',
      table: 'orders',
      callback: (payload) => console.log('Order:', payload),
      event: 'INSERT',
    },
  ]);

  return (
    <div>
      <div>All Connected: {isAllConnected ? 'Yes' : 'No'}</div>
      <button onClick={reconnectAll}>Reconnect All</button>
    </div>
  );
}
```

## Direct Manager Usage

For more control, you can use the manager directly:

```tsx
import { realtimeManager } from '../lib/realtime-subscriptions';

// Subscribe
const channel = await realtimeManager.subscribe('my-subscription', {
  table: 'users',
  event: '*',
  callback: (payload) => {
    console.log('Received:', payload);
  },
  onError: (error) => {
    console.error('Subscription error:', error);
  },
  retryConfig: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
});

// Check status
const status = realtimeManager.getSubscriptionStatus('my-subscription');
console.log('Status:', status);

// Unsubscribe
realtimeManager.unsubscribe('my-subscription');

// Health check
const health = realtimeManager.getHealthStatus();
console.log('Health:', health);
```

## Configuration Options

### Subscription Configuration

```typescript
interface RealtimeSubscriptionConfig {
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string; // PostgreSQL filter expression
  schema?: string; // Default: 'public'
  callback: (payload: RealtimePayload) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
  retryConfig?: SubscriptionRetryConfig;
}
```

### Retry Configuration

```typescript
interface SubscriptionRetryConfig {
  maxRetries: number; // Default: 5
  baseDelay: number; // Default: 1000ms
  maxDelay: number; // Default: 30000ms
  backoffMultiplier: number; // Default: 2
}
```

### Hook Options

```typescript
interface UseRealtimeSubscriptionOptions {
  enabled?: boolean; // Default: true
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
  retryConfig?: SubscriptionRetryConfig;
}
```

## Payload Structure

```typescript
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any; // New record data (INSERT, UPDATE)
  old?: any; // Old record data (UPDATE, DELETE)
  errors?: any; // Any errors that occurred
  table: string; // Table name
  schema: string; // Schema name
  commit_timestamp: string; // When the change occurred
}
```

## Monitoring and Debugging

### Status Components

```tsx
import { RealtimeStatus, RealtimeDebugPanel } from '../components/ui/realtime-status';

function App() {
  return (
    <div>
      {/* Show connection status */}
      <RealtimeStatus showDetails={true} />
      
      {/* Debug panel (development only) */}
      <RealtimeDebugPanel />
    </div>
  );
}
```

### Health Monitoring

```tsx
import { useRealtimeHealth } from '../hooks/use-realtime-subscription';

function HealthMonitor() {
  const { isHealthy, totalSubscriptions, activeSubscriptions, failedSubscriptions } = useRealtimeHealth();

  return (
    <div>
      <div>Health: {isHealthy ? '🟢 Healthy' : '🔴 Unhealthy'}</div>
      <div>Active: {activeSubscriptions}/{totalSubscriptions}</div>
      <div>Failed: {failedSubscriptions}</div>
    </div>
  );
}
```

## Error Handling

The system provides multiple levels of error handling:

1. **Automatic Retry** - Failed subscriptions are automatically retried with exponential backoff
2. **Error Callbacks** - Custom error handlers can be provided
3. **Health Monitoring** - System health is continuously monitored
4. **Graceful Degradation** - The app continues to work even if real-time features fail

### Error Types

- **Connection Errors** - Network connectivity issues
- **Authentication Errors** - Invalid or expired tokens
- **Permission Errors** - Insufficient database permissions
- **Callback Errors** - Errors in user-provided callback functions

## Best Practices

### 1. Use Appropriate Filters

```tsx
// Good: Filter at the database level
useRealtimeSubscription('user_orders', 'orders', callback, {
  filter: `user_id=eq.${userId}`,
});

// Avoid: Filtering in the callback
useRealtimeSubscription('all_orders', 'orders', (payload) => {
  if (payload.new.user_id === userId) {
    // Handle order
  }
});
```

### 2. Handle Cleanup

```tsx
useEffect(() => {
  const subscription = realtimeManager.subscribe('my-sub', config);
  
  return () => {
    realtimeManager.unsubscribe('my-sub');
  };
}, []);
```

### 3. Use Specialized Hooks

```tsx
// Good: Use specialized hooks
useUserRealtimeSubscription(userId, callback);

// Avoid: Generic hook with manual filtering
useRealtimeSubscription('user', 'users', callback, {
  filter: `id=eq.${userId}`,
});
```

### 4. Error Handling

```tsx
const { error, reconnect } = useRealtimeSubscription('my-sub', 'users', callback, {
  onError: (error) => {
    console.error('Subscription error:', error);
    // Optionally show user notification
  },
});

// Provide manual reconnect option
{error && (
  <button onClick={reconnect}>
    Reconnect
  </button>
)}
```

### 5. Performance Considerations

```tsx
// Use React.useCallback for stable callback references
const handleUserUpdate = useCallback((payload) => {
  setUserData(payload.new);
}, []);

useUserRealtimeSubscription(userId, handleUserUpdate);
```

## Testing

The system includes comprehensive tests:

```bash
# Run real-time subscription tests
npm test realtime-subscriptions
npm test use-realtime-subscription
```

### Test Examples

```typescript
// Mock the manager for testing
vi.mock('../lib/realtime-subscriptions', () => ({
  realtimeManager: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getSubscriptionStatus: vi.fn(),
  },
}));

// Test hook behavior
const { result } = renderHook(() =>
  useRealtimeSubscription('test', 'users', mockCallback)
);

expect(result.current.isConnected).toBe(true);
```

## Migration from Legacy System

If you're using the old real-time system:

```tsx
// Old way (deprecated)
import { realtimeManager } from '../lib/supabase';

// New way
import { realtimeManager } from '../lib/realtime-subscriptions';
import { useRealtimeSubscription } from '../hooks/use-realtime-subscription';
```

The new system is backward compatible but provides enhanced features and better error handling.

## Troubleshooting

### Common Issues

1. **Subscriptions Not Connecting**
   - Check network connectivity
   - Verify Supabase configuration
   - Check browser console for errors

2. **High Memory Usage**
   - Ensure proper cleanup in useEffect
   - Use the provided hooks instead of direct manager usage
   - Check for subscription leaks in dev tools

3. **Missing Events**
   - Verify Row Level Security (RLS) policies
   - Check subscription filters
   - Ensure proper database permissions

4. **Performance Issues**
   - Use specific filters instead of subscribing to all changes
   - Implement proper callback memoization
   - Monitor subscription count

### Debug Tools

1. **RealtimeDebugPanel** - Visual debugging in development
2. **Browser DevTools** - Check network and console logs
3. **Health Monitoring** - Use `useRealtimeHealth` hook
4. **Status Components** - Monitor connection status

## API Reference

See the TypeScript definitions in:
- `lib/realtime-subscriptions.ts` - Core manager and types
- `hooks/use-realtime-subscription.ts` - React hooks
- `components/ui/realtime-status.tsx` - UI components

## Examples

Complete examples are available in:
- `components/examples/realtime-subscription-demo.tsx` - Comprehensive demo
- `hooks/__tests__/use-realtime-subscription.test.tsx` - Test examples
- `lib/__tests__/realtime-subscriptions.test.ts` - Manager tests