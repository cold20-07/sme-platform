import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAsyncOperation, useAsyncOperations, usePaginatedAsyncOperation } from '../use-async-operation';
import { LoadingStateProvider } from '@/lib/loading-state-context';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock async functions
const mockSuccessfulAsync = jest.fn().mockImplementation(() => 
  new Promise(resolve => setTimeout(() => resolve('success'), 100))
);

const mockFailingAsync = jest.fn().mockImplementation(() => 
  new Promise((_, reject) => setTimeout(() => reject(new Error('Test error')), 100))
);

const mockAbortableAsync = jest.fn().mockImplementation((signal?: AbortSignal) => 
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve('success'), 1000);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('AbortError'));
    });
  })
);

// Test component for useAsyncOperation
function AsyncOperationTestComponent() {
  const operation = useAsyncOperation({
    id: 'test-operation',
    label: 'Test Operation',
    category: 'other',
    priority: 'medium',
    showSuccessToast: true,
    showErrorToast: true,
    retryable: true,
    maxRetries: 3,
  });

  return (
    <div>
      <div data-testid="is-loading">{operation.isLoading.toString()}</div>
      <div data-testid="is-error">{operation.isError.toString()}</div>
      <div data-testid="can-retry">{operation.canRetry.toString()}</div>
      <div data-testid="retry-count">{operation.retryCount}</div>
      <div data-testid="error-message">{operation.error?.message || 'none'}</div>
      
      <button
        data-testid="execute-success"
        onClick={() => operation.execute(mockSuccessfulAsync)}
      >
        Execute Success
      </button>
      
      <button
        data-testid="execute-failure"
        onClick={() => operation.execute(mockFailingAsync)}
      >
        Execute Failure
      </button>
      
      <button
        data-testid="execute-abortable"
        onClick={() => operation.execute(mockAbortableAsync)}
      >
        Execute Abortable
      </button>
      
      <button
        data-testid="retry"
        onClick={() => operation.retry(mockSuccessfulAsync)}
        disabled={!operation.canRetry}
      >
        Retry
      </button>
      
      <button
        data-testid="cancel"
        onClick={() => operation.cancel()}
      >
        Cancel
      </button>
    </div>
  );
}

// Test component for useAsyncOperations
function AsyncOperationsTestComponent() {
  const operations = useAsyncOperations({
    op1: {
      id: 'multi-op-1',
      label: 'Operation 1',
      category: 'other',
      priority: 'medium',
    },
    op2: {
      id: 'multi-op-2',
      label: 'Operation 2',
      category: 'other',
      priority: 'medium',
    },
  });

  return (
    <div>
      <div data-testid="is-any-loading">{operations.isAnyLoading.toString()}</div>
      <div data-testid="has-any-error">{operations.hasAnyError.toString()}</div>
      <div data-testid="error-count">{operations.errors.length}</div>
      
      <button
        data-testid="execute-all-success"
        onClick={() => operations.executeAll({
          op1: mockSuccessfulAsync,
          op2: mockSuccessfulAsync,
        })}
      >
        Execute All Success
      </button>
      
      <button
        data-testid="execute-all-mixed"
        onClick={() => operations.executeAll({
          op1: mockSuccessfulAsync,
          op2: mockFailingAsync,
        })}
      >
        Execute All Mixed
      </button>
      
      <button
        data-testid="cancel-all"
        onClick={() => operations.cancelAll()}
      >
        Cancel All
      </button>
    </div>
  );
}

// Test component for usePaginatedAsyncOperation
function PaginatedAsyncOperationTestComponent() {
  const mockPaginatedAsync = jest.fn().mockImplementation((page: number, pageSize: number) => 
    new Promise(resolve => setTimeout(() => resolve({
      data: Array.from({ length: pageSize }, (_, i) => ({ id: `item-${(page - 1) * pageSize + i + 1}` })),
      hasMore: page < 3,
      total: 30,
    }), 100))
  );

  const operation = usePaginatedAsyncOperation({
    id: 'paginated-operation',
    label: 'Paginated Operation',
    category: 'query',
    priority: 'medium',
    pageSize: 10,
  });

  return (
    <div>
      <div data-testid="is-loading">{operation.isLoading.toString()}</div>
      <div data-testid="current-page">{operation.currentPage}</div>
      <div data-testid="has-more">{operation.hasMore.toString()}</div>
      <div data-testid="all-data-count">{operation.allData.length}</div>
      
      <button
        data-testid="load-first-page"
        onClick={() => operation.loadPage(mockPaginatedAsync, 1)}
      >
        Load First Page
      </button>
      
      <button
        data-testid="load-next-page"
        onClick={() => operation.loadNext(mockPaginatedAsync)}
      >
        Load Next Page
      </button>
      
      <button
        data-testid="refresh"
        onClick={() => operation.refresh(mockPaginatedAsync)}
      >
        Refresh
      </button>
    </div>
  );
}

function renderWithProvider(component: React.ReactElement) {
  return render(
    <LoadingStateProvider>
      {component}
    </LoadingStateProvider>
  );
}

describe('useAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute successful operations', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationTestComponent />);

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');

    await user.click(screen.getByTestId('execute-success'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });

    expect(mockSuccessfulAsync).toHaveBeenCalledTimes(1);
  });

  it('should handle operation failures', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationTestComponent />);

    await user.click(screen.getByTestId('execute-failure'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('is-error')).toHaveTextContent('true');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
    });

    expect(mockFailingAsync).toHaveBeenCalledTimes(1);
  });

  it('should support retry functionality', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationTestComponent />);

    // First, fail an operation
    await user.click(screen.getByTestId('execute-failure'));
    await waitFor(() => {
      expect(screen.getByTestId('is-error')).toHaveTextContent('true');
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true');
      expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
    });

    // Then retry with a successful operation
    await user.click(screen.getByTestId('retry'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('is-error')).toHaveTextContent('false');
    });
  });

  it('should support cancellation', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationTestComponent />);

    await user.click(screen.getByTestId('execute-abortable'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    await user.click(screen.getByTestId('cancel'));
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });

    // The operation should have been aborted
    expect(mockAbortableAsync).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('should limit retry attempts', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationTestComponent />);

    // Fail the operation multiple times
    for (let i = 0; i < 4; i++) {
      if (i === 0) {
        await user.click(screen.getByTestId('execute-failure'));
      } else {
        await user.click(screen.getByTestId('retry'));
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('is-error')).toHaveTextContent('true');
      });
    }

    // After max retries, should not be able to retry anymore
    await waitFor(() => {
      expect(screen.getByTestId('can-retry')).toHaveTextContent('false');
      expect(screen.getByTestId('retry-count')).toHaveTextContent('4');
    });
  });
});

describe('useAsyncOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute multiple operations successfully', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationsTestComponent />);

    expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');

    await user.click(screen.getByTestId('execute-all-success'));
    expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('has-any-error')).toHaveTextContent('false');
    });

    expect(mockSuccessfulAsync).toHaveBeenCalledTimes(2);
  });

  it('should handle mixed success and failure', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationsTestComponent />);

    await user.click(screen.getByTestId('execute-all-mixed'));
    expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('has-any-error')).toHaveTextContent('true');
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    });

    expect(mockSuccessfulAsync).toHaveBeenCalledTimes(1);
    expect(mockFailingAsync).toHaveBeenCalledTimes(1);
  });

  it('should cancel all operations', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AsyncOperationsTestComponent />);

    await user.click(screen.getByTestId('execute-all-success'));
    expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');

    await user.click(screen.getByTestId('cancel-all'));
    
    await waitFor(() => {
      expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
    });
  });
});

describe('usePaginatedAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load first page', async () => {
    const user = userEvent.setup();
    renderWithProvider(<PaginatedAsyncOperationTestComponent />);

    expect(screen.getByTestId('current-page')).toHaveTextContent('1');
    expect(screen.getByTestId('all-data-count')).toHaveTextContent('0');

    await user.click(screen.getByTestId('load-first-page'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('10');
      expect(screen.getByTestId('has-more')).toHaveTextContent('true');
    });
  });

  it('should load next page and accumulate data', async () => {
    const user = userEvent.setup();
    renderWithProvider(<PaginatedAsyncOperationTestComponent />);

    // Load first page
    await user.click(screen.getByTestId('load-first-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('10');
    });

    // Load next page
    await user.click(screen.getByTestId('load-next-page'));
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('current-page')).toHaveTextContent('2');
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('20');
      expect(screen.getByTestId('has-more')).toHaveTextContent('true');
    });
  });

  it('should refresh and reset data', async () => {
    const user = userEvent.setup();
    renderWithProvider(<PaginatedAsyncOperationTestComponent />);

    // Load some pages first
    await user.click(screen.getByTestId('load-first-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('10');
    });

    await user.click(screen.getByTestId('load-next-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('20');
      expect(screen.getByTestId('current-page')).toHaveTextContent('2');
    });

    // Refresh should reset to first page
    await user.click(screen.getByTestId('refresh'));
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('10');
    });
  });

  it('should handle end of pagination', async () => {
    const user = userEvent.setup();
    renderWithProvider(<PaginatedAsyncOperationTestComponent />);

    // Load all pages
    await user.click(screen.getByTestId('load-first-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('10');
    });

    await user.click(screen.getByTestId('load-next-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('20');
    });

    await user.click(screen.getByTestId('load-next-page'));
    await waitFor(() => {
      expect(screen.getByTestId('all-data-count')).toHaveTextContent('30');
      expect(screen.getByTestId('has-more')).toHaveTextContent('false');
    });
  });
});