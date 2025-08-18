# Development Tools and Debugging Guide

This document describes the comprehensive development tools and debugging utilities available in the SME Platform application.

## Overview

The development tools provide a complete debugging and development experience with:

- **Debug Panel**: Interactive UI for logs, cache inspection, and quick actions
- **React Query DevTools**: Enhanced query debugging and performance monitoring
- **Performance Monitoring**: Real-time performance metrics and optimization suggestions
- **Mock Data System**: Generate test data and simulate different scenarios
- **Network Simulation**: Test different network conditions
- **Memory Monitoring**: Track memory usage and detect leaks
- **Logging System**: Comprehensive logging with categories and levels

## Quick Start

### Automatic Initialization

Development tools are automatically initialized in development mode. You'll see a welcome message in the console with available utilities.

### Manual Initialization

```typescript
import { initializeDevelopmentTools } from '@/lib/dev-initialization';

initializeDevelopmentTools({
  enableDebugPanel: true,
  enablePerformanceMonitoring: true,
  enableMockData: false,
  enableApiLogging: true,
  logLevel: 'debug',
});
```

## Debug Panel

The debug panel provides a comprehensive UI for debugging and development tasks.

### Accessing the Debug Panel

- **UI Button**: Click the "🐛 Debug" button in the bottom-right corner
- **Keyboard Shortcut**: `Ctrl+Shift+D`
- **Console**: `window.dev.help()` for available commands

### Debug Panel Features

#### Logs Tab
- View recent application logs with filtering by category and level
- Real-time log updates
- Export logs to JSON file
- Clear logs functionality

#### Cache Tab
- React Query cache statistics
- Active, stale, and error query counts
- Memory usage estimation
- Cache management actions (refetch stale, analyze efficiency)

#### Performance Tab
- Memory monitoring controls
- Bundle size analysis
- Network condition simulation (normal, slow, offline)
- Performance metrics tracking

#### Tools Tab
- Quick login (user/admin)
- Test data population
- Application state reset
- Test scenario generation (empty, error, loading, success states)

## React Query DevTools

Enhanced React Query DevTools with custom features and performance monitoring.

### Features

- **Custom Configuration**: Enhanced UI with performance callbacks
- **Cache Analysis**: Detailed cache efficiency analysis
- **Performance Monitoring**: Automatic slow query detection
- **Memory Tracking**: Query memory usage monitoring
- **Export Functionality**: Export cache data for analysis

### Usage

```typescript
import { reactQueryDevUtils } from '@/lib/react-query-devtools';

// Get cache information
const cacheInfo = reactQueryDevUtils.getCacheInfo();

// Analyze cache efficiency
const analysis = reactQueryDevUtils.analyzeCacheEfficiency();

// Clear specific entity cache
reactQueryDevUtils.clearEntityCache('companies');

// Simulate network error for testing
reactQueryDevUtils.simulateNetworkError(['companies', 'list']);
```

## Logging System

Comprehensive logging system with categories, levels, and performance tracking.

### Log Levels

```typescript
enum DebugLevel {
  ERROR = 0,    // Critical errors
  WARN = 1,     // Warnings
  INFO = 2,     // General information
  DEBUG = 3,    // Debug information
  TRACE = 4,    // Detailed tracing
}
```

### Log Categories

```typescript
enum DebugCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  REACT_QUERY = 'react-query',
  SUPABASE = 'supabase',
  MCP = 'mcp',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI = 'ui',
  GENERAL = 'general',
}
```

### Usage Examples

```typescript
import { debugLogger, DebugCategory } from '@/lib/debug-utilities';

// Basic logging
debugLogger.error(DebugCategory.API, 'API call failed', { url, error });
debugLogger.warn(DebugCategory.AUTH, 'Session expiring soon');
debugLogger.info(DebugCategory.GENERAL, 'User action completed');
debugLogger.debug(DebugCategory.REACT_QUERY, 'Query updated', { queryKey });

// Performance timing
debugLogger.startPerformanceTimer('data-fetch');
// ... perform operation
debugLogger.endPerformanceTimer('data-fetch', DebugCategory.API);

// Convenience functions
import { logApiCall, logApiError, logAuthEvent } from '@/lib/debug-utilities';

logApiCall('GET', '/api/companies');
logApiError('POST', '/api/users', error);
logAuthEvent('User logged in', { userId });
```

## Mock Data System

Generate realistic test data for development and testing.

### Mock Data Generators

```typescript
import { mockData } from '@/lib/dev-environment-helpers';

// Generate mock entities
const user = mockData.generateUser({ role: 'admin' });
const company = mockData.generateCompany({ industry: 'Technology' });
const product = mockData.generateProduct({ category: 'Software' });
const dashboardData = mockData.generateDashboardData(companyId);
```

### API Mocking

```typescript
import { apiInterceptors } from '@/lib/dev-environment-helpers';

// Setup mock API responses
const cleanup = apiInterceptors.setupMockResponses();

// Cleanup when done
cleanup();
```

## Development Utilities

### Quick Actions

```typescript
import { devShortcuts } from '@/lib/dev-environment-helpers';

// Quick login for testing
await devShortcuts.quickLogin('admin');

// Populate test data
await devShortcuts.populateTestData();

// Clear all data
devShortcuts.clearAllData();
```

### Application State Management

```typescript
import { devUtils } from '@/lib/dev-environment-helpers';

// Reset application state
await devUtils.resetAppState();

// Simulate network conditions
devUtils.simulateNetworkConditions('slow');

// Generate test scenarios
devUtils.generateTestScenario('error-state');

// Monitor memory usage
const stopMonitoring = devUtils.monitorMemoryUsage();
```

## Console Commands

Development utilities are available globally in the browser console:

### Main Commands

```javascript
// Environment and general utilities
dev.env()           // Show environment info
dev.reset()         // Reset app state
dev.login('admin')  // Quick login
dev.populate()      // Populate test data
dev.help()          // Show help

// Network simulation
dev.network('slow')     // Simulate slow network
dev.network('offline')  // Simulate offline
dev.network('normal')   // Reset to normal

// Test scenarios
dev.scenario('empty-state')   // Empty state
dev.scenario('error-state')   // Error state
dev.scenario('loading-state') // Loading state
dev.scenario('success-state') // Success state

// Performance
dev.memory()        // Start memory monitoring
dev.bundle()        // Analyze bundle size
```

### Debug Commands

```javascript
// Logging utilities
debug.logs()        // Show recent logs
debug.errors()      // Show error logs only
debug.stats()       // Show logging statistics
debug.clear()       // Clear all logs
debug.export()      // Export logs to file
```

### Performance Commands

```javascript
// React Query and performance
perf.stats()        // Show cache statistics
perf.cache()        // Show cache details
perf.analyze()      // Analyze cache efficiency
```

## Keyboard Shortcuts

Global keyboard shortcuts for quick access to development features:

- `Ctrl+Shift+D`: Toggle Debug Panel
- `Ctrl+Shift+R`: Reset Application State
- `Ctrl+Shift+L`: Quick Login (user)
- `Ctrl+Shift+T`: Populate Test Data
- `Ctrl+Shift+P`: Show Performance Stats

## Performance Monitoring

### Automatic Monitoring

The system automatically monitors:

- Query performance and slow queries (>2s)
- Memory usage and potential leaks
- Bundle size and optimization opportunities
- Component render times
- Network request performance

### Manual Performance Tracking

```typescript
import { devUtils } from '@/lib/dev-environment-helpers';

// Measure component render time
const endMeasure = devUtils.measureComponentRender('MyComponent');
// ... component renders
const duration = endMeasure();

// Monitor memory usage
const stopMemoryMonitoring = devUtils.monitorMemoryUsage();

// Analyze bundle size
const bundleAnalysis = devUtils.analyzeBundleSize();
```

## Configuration

### Environment Variables

Control development tools behavior with environment variables:

```bash
# Enable/disable specific features
NEXT_PUBLIC_ENABLE_DEBUG_PANEL=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS=true
NEXT_PUBLIC_SKIP_AUTH=false

# Disable all development tools
NEXT_PUBLIC_DISABLE_DEV_TOOLS=false
```

### Runtime Configuration

```typescript
import { environment } from '@/lib/dev-environment-helpers';

// Check feature flags
if (environment.features.enableMockData) {
  // Use mock data
}

// Get environment info
const info = environment.getInfo();
```

## Integration with Components

### Using Development Tools in Components

```typescript
import { useDevelopmentTools } from '@/components/dev/development-tools';

function MyComponent() {
  const { isDevMode, devTools } = useDevelopmentTools();

  const handleTestAction = () => {
    if (devTools) {
      devTools.populateTestData();
    }
  };

  return (
    <div>
      {isDevMode && (
        <button onClick={handleTestAction}>
          Populate Test Data
        </button>
      )}
    </div>
  );
}
```

### Adding Development-Only Features

```typescript
import { environment } from '@/lib/dev-environment-helpers';

function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      
      {environment.isDevelopment && (
        <div className="dev-tools">
          <button onClick={() => window.dev?.reset()}>
            Reset State
          </button>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Use Appropriate Log Levels

- `ERROR`: Only for actual errors that need attention
- `WARN`: For potential issues or deprecated usage
- `INFO`: For important application events
- `DEBUG`: For detailed debugging information
- `TRACE`: For very detailed tracing (use sparingly)

### 2. Categorize Logs Properly

Use appropriate categories to make filtering and debugging easier:

```typescript
// Good
debugLogger.error(DebugCategory.API, 'Failed to fetch user data', { userId, error });

// Bad
debugLogger.error(DebugCategory.GENERAL, 'Error occurred', error);
```

### 3. Include Relevant Context

Always include relevant data with your logs:

```typescript
// Good
debugLogger.info(DebugCategory.AUTH, 'User logged in', { 
  userId: user.id, 
  email: user.email,
  loginMethod: 'password'
});

// Bad
debugLogger.info(DebugCategory.AUTH, 'User logged in');
```

### 4. Use Performance Timing

Measure performance of critical operations:

```typescript
debugLogger.startPerformanceTimer('database-query');
const result = await fetchData();
debugLogger.endPerformanceTimer('database-query', DebugCategory.DATABASE);
```

### 5. Clean Up in Production

Development tools are automatically excluded from production builds, but be mindful of:

- Don't leave debug code in production logic
- Use environment checks for development-only features
- Remove or comment out temporary debugging code

## Troubleshooting

### Common Issues

1. **Development tools not loading**
   - Check that `NODE_ENV=development`
   - Verify `NEXT_PUBLIC_DISABLE_DEV_TOOLS` is not set to `true`
   - Check browser console for initialization errors

2. **Debug panel not appearing**
   - Try the keyboard shortcut `Ctrl+Shift+D`
   - Check that `NEXT_PUBLIC_ENABLE_DEBUG_PANEL` is not set to `false`
   - Look for JavaScript errors in console

3. **Mock data not working**
   - Ensure `NEXT_PUBLIC_ENABLE_MOCK_DATA=true`
   - Check that mock interceptors are properly initialized
   - Verify Supabase client configuration

4. **Performance monitoring not showing data**
   - Confirm `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true`
   - Check browser compatibility for Performance API
   - Verify React Query is properly configured

### Getting Help

1. Check the browser console for error messages
2. Use `dev.help()` in console for available commands
3. Check the debug panel logs tab for application logs
4. Use `debug.stats()` to see logging statistics
5. Export logs with `debug.export()` for analysis

## Advanced Usage

### Custom Debug Categories

Add custom debug categories for your specific needs:

```typescript
// Extend the DebugCategory enum
enum CustomDebugCategory {
  CUSTOM_FEATURE = 'custom-feature',
  INTEGRATION = 'integration',
}

// Use in logging
debugLogger.info(CustomDebugCategory.CUSTOM_FEATURE, 'Custom event occurred');
```

### Custom Performance Metrics

Track custom performance metrics:

```typescript
import { logPerformanceMetric } from '@/lib/debug-utilities';

// Track custom metrics
logPerformanceMetric('custom-operation-time', duration, 'ms');
logPerformanceMetric('items-processed', count, 'items');
```

### Integration with External Tools

The development tools can be integrated with external monitoring and debugging tools:

```typescript
// Export data for external analysis
const logs = debugLogger.exportLogs();
const cacheData = reactQueryDevUtils.exportCacheData();

// Send to external service
await sendToExternalService({ logs, cacheData });
```

This comprehensive development tools system provides everything needed for efficient debugging and development of the SME Platform application.