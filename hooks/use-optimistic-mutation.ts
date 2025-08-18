import { useMutation, useQueryClient, MutationFunction } from '@tanstack/react-query';
import { toast } from 'sonner';

// Optimistic mutation configuration
export interface OptimisticMutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: MutationFunction<TData, TVariables>;
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: Error, variables: TVariables) => string);
  invalidateQueries?: readonly unknown[][];
  updateQueries?: {
    queryKey: readonly unknown[];
    updater: (oldData: any, newData: TData, variables: TVariables) => any;
  }[];
}

// Hook for optimistic mutations with automatic cache management
export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  config: OptimisticMutationConfig<TData, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches for queries that will be updated
      if (config.invalidateQueries) {
        await Promise.all(
          config.invalidateQueries.map(queryKey =>
            queryClient.cancelQueries({ queryKey })
          )
        );
      }

      if (config.updateQueries) {
        await Promise.all(
          config.updateQueries.map(({ queryKey }) =>
            queryClient.cancelQueries({ queryKey })
          )
        );
      }

      // Call custom onMutate if provided
      const context = config.onMutate ? await config.onMutate(variables) : undefined;

      return context as TContext;
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext) => {
      // Update specific queries if configured
      if (config.updateQueries) {
        config.updateQueries.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (oldData: any) =>
            updater(oldData, data, variables)
          );
        });
      }

      // Invalidate queries to refetch fresh data
      if (config.invalidateQueries) {
        config.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show success message
      if (config.successMessage) {
        const message = typeof config.successMessage === 'function'
          ? config.successMessage(data, variables)
          : config.successMessage;
        toast.success(message);
      }

      // Call custom onSuccess if provided
      config.onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
      // Invalidate queries to refetch correct data on error
      if (config.invalidateQueries) {
        config.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      if (config.updateQueries) {
        config.updateQueries.forEach(({ queryKey }) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show error message
      if (config.errorMessage) {
        const message = typeof config.errorMessage === 'function'
          ? config.errorMessage(error, variables)
          : config.errorMessage;
        toast.error(message);
      }

      // Call custom onError if provided
      config.onError?.(error, variables, context);
    },
  });
}

// Hook for list-based optimistic mutations (add, update, delete items in lists)
export function useOptimisticListMutation<TItem extends { id: string }, TVariables>({
  mutationFn,
  listQueryKeys,
  itemQueryKey,
  operation,
  successMessage,
  errorMessage,
}: {
  mutationFn: MutationFunction<TItem, TVariables>;
  listQueryKeys: readonly unknown[][];
  itemQueryKey?: (item: TItem) => readonly unknown[];
  operation: 'add' | 'update' | 'delete';
  successMessage?: string;
  errorMessage?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await Promise.all([
        ...listQueryKeys.map(queryKey => queryClient.cancelQueries({ queryKey })),
        ...(itemQueryKey ? [queryClient.cancelQueries({ queryKey: itemQueryKey({} as TItem) })] : []),
      ]);

      // Store previous data for rollback
      const previousData = {
        lists: listQueryKeys.map(queryKey => ({
          queryKey,
          data: queryClient.getQueryData(queryKey),
        })),
        item: itemQueryKey ? queryClient.getQueryData(itemQueryKey({} as TItem)) : null,
      };

      return previousData;
    },
    onSuccess: (data: TItem, _variables: TVariables, _context: any) => {
      // Update the item query if it exists
      if (itemQueryKey) {
        queryClient.setQueryData(itemQueryKey(data), data);
      }

      // Update list queries based on operation
      listQueryKeys.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (oldData: TItem[] | undefined) => {
          if (!oldData) return oldData;

          switch (operation) {
            case 'add':
              return [...oldData, data];
            case 'update':
              return oldData.map(item => item.id === data.id ? data : item);
            case 'delete':
              return oldData.filter(item => item.id !== data.id);
            default:
              return oldData;
          }
        });
      });

      // Invalidate to ensure fresh data
      listQueryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (error: Error, variables: TVariables, context) => {
      // Restore previous data on error
      if (context) {
        context.lists.forEach(({ queryKey, data }: { queryKey: readonly unknown[]; data: any }) => {
          queryClient.setQueryData(queryKey, data);
        });

        if (context.item && itemQueryKey) {
          queryClient.setQueryData(itemQueryKey({} as TItem), context.item);
        }
      }

      // Invalidate to refetch correct data
      listQueryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      if (errorMessage) {
        toast.error(errorMessage);
      }
    },
  });
}

// Hook for batch operations with optimistic updates
export function useOptimisticBatchMutation<TData, TVariables>({
  mutationFn,
  batchSize = 10,
  onBatchComplete,
  onAllComplete,
  successMessage,
  errorMessage,
}: {
  mutationFn: MutationFunction<TData[], TVariables[]>;
  batchSize?: number;
  onBatchComplete?: (batchResults: TData[], batchIndex: number, totalBatches: number) => void;
  onAllComplete?: (allResults: TData[]) => void;
  successMessage?: string;
  errorMessage?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables[]) => {
      const batches: TVariables[][] = [];
      for (let i = 0; i < variables.length; i += batchSize) {
        batches.push(variables.slice(i, i + batchSize));
      }

      const allResults: TData[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResults = await mutationFn(batch as TVariables[]);
        allResults.push(...batchResults);

        onBatchComplete?.(batchResults, i, batches.length);

        // Add a small delay between batches to prevent overwhelming the server
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allResults;
    },
    onSuccess: (data: TData[], _variables: TVariables[]) => {
      onAllComplete?.(data);

      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (_error: Error, _variables: TVariables[]) => {
      if (errorMessage) {
        toast.error(errorMessage);
      }
    },
  });
}

// Hook for mutations with automatic retry and exponential backoff
export function useRetryMutation<TData, TVariables>({
  mutationFn,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000,
  onRetry,
  ...config
}: OptimisticMutationConfig<TData, TVariables> & {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await mutationFn(variables);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxRetries) {
            break;
          }

          onRetry?.(attempt + 1, lastError);

          // Calculate delay with exponential backoff
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          
          // Add jitter to prevent thundering herd
          const jitteredDelay = delay + Math.random() * 1000;

          await new Promise(resolve => setTimeout(resolve, jitteredDelay));
        }
      }

      throw lastError!;
    },
    onMutate: config.onMutate,
    onSuccess: (data: TData, variables: TVariables, context) => {
      // Update queries
      if (config.updateQueries) {
        config.updateQueries.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (oldData: any) =>
            updater(oldData, data, variables)
          );
        });
      }

      // Invalidate queries
      if (config.invalidateQueries) {
        config.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show success message
      if (config.successMessage) {
        const message = typeof config.successMessage === 'function'
          ? config.successMessage(data, variables)
          : config.successMessage;
        toast.success(message);
      }

      config.onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: TVariables, context) => {
      // Invalidate queries on error
      if (config.invalidateQueries) {
        config.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show error message
      if (config.errorMessage) {
        const message = typeof config.errorMessage === 'function'
          ? config.errorMessage(error, variables)
          : config.errorMessage;
        toast.error(message);
      }

      config.onError?.(error, variables, context);
    },
  });
}