'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Loading state types
export interface LoadingOperation {
  id: string;
  label: string;
  progress?: number;
  stage?: string;
  startTime: number;
  category: 'query' | 'mutation' | 'navigation' | 'upload' | 'download' | 'auth' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  cancellable?: boolean;
  onCancel?: () => void;
}

export interface GlobalLoadingState {
  operations: Map<string, LoadingOperation>;
  isGlobalLoading: boolean;
  criticalOperations: LoadingOperation[];
  backgroundOperations: LoadingOperation[];
  totalProgress: number;
  currentStage: string;
  errors: Map<string, { error: Error; timestamp: number; retryCount: number }>;
}

// Action types
type LoadingAction =
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'startTime'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: { id: string } }
  | { type: 'FAIL_OPERATION'; payload: { id: string; error: Error } }
  | { type: 'CANCEL_OPERATION'; payload: { id: string } }
  | { type: 'CLEAR_COMPLETED'; payload?: { olderThan?: number } }
  | { type: 'CLEAR_ALL' }
  | { type: 'RETRY_OPERATION'; payload: { id: string } };

// Initial state
const initialState: GlobalLoadingState = {
  operations: new Map(),
  isGlobalLoading: false,
  criticalOperations: [],
  backgroundOperations: [],
  totalProgress: 0,
  currentStage: '',
  errors: new Map(),
};

// Reducer
function loadingStateReducer(state: GlobalLoadingState, action: LoadingAction): GlobalLoadingState {
  const newOperations = new Map(state.operations);
  const newErrors = new Map(state.errors);

  switch (action.type) {
    case 'START_OPERATION': {
      const operation: LoadingOperation = {
        ...action.payload,
        startTime: Date.now(),
      };
      newOperations.set(operation.id, operation);
      
      // Clear any existing error for this operation
      newErrors.delete(operation.id);
      
      break;
    }

    case 'UPDATE_OPERATION': {
      const existing = newOperations.get(action.payload.id);
      if (existing) {
        newOperations.set(action.payload.id, {
          ...existing,
          ...action.payload.updates,
        });
      }
      break;
    }

    case 'COMPLETE_OPERATION': {
      newOperations.delete(action.payload.id);
      newErrors.delete(action.payload.id);
      break;
    }

    case 'FAIL_OPERATION': {
      const existing = newOperations.get(action.payload.id);
      if (existing) {
        newOperations.delete(action.payload.id);
        const existingError = newErrors.get(action.payload.id);
        newErrors.set(action.payload.id, {
          error: action.payload.error,
          timestamp: Date.now(),
          retryCount: (existingError?.retryCount || 0) + 1,
        });
      }
      break;
    }

    case 'CANCEL_OPERATION': {
      const operation = newOperations.get(action.payload.id);
      if (operation?.onCancel) {
        operation.onCancel();
      }
      newOperations.delete(action.payload.id);
      newErrors.delete(action.payload.id);
      break;
    }

    case 'CLEAR_COMPLETED': {
      const cutoffTime = action.payload?.olderThan || 0;
      const now = Date.now();
      
      for (const [id, errorInfo] of newErrors.entries()) {
        if (now - errorInfo.timestamp > cutoffTime) {
          newErrors.delete(id);
        }
      }
      break;
    }

    case 'CLEAR_ALL': {
      // Cancel all cancellable operations
      for (const operation of newOperations.values()) {
        if (operation.cancellable && operation.onCancel) {
          operation.onCancel();
        }
      }
      newOperations.clear();
      newErrors.clear();
      break;
    }

    case 'RETRY_OPERATION': {
      const errorInfo = newErrors.get(action.payload.id);
      if (errorInfo) {
        newErrors.delete(action.payload.id);
        // The retry logic should be handled by the caller
      }
      break;
    }

    default:
      return state;
  }

  // Recalculate derived state
  const operations = Array.from(newOperations.values());
  const criticalOperations = operations.filter(op => op.priority === 'critical');
  const backgroundOperations = operations.filter(op => op.priority === 'low');
  const isGlobalLoading = operations.some(op => op.priority === 'critical' || op.priority === 'high');
  
  // Calculate total progress
  const operationsWithProgress = operations.filter(op => typeof op.progress === 'number');
  const totalProgress = operationsWithProgress.length > 0
    ? operationsWithProgress.reduce((sum, op) => sum + (op.progress || 0), 0) / operationsWithProgress.length
    : 0;

  // Determine current stage
  const currentStage = criticalOperations[0]?.stage || 
                      operations.find(op => op.priority === 'high')?.stage || 
                      operations[0]?.stage || 
                      '';

  return {
    operations: newOperations,
    isGlobalLoading,
    criticalOperations,
    backgroundOperations,
    totalProgress,
    currentStage,
    errors: newErrors,
  };
}

// Context
const LoadingStateContext = createContext<{
  state: GlobalLoadingState;
  startOperation: (operation: Omit<LoadingOperation, 'startTime'>) => void;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  completeOperation: (id: string) => void;
  failOperation: (id: string, error: Error) => void;
  cancelOperation: (id: string) => void;
  retryOperation: (id: string, retryFn: () => Promise<void>) => Promise<void>;
  clearCompleted: (olderThan?: number) => void;
  clearAll: () => void;
  getOperationDuration: (id: string) => number;
  isOperationActive: (id: string) => boolean;
} | null>(null);

// Provider component
export function LoadingStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(loadingStateReducer, initialState);

  // Auto-cleanup completed operations and old errors
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_COMPLETED', payload: { olderThan: 5 * 60 * 1000 } }); // 5 minutes
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Show toast notifications for critical operations
  useEffect(() => {
    const criticalOps = state.criticalOperations;
    if (criticalOps.length > 0) {
      const longestRunning = criticalOps.reduce((longest, current) => 
        current.startTime < longest.startTime ? current : longest
      );
      
      const duration = Date.now() - longestRunning.startTime;
      if (duration > 10000) { // Show toast after 10 seconds
        toast.loading(longestRunning.label, {
          id: `critical-${longestRunning.id}`,
          description: longestRunning.stage,
        });
      }
    } else {
      // Dismiss any critical operation toasts
      toast.dismiss();
    }
  }, [state.criticalOperations]);

  const startOperation = useCallback((operation: Omit<LoadingOperation, 'startTime'>) => {
    dispatch({ type: 'START_OPERATION', payload: operation });
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    dispatch({ type: 'UPDATE_OPERATION', payload: { id, updates } });
  }, []);

  const completeOperation = useCallback((id: string) => {
    dispatch({ type: 'COMPLETE_OPERATION', payload: { id } });
    toast.dismiss(`critical-${id}`);
  }, []);

  const failOperation = useCallback((id: string, error: Error) => {
    dispatch({ type: 'FAIL_OPERATION', payload: { id, error } });
    toast.dismiss(`critical-${id}`);
    
    // Show error toast for critical operations
    const operation = state.operations.get(id);
    if (operation && (operation.priority === 'critical' || operation.priority === 'high')) {
      toast.error(`Failed: ${operation.label}`, {
        description: error.message,
        action: {
          label: 'Retry',
          onClick: () => retryOperation(id, async () => {
            // Retry logic should be provided by the caller
          }),
        },
      });
    }
  }, [state.operations]);

  const cancelOperation = useCallback((id: string) => {
    dispatch({ type: 'CANCEL_OPERATION', payload: { id } });
    toast.dismiss(`critical-${id}`);
  }, []);

  const retryOperation = useCallback(async (id: string, retryFn: () => Promise<void>) => {
    dispatch({ type: 'RETRY_OPERATION', payload: { id } });
    try {
      await retryFn();
    } catch (error) {
      failOperation(id, error as Error);
    }
  }, [failOperation]);

  const clearCompleted = useCallback((olderThan?: number) => {
    dispatch({ type: 'CLEAR_COMPLETED', payload: { olderThan } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    toast.dismiss();
  }, []);

  const getOperationDuration = useCallback((id: string) => {
    const operation = state.operations.get(id);
    return operation ? Date.now() - operation.startTime : 0;
  }, [state.operations]);

  const isOperationActive = useCallback((id: string) => {
    return state.operations.has(id);
  }, [state.operations]);

  const value = {
    state,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    cancelOperation,
    retryOperation,
    clearCompleted,
    clearAll,
    getOperationDuration,
    isOperationActive,
  };

  return (
    <LoadingStateContext.Provider value={value}>
      {children}
    </LoadingStateContext.Provider>
  );
}

// Hook to use loading state
export function useLoadingState() {
  const context = useContext(LoadingStateContext);
  if (!context) {
    throw new Error('useLoadingState must be used within a LoadingStateProvider');
  }
  return context;
}

// Convenience hooks for specific use cases
export function useOperationState(operationId: string) {
  const { state, getOperationDuration, isOperationActive } = useLoadingState();
  
  const operation = state.operations.get(operationId);
  const error = state.errors.get(operationId);
  const duration = getOperationDuration(operationId);
  const isActive = isOperationActive(operationId);

  return {
    operation,
    error,
    duration,
    isActive,
    isLoading: isActive,
    isError: !!error,
    progress: operation?.progress,
    stage: operation?.stage,
  };
}

export function useGlobalLoadingState() {
  const { state } = useLoadingState();
  
  return {
    isGlobalLoading: state.isGlobalLoading,
    criticalOperations: state.criticalOperations,
    backgroundOperations: state.backgroundOperations,
    totalProgress: state.totalProgress,
    currentStage: state.currentStage,
    hasErrors: state.errors.size > 0,
    operationCount: state.operations.size,
  };
}

// Higher-order component for automatic loading state management
export function withLoadingState<P extends object>(
  Component: React.ComponentType<P>,
  operationConfig: {
    id: string;
    label: string;
    category?: LoadingOperation['category'];
    priority?: LoadingOperation['priority'];
  }
) {
  return function WrappedComponent(props: P) {
    const { startOperation, completeOperation, failOperation } = useLoadingState();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
      startOperation({
        id: operationConfig.id,
        label: operationConfig.label,
        category: operationConfig.category || 'other',
        priority: operationConfig.priority || 'medium',
      });

      return () => {
        if (mounted) {
          completeOperation(operationConfig.id);
        }
      };
    }, [startOperation, completeOperation, mounted]);

    React.useEffect(() => {
      return () => {
        setMounted(false);
      };
    }, []);

    return <Component {...props} />;
  };
}