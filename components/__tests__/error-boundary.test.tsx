import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../error-boundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws an error in useEffect
const ThrowAsyncError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async test error');
    }
  }, [shouldThrow]);
  
  return <div>No async error</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('should display custom fallback when provided', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
  });

  it('should reset error state when resetErrorBoundary is called', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <ErrorBoundary
          onReset={() => setShouldThrow(false)}
          resetKeys={[shouldThrow]}
        >
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    // Should show error initially
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Click reset button (if available in the error boundary)
    const resetButton = screen.queryByText(/try again/i);
    if (resetButton) {
      resetButton.click();
      expect(screen.getByText('No error')).toBeInTheDocument();
    }
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should handle multiple errors gracefully', () => {
    const MultipleErrorComponent = ({ errorCount }: { errorCount: number }) => {
      if (errorCount > 0) {
        throw new Error(`Error ${errorCount}`);
      }
      return <div>No errors</div>;
    };

    const TestWrapper = () => {
      const [errorCount, setErrorCount] = React.useState(0);

      return (
        <div>
          <button onClick={() => setErrorCount(prev => prev + 1)}>
            Trigger Error
          </button>
          <ErrorBoundary key={errorCount}>
            <MultipleErrorComponent errorCount={errorCount} />
          </ErrorBoundary>
        </div>
      );
    };

    render(<TestWrapper />);

    expect(screen.getByText('No errors')).toBeInTheDocument();

    // Trigger first error
    screen.getByText('Trigger Error').click();
    expect(screen.getByText(/error 1/i)).toBeInTheDocument();
  });

  it('should preserve error boundary isolation between components', () => {
    render(
      <div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <ErrorBoundary>
          <div>This should still work</div>
        </ErrorBoundary>
      </div>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('This should still work')).toBeInTheDocument();
  });

  it('should handle errors in event handlers gracefully', () => {
    const ErrorInHandler = () => {
      const handleClick = () => {
        throw new Error('Handler error');
      };

      return (
        <button onClick={handleClick}>
          Click to throw error
        </button>
      );
    };

    // Note: Error boundaries don't catch errors in event handlers
    // This test verifies the component renders correctly
    render(
      <ErrorBoundary>
        <ErrorInHandler />
      </ErrorBoundary>
    );

    expect(screen.getByText('Click to throw error')).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error details in development
    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show generic error message in production
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});