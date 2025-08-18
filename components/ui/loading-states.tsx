import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/lib/react-query';
import { useLoadingState, useGlobalLoadingState, LoadingOperation } from '@/lib/loading-state-context';

// Loading spinner component
export function LoadingSpinner({ 
  size = 'default', 
  className = '' 
}: { 
  size?: 'sm' | 'default' | 'lg'; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${className}`} 
    />
  );
}

// Skeleton loader for cards
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded-lg p-6 space-y-4">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>
  );
}

// Skeleton loader for tables
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton loader for lists
export function ListSkeleton({ 
  items = 5, 
  className = '' 
}: { 
  items?: number; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Error display component
export function ErrorDisplay({ 
  error, 
  onRetry, 
  className = '' 
}: { 
  error: Error | null; 
  onRetry?: () => void; 
  className?: string; 
}) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-4"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Loading overlay component
export function LoadingOverlay({ 
  isLoading, 
  children, 
  className = '' 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      )}
    </div>
  );
}

// Comprehensive loading state handler
export function LoadingStateHandler({
  loadingState,
  onRetry,
  loadingComponent,
  errorComponent,
  children,
  className = '',
}: {
  loadingState: LoadingState;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  if (loadingState.isLoading) {
    return (
      <div className={className}>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </div>
    );
  }

  if (loadingState.isError) {
    return (
      <div className={className}>
        {errorComponent || (
          <ErrorDisplay 
            error={loadingState.error} 
            onRetry={onRetry}
          />
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

// Inline loading button
export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Loading...',
  ...props
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Data fetching wrapper with loading states
export function DataWrapper<T>({
  data,
  loadingState,
  onRetry,
  emptyMessage = 'No data available',
  loadingComponent,
  errorComponent,
  children,
  className = '',
}: {
  data: T[] | T | null | undefined;
  loadingState: LoadingState;
  onRetry?: () => void;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: (data: NonNullable<T>) => React.ReactNode;
  className?: string;
}) {
  if (loadingState.isLoading) {
    return (
      <div className={className}>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </div>
    );
  }

  if (loadingState.isError) {
    return (
      <div className={className}>
        {errorComponent || (
          <ErrorDisplay 
            error={loadingState.error} 
            onRetry={onRetry}
          />
        )}
      </div>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className={`text-center text-gray-500 p-8 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return <div className={className}>{children(data as NonNullable<T>)}</div>;
}

// Progress indicator for multi-step operations
export function ProgressIndicator({
  steps,
  currentStep,
  className = '',
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Step {currentStep + 1} of {steps.length}</span>
        <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      <div className="text-sm text-gray-700">
        {steps[currentStep]}
      </div>
    </div>
  );
}

// Enhanced skeleton components with better animations
export function EnhancedCardSkeleton({ 
  className = '',
  showAvatar = false,
  showActions = false,
  lines = 3,
}: { 
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
  lines?: number;
}) {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading content">
      <div className="bg-white rounded-lg border p-6 space-y-4">
        {showAvatar && (
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          {Array.from({ length: lines }).map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-gray-100 rounded" 
              style={{ width: `${Math.random() * 40 + 60}%` }}
            ></div>
          ))}
        </div>
        
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-100 rounded w-16"></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton for dashboard metrics
export function MetricsSkeleton({ 
  count = 4, 
  className = '' 
}: { 
  count?: number; 
  className?: string; 
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-lg border p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for charts
export function ChartSkeleton({ 
  height = 300, 
  className = '' 
}: { 
  height?: number; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-100 rounded w-1/6"></div>
          </div>
          <div 
            className="bg-gray-100 rounded"
            style={{ height: `${height}px` }}
          >
            <div className="h-full flex items-end justify-around p-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div 
                  key={i}
                  className="bg-gray-200 rounded-t w-8"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global loading indicator
export function GlobalLoadingIndicator() {
  const { isGlobalLoading, criticalOperations, totalProgress, currentStage } = useGlobalLoadingState();

  if (!isGlobalLoading) return null;

  const primaryOperation = criticalOperations[0];
  const showProgress = typeof totalProgress === 'number' && totalProgress > 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" className="text-white" />
            <div>
              <div className="text-sm font-medium">
                {primaryOperation?.label || 'Loading...'}
              </div>
              {currentStage && (
                <div className="text-xs opacity-90">
                  {currentStage}
                </div>
              )}
            </div>
          </div>
          
          {primaryOperation?.cancellable && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={primaryOperation.onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
        
        {showProgress && (
          <div className="mt-2">
            <Progress value={totalProgress} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}

// Loading state indicator for specific operations
export function OperationLoadingIndicator({ 
  operationId, 
  className = '' 
}: { 
  operationId: string; 
  className?: string; 
}) {
  const { state } = useLoadingState();
  const operation = state.operations.get(operationId);
  const error = state.errors.get(operationId);

  if (!operation && !error) return null;

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (operation) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
        <LoadingSpinner size="sm" />
        <span>{operation.label}</span>
        {operation.stage && (
          <span className="text-gray-400">• {operation.stage}</span>
        )}
        {typeof operation.progress === 'number' && (
          <span className="text-gray-400">({Math.round(operation.progress)}%)</span>
        )}
      </div>
    );
  }

  return null;
}

// Smart loading wrapper that uses global loading state
export function SmartLoadingWrapper({
  operationId,
  label,
  category = 'other',
  priority = 'medium',
  children,
  loadingComponent,
  errorComponent,
  className = '',
}: {
  operationId: string;
  label: string;
  category?: LoadingOperation['category'];
  priority?: LoadingOperation['priority'];
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  className?: string;
}) {
  const { startOperation, completeOperation, failOperation, state } = useLoadingState();
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    if (!isInitialized) {
      startOperation({
        id: operationId,
        label,
        category,
        priority,
      });
      setIsInitialized(true);
    }

    return () => {
      if (isInitialized) {
        completeOperation(operationId);
      }
    };
  }, [operationId, label, category, priority, startOperation, completeOperation, isInitialized]);

  const operation = state.operations.get(operationId);
  const error = state.errors.get(operationId);

  if (error) {
    return (
      <div className={className}>
        {errorComponent || (
          <ErrorDisplay 
            error={error.error} 
            onRetry={() => {
              // Retry logic should be handled by parent component
            }}
          />
        )}
      </div>
    );
  }

  if (operation) {
    return (
      <div className={className}>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <LoadingSpinner size="lg" />
              <div className="text-sm text-gray-600">{operation.label}</div>
              {operation.stage && (
                <div className="text-xs text-gray-400">{operation.stage}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

// Network status indicator
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm">You're offline</span>
    </div>
  );
}

// Loading state summary for debugging
export function LoadingStateSummary({ className = '' }: { className?: string }) {
  const { state } = useLoadingState();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className={`fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 z-50 ${className}`}>
      <div>Operations: {state.operations.size}</div>
      <div>Critical: {state.criticalOperations.length}</div>
      <div>Background: {state.backgroundOperations.length}</div>
      <div>Errors: {state.errors.size}</div>
      {state.totalProgress > 0 && (
        <div>Progress: {Math.round(state.totalProgress)}%</div>
      )}
    </div>
  );
}