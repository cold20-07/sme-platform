import { useCallback, useMemo } from 'react';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useLoadingState } from '@/lib/loading-state-context';
import { LoadingState, createLoadingState, combineLoadingStates } from '@/lib/react-query';

export interface EnhancedLoadingOptions {
  operationId?: string;
  label?: string;
  category?: 'query' | 'mutation' | 'navigation' | 'upload' | 'download' | 'auth' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  showGlobalIndicator?: boolean;
  stages?: string[];
  estimatedDuration?: number;
}

export interface EnhancedLoadingState extends LoadingState {
  operationId?: string;
  duration?: number;
  estimatedTimeRemaining?: number;
  stage?: string;
  canCancel?: boolean;
  cancel?: () => void;
}

// Hook for enhancing React Query results with global loading state
export function useEnhancedLoading<T = any>(
  queryOrMutation: UseQueryResult<T> | UseMutationResult<T>,
  options: EnhancedLoadingOptions = {}
): EnhancedLoadingState {
  const {
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    cancelOperation,
    getOperationDuration,
    state,
  } = useLoadingState();

  const operationId = options.operationId || `query-${Math.random().toString(36).substr(2, 9)}`;
  const operation = state.operations.get(operationId);
  const error = state.errors.get(operationId);

  // Create base loading state from React Query result
  const baseLoadingState = useMemo(() => {
    return createLoadingState(queryOrMutation);
  }, [queryOrMutation]);

  // Manage global loading state based on React Query state
  const manageGlobalState = useCallback(() => {
    if (options.showGlobalIndicator === false) return;

    const isLoading = baseLoadingState.isLoading || baseLoadingState.isPending;
    const hasError = baseLoadingState.isError;

    if (isLoading && !operation) {
      startOperation({
        id: operationId,
        label: options.label || 'Loading...',
        category: options.category || 'query',
        priority: options.priority || 'medium',
        cancellable: 'refetch' in queryOrMutation,
        onCancel: 'refetch' in queryOrMutation ? () => {
          // For queries, we can't really cancel but we can mark as cancelled
          cancelOperation(operationId);
        } : undefined,
      });
    } else if (!isLoading && operation) {
      if (hasError) {
        failOperation(operationId, baseLoadingState.error || new Error('Unknown error'));
      } else {
        completeOperation(operationId);
      }
    }
  }, [
    baseLoadingState,
    operation,
    operationId,
    options,
    startOperation,
    completeOperation,
    failOperation,
    cancelOperation,
    queryOrMutation,
  ]);

  // Update global state when React Query state changes
  React.useEffect(() => {
    manageGlobalState();
  }, [manageGlobalState]);

  // Calculate enhanced properties
  const duration = operation ? getOperationDuration(operationId) : 0;
  const estimatedTimeRemaining = options.estimatedDuration && duration > 0 
    ? Math.max(0, options.estimatedDuration - duration)
    : undefined;

  const cancel = useCallback(() => {
    if ('refetch' in queryOrMutation) {
      // For queries, we can't cancel but we can stop showing the loading state
      cancelOperation(operationId);
    } else if ('reset' in queryOrMutation) {
      // For mutations, we can reset
      queryOrMutation.reset();
      cancelOperation(operationId);
    }
  }, [queryOrMutation, cancelOperation, operationId]);

  return {
    ...baseLoadingState,
    operationId,
    duration,
    estimatedTimeRemaining,
    stage: operation?.stage,
    canCancel: operation?.cancellable || false,
    cancel,
  };
}

// Hook for managing multiple queries/mutations with enhanced loading
export function useEnhancedLoadingMultiple<T extends Record<string, UseQueryResult | UseMutationResult>>(
  queriesOrMutations: T,
  options: EnhancedLoadingOptions & {
    combineStrategy?: 'all' | 'any' | 'priority';
    priorityOrder?: (keyof T)[];
  } = {}
): EnhancedLoadingState & {
  individual: Record<keyof T, EnhancedLoadingState>;
  loadingCount: number;
  errorCount: number;
  successCount: number;
} {
  const individual = useMemo(() => {
    return Object.entries(queriesOrMutations).reduce((acc, [key, queryOrMutation]) => {
      acc[key as keyof T] = useEnhancedLoading(queryOrMutation, {
        ...options,
        operationId: `${options.operationId || 'multi'}-${key}`,
        label: `${options.label || 'Loading'} ${key}`,
        showGlobalIndicator: false, // We'll manage this at the combined level
      });
      return acc;
    }, {} as Record<keyof T, EnhancedLoadingState>);
  }, [queriesOrMutations, options]);

  const states = Object.values(individual);
  const loadingCount = states.filter(state => state.isLoading).length;
  const errorCount = states.filter(state => state.isError).length;
  const successCount = states.filter(state => state.isSuccess).length;

  // Combine states based on strategy
  const combinedState = useMemo(() => {
    const baseStates = states.map(state => ({
      isLoading: state.isLoading,
      isError: state.isError,
      error: state.error,
      isSuccess: state.isSuccess,
      isFetching: state.isFetching,
      isRefetching: state.isRefetching,
      isPending: state.isPending,
      isStale: state.isStale,
    }));

    const combined = combineLoadingStates(...baseStates);

    // Apply combination strategy
    switch (options.combineStrategy) {
      case 'any':
        // Loading if any is loading, success if any is success
        return {
          ...combined,
          isLoading: states.some(state => state.isLoading),
          isSuccess: states.some(state => state.isSuccess),
        };
      
      case 'priority':
        // Use priority order to determine state
        if (options.priorityOrder) {
          for (const key of options.priorityOrder) {
            const state = individual[key];
            if (state.isLoading) {
              return { ...combined, isLoading: true, isSuccess: false };
            }
            if (state.isError) {
              return { ...combined, isError: true, error: state.error };
            }
            if (state.isSuccess) {
              return { ...combined, isSuccess: true };
            }
          }
        }
        return combined;
      
      case 'all':
      default:
        // Default behavior - all must succeed for success, any loading means loading
        return combined;
    }
  }, [states, individual, options.combineStrategy, options.priorityOrder]);

  // Manage global loading state for combined operations
  const { startOperation, completeOperation, failOperation, state } = useLoadingState();
  const combinedOperationId = options.operationId || 'combined-operation';
  const operation = state.operations.get(combinedOperationId);

  React.useEffect(() => {
    if (options.showGlobalIndicator === false) return;

    if (combinedState.isLoading && !operation) {
      startOperation({
        id: combinedOperationId,
        label: options.label || `Loading ${Object.keys(queriesOrMutations).length} items...`,
        category: options.category || 'query',
        priority: options.priority || 'medium',
        progress: successCount > 0 ? (successCount / states.length) * 100 : undefined,
      });
    } else if (!combinedState.isLoading && operation) {
      if (combinedState.isError) {
        failOperation(combinedOperationId, combinedState.error || new Error('Multiple operations failed'));
      } else {
        completeOperation(combinedOperationId);
      }
    } else if (operation && combinedState.isLoading) {
      // Update progress
      const progress = states.length > 0 ? (successCount / states.length) * 100 : 0;
      if (progress !== operation.progress) {
        updateOperation(combinedOperationId, { progress });
      }
    }
  }, [
    combinedState,
    operation,
    combinedOperationId,
    options,
    startOperation,
    completeOperation,
    failOperation,
    updateOperation,
    successCount,
    states.length,
    queriesOrMutations,
  ]);

  const cancel = useCallback(() => {
    Object.values(individual).forEach(state => {
      if (state.canCancel && state.cancel) {
        state.cancel();
      }
    });
  }, [individual]);

  return {
    ...combinedState,
    operationId: combinedOperationId,
    duration: Math.max(...states.map(state => state.duration || 0)),
    stage: operation?.stage,
    canCancel: Object.values(individual).some(state => state.canCancel),
    cancel,
    individual,
    loadingCount,
    errorCount,
    successCount,
  };
}

// Hook for progressive loading with stages
export function useProgressiveLoading<T extends Record<string, UseQueryResult | UseMutationResult>>(
  stages: Array<{
    name: string;
    queries: (keyof T)[];
    required?: boolean;
  }>,
  queriesOrMutations: T,
  options: EnhancedLoadingOptions = {}
): EnhancedLoadingState & {
  currentStage: number;
  stageProgress: number;
  overallProgress: number;
  stageStates: Array<{
    name: string;
    isComplete: boolean;
    isLoading: boolean;
    isError: boolean;
    progress: number;
  }>;
} {
  const individual = useMemo(() => {
    return Object.entries(queriesOrMutations).reduce((acc, [key, queryOrMutation]) => {
      acc[key as keyof T] = useEnhancedLoading(queryOrMutation, {
        ...options,
        operationId: `${options.operationId || 'progressive'}-${key}`,
        showGlobalIndicator: false,
      });
      return acc;
    }, {} as Record<keyof T, EnhancedLoadingState>);
  }, [queriesOrMutations, options]);

  // Calculate stage states
  const stageStates = useMemo(() => {
    return stages.map(stage => {
      const stageQueries = stage.queries.map(key => individual[key]);
      const completedQueries = stageQueries.filter(query => query.isSuccess).length;
      const loadingQueries = stageQueries.filter(query => query.isLoading).length;
      const errorQueries = stageQueries.filter(query => query.isError).length;

      return {
        name: stage.name,
        isComplete: completedQueries === stageQueries.length,
        isLoading: loadingQueries > 0,
        isError: errorQueries > 0 && stage.required !== false,
        progress: stageQueries.length > 0 ? (completedQueries / stageQueries.length) * 100 : 0,
      };
    });
  }, [stages, individual]);

  // Calculate current stage and progress
  const currentStage = useMemo(() => {
    const incompleteStageIndex = stageStates.findIndex(stage => !stage.isComplete);
    return incompleteStageIndex >= 0 ? incompleteStageIndex : stageStates.length - 1;
  }, [stageStates]);

  const stageProgress = stageStates[currentStage]?.progress || 0;
  const overallProgress = useMemo(() => {
    const completedStages = stageStates.filter(stage => stage.isComplete).length;
    const currentStageProgress = stageProgress / 100;
    return ((completedStages + currentStageProgress) / stageStates.length) * 100;
  }, [stageStates, stageProgress]);

  // Determine overall state
  const isLoading = stageStates.some(stage => stage.isLoading);
  const isError = stageStates.some(stage => stage.isError);
  const isSuccess = stageStates.every(stage => stage.isComplete);

  // Manage global loading state
  const { startOperation, updateOperation, completeOperation, failOperation, state } = useLoadingState();
  const operationId = options.operationId || 'progressive-loading';
  const operation = state.operations.get(operationId);

  React.useEffect(() => {
    if (options.showGlobalIndicator === false) return;

    const currentStageName = stageStates[currentStage]?.name || 'Loading...';

    if (isLoading && !operation) {
      startOperation({
        id: operationId,
        label: options.label || 'Loading...',
        category: options.category || 'query',
        priority: options.priority || 'medium',
        progress: overallProgress,
        stage: currentStageName,
      });
    } else if (!isLoading && operation) {
      if (isError) {
        const errorStage = stageStates.find(stage => stage.isError);
        failOperation(operationId, new Error(`Failed at stage: ${errorStage?.name}`));
      } else {
        completeOperation(operationId);
      }
    } else if (operation && isLoading) {
      updateOperation(operationId, {
        progress: overallProgress,
        stage: currentStageName,
      });
    }
  }, [
    isLoading,
    isError,
    operation,
    operationId,
    options,
    overallProgress,
    currentStage,
    stageStates,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
  ]);

  const cancel = useCallback(() => {
    Object.values(individual).forEach(state => {
      if (state.canCancel && state.cancel) {
        state.cancel();
      }
    });
  }, [individual]);

  return {
    isLoading,
    isError,
    isSuccess,
    error: stageStates.find(stage => stage.isError) ? new Error('Progressive loading failed') : null,
    isFetching: isLoading,
    isRefetching: false,
    isPending: isLoading,
    isStale: false,
    operationId,
    duration: Math.max(...Object.values(individual).map(state => state.duration || 0)),
    stage: stageStates[currentStage]?.name,
    canCancel: Object.values(individual).some(state => state.canCancel),
    cancel,
    currentStage,
    stageProgress,
    overallProgress,
    stageStates,
  };
}