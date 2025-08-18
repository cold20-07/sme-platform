# Testing Guide

This document provides comprehensive guidance on testing in the SME Platform application.

## Overview

Our testing strategy follows a three-tier approach:

1. **Unit Tests** - Test individual functions, components, and utilities in isolation
2. **Integration Tests** - Test interactions between components and services
3. **End-to-End Tests** - Test complete user workflows and critical paths

## Test Structure

```
lib/__tests__/
├── setup.ts                    # Global test setup and mocks
├── test-utils.tsx              # Custom render functions and utilities
├── test-config.ts              # Test configuration and constants
├── integration/                # Integration tests
│   ├── database-operations.test.ts
│   └── auth-flow.test.ts
├── e2e/                       # End-to-end tests
│   └── critical-user-flows.test.ts
└── *.test.ts                  # Unit tests

components/__tests__/
├── error-boundary.test.tsx
└── ui/
    └── loading-states.test.tsx

hooks/__tests__/
└── *.test.tsx                 # Hook tests

scripts/
└── test-runner.ts             # Custom test runner
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:components
npm run test:hooks

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run CI pipeline (lint + typecheck + all tests)
npm run test:ci
```

### Advanced Usage

```bash
# Watch specific test type
npm run test:watch unit

# Run tests with coverage
npm run test:coverage

# Lint test files
npm run test:lint

# Type check test files
npm run test:typecheck
```

## Writing Tests

### Unit Tests

Unit tests should focus on testing individual functions or components in isolation.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from '../hooks/use-my-hook';
import { createTestQueryClient } from './test-utils';

describe('MyHook Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useMyHook(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

### End-to-End Tests

E2E tests simulate complete user workflows.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../test-utils';
import { App } from '../app';

describe('User Authentication Flow', () => {
  it('should complete login flow', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Fill login form
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // Verify successful login
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

## Testing Utilities

### Custom Render Function

Use the custom render function from `test-utils.tsx` for components that need providers:

```typescript
import { render, screen } from '../test-utils';

// This automatically wraps components with necessary providers
render(<MyComponent />);
```

### Mock Data

Use predefined mock data from `test-utils.tsx`:

```typescript
import { mockUser, mockCompany, mockProduct } from '../test-utils';

// Use in your tests
expect(result.current.user).toEqual(mockUser);
```

### Test Configuration

Access test configuration from `test-config.ts`:

```typescript
import { TEST_CONFIG, testUtils } from '../test-config';

// Use predefined timeouts
await testUtils.wait(TEST_CONFIG.timeouts.medium);

// Use mock API responses
const response = TEST_CONFIG.apiResponses.success([mockUser]);
```

## Mocking Guidelines

### Supabase Client

The Supabase client is automatically mocked in the test setup. You can override specific methods:

```typescript
import { supabase } from '../supabase';

// Mock specific method
(supabase.from as any).mockReturnValue({
  select: vi.fn().mockResolvedValue({
    data: [mockUser],
    error: null,
  }),
});
```

### Next.js Router

Next.js router is mocked globally. You can access the mock:

```typescript
import { useRouter } from 'next/navigation';

const mockPush = vi.fn();
(useRouter as any).mockReturnValue({
  push: mockPush,
});

// Test navigation
expect(mockPush).toHaveBeenCalledWith('/dashboard');
```

### Environment Variables

Environment variables are mocked in the test setup. Override as needed:

```typescript
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

// Run your test

process.env.NODE_ENV = originalEnv;
```

## Best Practices

### 1. Test Structure

- Use descriptive test names that explain what is being tested
- Group related tests using `describe` blocks
- Use `beforeEach` and `afterEach` for setup and cleanup

### 2. Assertions

- Use specific assertions that clearly indicate what is expected
- Prefer `toBeInTheDocument()` over `toBeTruthy()` for DOM elements
- Use `waitFor` for asynchronous operations

### 3. Mocking

- Mock external dependencies at the module level
- Use `vi.clearAllMocks()` in `beforeEach` to reset mocks
- Mock only what you need to test the specific functionality

### 4. Async Testing

- Always use `await` with async operations
- Use `waitFor` for DOM updates and state changes
- Set appropriate timeouts for slow operations

### 5. Error Testing

- Test both success and error scenarios
- Verify error messages and error handling
- Test error recovery mechanisms

## Coverage Requirements

We aim for the following coverage targets:

- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% line coverage
- **Critical Paths**: 100% coverage for authentication, payments, and data operations

## Continuous Integration

The CI pipeline runs:

1. ESLint on test files
2. TypeScript type checking
3. All test suites
4. Coverage report generation

Tests must pass before code can be merged.

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npx vitest run lib/__tests__/my-test.test.ts

# Run tests matching pattern
npx vitest run --grep "should handle errors"
```

### Debug Mode

```bash
# Run tests in debug mode
npx vitest --inspect-brk

# Run with verbose output
npx vitest --reporter=verbose
```

### Common Issues

1. **Tests timing out**: Increase timeout or check for unresolved promises
2. **Mock not working**: Ensure mock is set up before the component renders
3. **DOM not updating**: Use `waitFor` to wait for async updates
4. **Memory leaks**: Clean up subscriptions and timers in test cleanup

## Performance Testing

### Measuring Render Performance

```typescript
import { performanceUtils } from '../test-config';

it('should render quickly', async () => {
  const renderTime = await performanceUtils.measureRenderTime(() => {
    render(<MyComponent />);
  });
  
  expect(renderTime).toBeLessThan(100); // 100ms threshold
});
```

### Memory Leak Detection

```typescript
import { performanceUtils } from '../test-config';

it('should not leak memory', () => {
  const memoryCheck = performanceUtils.checkMemoryLeaks();
  
  // Render and unmount component multiple times
  for (let i = 0; i < 10; i++) {
    const { unmount } = render(<MyComponent />);
    unmount();
  }
  
  const memoryIncrease = memoryCheck.check();
  expect(memoryIncrease).toBeLessThan(1000000); // 1MB threshold
});
```

## Accessibility Testing

### Basic A11y Checks

```typescript
import { a11yUtils } from '../test-config';

it('should be accessible', () => {
  render(<MyComponent />);
  
  const element = screen.getByRole('button');
  const ariaCheck = a11yUtils.checkAriaAttributes(element);
  
  expect(ariaCheck.hasAllRequired).toBe(true);
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)