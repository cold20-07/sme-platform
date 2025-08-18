import { useCallback, useRef } from 'react';
import { useLoadingState, LoadingOperation } from '@/lib/loading-state-context';
import { toast } from 'sonner';

export interface AsyncOperationOptions {
  id: string;
  label: string;
  category?: LoadingOperation['category'];
  priority?: LoadingOperation['priority'];
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  retryable?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  stages?: string[];
}

export interface AsyncOperationState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  retryCount: number;
  canRetry: boolean;
  progress?: number;
  stage?: string;
}

export function useAsyncOperation<T = any>(options: AsyncOperationOptions) {
  const {
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    retryOperation,
    state,
  } = useLoadingState();

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const operation = state.operations.get(options.id);
  const error = state.errors.get(options.id);

  const operationState: AsyncOperationState = {
    isLoading: !!operation,
    isError: !!error,
    error: error?.error || null,
    retryCount: error?.retryCount || 0,
    canRetry: options.retryable !== false && (error?.retryCount || 0) < (options.maxRetries || 3),
    progress: operation?.progress,
    stage: operation?.stage,
  };

  const execute = useCallback(async (
    asyncFn: (signal?: AbortSignal) => Promise<T>,
    executeOptions?: {
      stages?: string[];
      onProgress?: (progress: number, stage?: string) => void;
    }
  ): Promise<T | null> => {
    try {
      // Cancel any existing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Start the operation
      startOperation({
        id: options.id,
        label: options.label,
        category: options.category || 'other',
        priority: options.priority || 'medium',
        cancellable: true,
        onCancel: () => {
          abortControllerRef.current?.abort();
        },
      });

      // Set up progress tracking
      const progressCallback = executeOptions?.onProgress || (() => {});
      const stages = executeOptions?.stages || options.stages || [];
      
      let currentStageIndex = 0;
      const updateProgress = (progress: number, stage?: string) => {
        updateOperation(options.id, { 
          progress, 
          stage: stage || stages[currentStageIndex] 
        });
        progressCallback(progress, stage);
      };

      // Execute the async function
      const result = await asyncFn(signal);

      // Complete the operation
      completeOperation(options.id);
      retryCountRef.current = 0;

      // Show success toast if enabled
      if (options.showSuccessToast !== false) {
        toast.success(options.successMessage || `${options.label} completed successfully`);
      }

      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const error = err as Error;

      // Don't handle aborted operations as errors
      if (error.name === 'AbortError') {
        return null;
      }

      // Fail the operation
      failOperation(options.id, error);
      retryCountRef.current++;

      // Show error toast if enabled
      if (options.showErrorToast !== false) {
        toast.error(`Failed: ${options.label}`, {
          description: error.message,
        });
      }

      // Call error callback
      if (options.onError) {
        options.onError(error);
      }

      throw error;
    }
  }, [
    options.id,
    options.label,
    options.category,
    options.priority,
    options.showSuccessToast,
    options.showErrorToast,
    options.successMessage,
    options.onSuccess,
    options.onError,
    options.stages,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
  ]);

  const retry = useCallback(async (
    asyncFn: (signal?: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    if (!operationState.canRetry) {
      throw new Error('Operation cannot be retried');
    }

    // Add delay before retry
    if (options.retryDelay && options.retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, options.retryDelay));
    }

    return retryOperation(options.id, async () => {
      return execute(asyncFn);
    });
  }, [options.id, options.retryDelay, operationState.canRetry, retryOperation, execute]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const updateProgress = useCallback((progress: number, stage?: string) => {
    if (operation) {
      updateOperation(options.id, { progress, stage });
    }
  }, [options.id, operation, updateOperation]);

  const setStage = useCallback((stage: string) => {
    if (operation) {
      updateOperation(options.id, { stage });
    }
  }, [options.id, operation, updateOperation]);

  return {
    ...operationState,
    execute,
    retry,
    cancel,
    updateProgress,
    setStage,
  };
}

// Hook for managing multiple async operations
export function useAsyncOperations<T extends Record<string, AsyncOperationOptions>>(
  operations: T
) {
  const hooks = Object.entries(operations).reduce((acc, [key, options]) => {
    acc[key as keyof T] = useAsyncOperation(options);
    return acc;
  }, {} as Record<keyof T, ReturnType<typeof useAsyncOperation>>);

  const isAnyLoading = Object.values(hooks).some(hook => hook.isLoading);
  const hasAnyError = Object.values(hooks).some(hook => hook.isError);
  const errors = Object.values(hooks)
    .filter(hook => hook.error)
    .map(hook => hook.error!);

  const executeAll = useCallback(async (
    asyncFunctions: Record<keyof T, (signal?: AbortSignal) => Promise<any>>
  ) => {
    const results = await Promise.allSettled(
      Object.entries(asyncFunctions).map(([key, fn]) => 
        hooks[key as keyof T].execute(fn)
      )
    );

    const successful = results
      .map((result, index) => ({
        key: Object.keys(asyncFunctions)[index],
        result: result.status === 'fulfilled' ? result.value : null,
      }))
      .filter(item => item.result !== null);

    const failed = results
      .map((result, index) => ({
        key: Object.keys(asyncFunctions)[index],
        error: result.status === 'rejected' ? result.reason : null,
      }))
      .filter(item => item.error !== null);

    return { successful, failed };
  }, [hooks]);

  const cancelAll = useCallback(() => {
    Object.values(hooks).forEach(hook => hook.cancel());
  }, [hooks]);

  return {
    operations: hooks,
    isAnyLoading,
    hasAnyError,
    errors,
    executeAll,
    cancelAll,
  };
}

// Hook for managing paginated async operations
export function usePaginatedAsyncOperation<T>(options: AsyncOperationOptions & {
  pageSize?: number;
  initialPage?: number;
}) {
  const baseOperation = useAsyncOperation(options);
  const currentPageRef = useRef(options.initialPage || 1);
  const hasMoreRef = useRef(true);
  const allDataRef = useRef<T[]>([]);

  const loadPage = useCallback(async (
    asyncFn: (page: number, pageSize: number, signal?: AbortSignal) => Promise<{
      data: T[];
      hasMore: boolean;
      total?: number;
    }>,
    page: number = currentPageRef.current
  ) => {
    const pageSize = options.pageSize || 20;
    
    return baseOperation.execute(async (signal) => {
      const result = await asyncFn(page, pageSize, signal);
      
      if (page === 1) {
        allDataRef.current = result.data;
      } else {
        allDataRef.current = [...allDataRef.current, ...result.data];
      }
      
      currentPageRef.current = page;
      hasMoreRef.current = result.hasMore;
      
      return {
        ...result,
        allData: allDataRef.current,
        currentPage: page,
      };
    });
  }, [baseOperation, options.pageSize]);

  const loadNext = useCallback(async (
    asyncFn: (page: number, pageSize: number, signal?: AbortSignal) => Promise<{
      data: T[];
      hasMore: boolean;
      total?: number;
    }>
  ) => {
    if (!hasMoreRef.current) {
      return null;
    }
    
    return loadPage(asyncFn, currentPageRef.current + 1);
  }, [loadPage]);

  const refresh = useCallback(async (
    asyncFn: (page: number, pageSize: number, signal?: AbortSignal) => Promise<{
      data: T[];
      hasMore: boolean;
      total?: number;
    }>
  ) => {
    allDataRef.current = [];
    currentPageRef.current = 1;
    hasMoreRef.current = true;
    
    return loadPage(asyncFn, 1);
  }, [loadPage]);

  return {
    ...baseOperation,
    loadPage,
    loadNext,
    refresh,
    currentPage: currentPageRef.current,
    hasMore: hasMoreRef.current,
    allData: allDataRef.current,
  };
}