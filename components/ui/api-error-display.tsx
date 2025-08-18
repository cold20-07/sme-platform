import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Info, 
  AlertCircle, 
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { APIError } from '@/lib/api-error-handler';

interface APIErrorDisplayProps {
  error: APIError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  variant?: 'inline' | 'toast' | 'banner' | 'modal';
  className?: string;
  retryCount?: number;
  maxRetries?: number;
}

export function APIErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  variant = 'inline',
  className = '',
  retryCount = 0,
  maxRetries = 3,
}: APIErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get severity-based styling
  const getSeverityStyles = () => {
    switch (error.severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 text-red-900',
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'high':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-500',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        };
      case 'low':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-500',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-800',
          icon: 'text-gray-500',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
        };
    }
  };
  
  // Get severity icon
  const getSeverityIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5" />;
      case 'low':
        return <Info className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  // Get variant-specific classes
  const getVariantClasses = () => {
    const base = 'flex items-start space-x-3 p-4 rounded-lg border';
    
    switch (variant) {
      case 'toast':
        return `${base} shadow-lg max-w-md`;
      case 'banner':
        return `${base} border-l-4 border-t-0 border-r-0 border-b-0 rounded-none`;
      case 'modal':
        return `${base} shadow-xl`;
      default:
        return base;
    }
  };
  
  const styles = getSeverityStyles();
  const variantClasses = getVariantClasses();
  
  const canRetry = error.retryable && onRetry && retryCount < maxRetries;
  
  return (
    <div className={`${variantClasses} ${styles.container} ${className}`}>
      <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
        {getSeverityIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium">
              {error.severity === 'critical' ? 'Critical Error' :
               error.severity === 'high' ? 'Error' :
               error.severity === 'medium' ? 'Warning' : 'Notice'}
            </h3>
            <p className="text-sm mt-1">
              {error.userMessage}
            </p>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-4 inline-flex text-gray-400 hover:text-gray-600 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Error metadata */}
        <div className="mt-2 flex items-center space-x-4 text-xs opacity-75">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{error.timestamp.toLocaleTimeString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Activity className="h-3 w-3" />
            <span className="capitalize">{error.category}</span>
          </div>
          
          {retryCount > 0 && (
            <div className="flex items-center space-x-1">
              <RefreshCw className="h-3 w-3" />
              <span>Retry {retryCount}/{maxRetries}</span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="mt-3 flex items-center space-x-2">
          {canRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded transition-colors ${styles.button}`}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </button>
          )}
          
          {showDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
            </button>
          )}
        </div>
        
        {/* Expanded details */}
        {isExpanded && showDetails && (
          <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
            <div className="space-y-2">
              <div>
                <span className="font-medium">Error ID:</span> {error.id}
              </div>
              <div>
                <span className="font-medium">Code:</span> {error.code}
              </div>
              <div>
                <span className="font-medium">Original Message:</span> {error.message}
              </div>
              {error.details && (
                <div>
                  <span className="font-medium">Details:</span>
                  <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Specialized components for different use cases
export function APIErrorToast({ error, onRetry, onDismiss, retryCount, maxRetries }: Omit<APIErrorDisplayProps, 'variant'>) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <APIErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
        variant="toast"
        retryCount={retryCount}
        maxRetries={maxRetries}
      />
    </div>
  );
}

export function APIErrorBanner({ error, onRetry, onDismiss, retryCount, maxRetries, className }: Omit<APIErrorDisplayProps, 'variant'>) {
  return (
    <APIErrorDisplay
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      variant="banner"
      className={className}
      retryCount={retryCount}
      maxRetries={maxRetries}
    />
  );
}

export function APIErrorModal({ 
  error, 
  onRetry, 
  onDismiss, 
  retryCount, 
  maxRetries,
  isOpen = true 
}: Omit<APIErrorDisplayProps, 'variant'> & { isOpen?: boolean }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <APIErrorDisplay
          error={error}
          onRetry={onRetry}
          onDismiss={onDismiss}
          variant="modal"
          showDetails={true}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      </div>
    </div>
  );
}

// Error list component for displaying multiple errors
interface APIErrorListProps {
  errors: APIError[];
  onRetry?: (error: APIError) => void;
  onDismiss?: (error: APIError) => void;
  onClearAll?: () => void;
  maxVisible?: number;
  className?: string;
}

export function APIErrorList({
  errors,
  onRetry,
  onDismiss,
  onClearAll,
  maxVisible = 5,
  className = '',
}: APIErrorListProps) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleErrors = showAll ? errors : errors.slice(0, maxVisible);
  const hasMore = errors.length > maxVisible;
  
  if (errors.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Recent Errors ({errors.length})
        </h3>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {visibleErrors.map((error) => (
          <APIErrorDisplay
            key={error.id}
            error={error}
            onRetry={onRetry ? () => onRetry(error) : undefined}
            onDismiss={onDismiss ? () => onDismiss(error) : undefined}
            variant="inline"
            className="text-xs"
          />
        ))}
      </div>
      
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showAll ? 'Show Less' : `Show ${errors.length - maxVisible} More`}
        </button>
      )}
    </div>
  );
}

// Error statistics component
interface APIErrorStatsProps {
  stats: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  };
  className?: string;
}

export function APIErrorStats({ stats, className = '' }: APIErrorStatsProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network':
        return <Activity className="h-4 w-4" />;
      case 'auth':
        return <AlertTriangle className="h-4 w-4" />;
      case 'server':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Error Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Errors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.recentErrors}</div>
          <div className="text-xs text-gray-500">Recent (1h)</div>
        </div>
      </div>
      
      {/* By Category */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">By Category</h4>
        <div className="space-y-1">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(category)}
                <span className="capitalize">{category}</span>
              </div>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* By Severity */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">By Severity</h4>
        <div className="space-y-1">
          {Object.entries(stats.bySeverity).map(([severity, count]) => (
            <div key={severity} className="flex items-center justify-between text-xs">
              <span className={`capitalize ${getSeverityColor(severity)}`}>
                {severity}
              </span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Health indicator component
interface APIHealthIndicatorProps {
  health: {
    isHealthy: boolean;
    latency: number;
    error?: string;
    lastCheck: Date;
  } | null;
  stats?: {
    uptime: number;
    averageLatency: number;
    totalChecks: number;
  } | null;
  className?: string;
}

export function APIHealthIndicator({ health, stats, className = '' }: APIHealthIndicatorProps) {
  if (!health) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-xs">Health Unknown</span>
      </div>
    );
  }
  
  const getHealthColor = () => {
    if (!health.isHealthy) return 'text-red-600';
    if (health.latency > 2000) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getHealthIcon = () => {
    if (!health.isHealthy) return <TrendingDown className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          health.isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className={`text-xs font-medium ${getHealthColor()}`}>
          {health.isHealthy ? 'Healthy' : 'Unhealthy'}
        </span>
        <span className="text-xs text-gray-500">
          ({health.latency}ms)
        </span>
        {getHealthIcon()}
      </div>
      
      {stats && (
        <div className="mt-1 text-xs text-gray-500">
          Uptime: {stats.uptime.toFixed(1)}% | Avg: {stats.averageLatency.toFixed(0)}ms
        </div>
      )}
      
      {health.error && (
        <div className="mt-1 text-xs text-red-600">
          {health.error}
        </div>
      )}
    </div>
  );
}