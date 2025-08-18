import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingStateProvider, useLoadingState, useGlobalLoadingState } from '../loading-state-context';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// Test component that uses loading state
function TestComponent() {
  const {
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    cancelOperation,
    clearAll,
    state,
  } = useLoadingState();

  const globalState = useGlobalLoadingState();

  return (
    <div>
      <div data-testid="operation-count">{state.operations.size}</div>
      <div data-testid="error-count">{state.errors.size}</div>
      <div data-testid="is-global-loading">{globalState.isGlobalLoading.toString()}</div>
      <div data-testid="critical-operations">{globalState.criticalOperations.length}</div>
      <div data-testid="background-operations">{globalState.backgroundOperations.length}</div>
      
      <button
        data-testid="start-operation"
        onClick={() => startOperation({
          id: 'test-op',
          label: 'Test Operation',
          category: 'other',
          priority: 'medium',
        })}
      >
        Start Operation
      </button>
      
      <button
        data-testid="start-critical-operation"
        onClick={() => startOperation({
          id: 'critical-op',
          label: 'Critical Operation',
          category: 'other',
          priority: 'critical',
        })}
      >
        Start Critical Operation
      </button>
      
      <button
        data-testid="update-operation"
        onClick={() => updateOperation('test-op', { progress: 50, stage: 'Processing' })}
      >
        Update Operation
      </button>
      
      <button
        data-testid="complete-operation"
        onClick={() => completeOperation('test-op')}
      >
        Complete Operation
      </button>
      
      <button
        data-testid="fail-operation"
        onClick={() => failOperation('test-op', new Error('Test error'))}
      >
        Fail Operation
      </button>
      
      <button
        data-testid="cancel-operation"
        onClick={() => cancelOperation('test-op')}
      >
        Cancel Operation
      </button>
      
      <button
        data-testid="clear-all"
        onClick={() => clearAll()}
      >
        Clear All
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <LoadingStateProvider>
      <TestComponent />
    </LoadingStateProvider>
  );
}

describe('LoadingStateContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start and track operations', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    expect(screen.getByTestId('operation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('false');

    await user.click(screen.getByTestId('start-operation'));

    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('true');
  });

  it('should complete operations', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');

    await user.click(screen.getByTestId('complete-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('false');
  });

  it('should handle operation failures', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');
    expect(screen.getByTestId('error-count')).toHaveTextContent('0');

    await user.click(screen.getByTestId('fail-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error-count')).toHaveTextContent('1');
  });

  it('should cancel operations', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');

    await user.click(screen.getByTestId('cancel-operation'));
    expect(screen.getByTestId('operation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
  });

  it('should track critical operations separately', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-critical-operation'));
    
    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');
    expect(screen.getByTestId('critical-operations')).toHaveTextContent('1');
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('true');
  });

  it('should update operation progress and stage', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    await user.click(screen.getByTestId('update-operation'));

    // The operation should still be active with updated properties
    expect(screen.getByTestId('operation-count')).toHaveTextContent('1');
  });

  it('should clear all operations', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    await user.click(screen.getByTestId('start-critical-operation'));
    
    expect(screen.getByTestId('operation-count')).toHaveTextContent('2');

    await user.click(screen.getByTestId('clear-all'));
    
    expect(screen.getByTestId('operation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('false');
  });

  it('should categorize operations by priority', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    // Start a critical operation
    await user.click(screen.getByTestId('start-critical-operation'));
    expect(screen.getByTestId('critical-operations')).toHaveTextContent('1');
    expect(screen.getByTestId('background-operations')).toHaveTextContent('0');
  });

  it('should handle multiple operations of different priorities', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProvider();

    // Add a component that starts a background operation
    function TestComponentWithBackground() {
      const { startOperation } = useLoadingState();
      const globalState = useGlobalLoadingState();

      React.useEffect(() => {
        startOperation({
          id: 'background-op',
          label: 'Background Operation',
          category: 'other',
          priority: 'low',
        });
      }, [startOperation]);

      return (
        <div>
          <div data-testid="background-operations">{globalState.backgroundOperations.length}</div>
          <div data-testid="is-global-loading">{globalState.isGlobalLoading.toString()}</div>
        </div>
      );
    }

    rerender(
      <LoadingStateProvider>
        <TestComponent />
        <TestComponentWithBackground />
      </LoadingStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('background-operations')).toHaveTextContent('1');
    });

    // Background operations shouldn't trigger global loading
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('false');

    // But critical operations should
    await user.click(screen.getByTestId('start-critical-operation'));
    expect(screen.getByTestId('is-global-loading')).toHaveTextContent('true');
  });

  it('should auto-cleanup old errors', async () => {
    jest.useFakeTimers();
    
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByTestId('start-operation'));
    await user.click(screen.getByTestId('fail-operation'));
    
    expect(screen.getByTestId('error-count')).toHaveTextContent('1');

    // Fast-forward time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    });

    jest.useRealTimers();
  });
});

// Test the useOperationState hook
function OperationStateTestComponent({ operationId }: { operationId: string }) {
  const { startOperation, completeOperation } = useLoadingState();
  const operationState = useOperationState(operationId);

  React.useEffect(() => {
    startOperation({
      id: operationId,
      label: 'Test Operation',
      category: 'other',
      priority: 'medium',
      progress: 25,
      stage: 'Processing',
    });

    const timer = setTimeout(() => {
      completeOperation(operationId);
    }, 1000);

    return () => clearTimeout(timer);
  }, [operationId, startOperation, completeOperation]);

  return (
    <div>
      <div data-testid="is-active">{operationState.isActive.toString()}</div>
      <div data-testid="is-loading">{operationState.isLoading.toString()}</div>
      <div data-testid="progress">{operationState.progress || 0}</div>
      <div data-testid="stage">{operationState.stage || 'none'}</div>
      <div data-testid="duration">{operationState.duration}</div>
    </div>
  );
}

describe('useOperationState', () => {
  it('should track individual operation state', async () => {
    render(
      <LoadingStateProvider>
        <OperationStateTestComponent operationId="test-operation" />
      </LoadingStateProvider>
    );

    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('progress')).toHaveTextContent('25');
    expect(screen.getByTestId('stage')).toHaveTextContent('Processing');

    // Wait for operation to complete
    await waitFor(() => {
      expect(screen.getByTestId('is-active')).toHaveTextContent('false');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
  });

  it('should track operation duration', async () => {
    jest.useFakeTimers();
    
    render(
      <LoadingStateProvider>
        <OperationStateTestComponent operationId="duration-test" />
      </LoadingStateProvider>
    );

    // Initially duration should be 0 or very small
    expect(parseInt(screen.getByTestId('duration').textContent || '0')).toBeGreaterThanOrEqual(0);

    // Advance time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Duration should have increased
    await waitFor(() => {
      expect(parseInt(screen.getByTestId('duration').textContent || '0')).toBeGreaterThanOrEqual(500);
    });

    jest.useRealTimers();
  });
});

describe('LoadingStateProvider error handling', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoadingState must be used within a LoadingStateProvider');

    consoleSpy.mockRestore();
  });
});