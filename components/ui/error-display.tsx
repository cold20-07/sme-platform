import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp?: Date;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'toast' | 'banner';
  className?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  className = '',
}: ErrorDisplayProps) {
  const baseClasses = 'flex items-start space-x-3 p-4 rounded-lg';
  
  const variantClasses = {
    inline: 'bg-red-50 border border-red-200',
    toast: 'bg-white border border-red-200 shadow-lg',
    banner: 'bg-red-100 border-l-4 border-red-500',
  };

  const getUserFriendlyMessage = (message: string, code?: string): string => {
    // Map common error codes/messages to user-friendly messages
    const errorMap: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
      'UNAUTHORIZED': 'Your session has expired. Please log in again.',
      'FORBIDDEN': 'You don\'t have permission to perform this action.',
      'NOT_FOUND': 'The requested resource was not found.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'SERVER_ERROR': 'A server error occurred. Please try again later.',
      'TIMEOUT': 'The request timed out. Please try again.',
    };

    if (code && code in errorMap) {
      return errorMap[code]!;
    }

    // Check for common error message patterns
    if (message.toLowerCase().includes('network')) {
      return 'Network connection error. Please check your internet connection.';
    }
    
    if (message.toLowerCase().includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('404')) {
      return 'The requested resource was not found.';
    }

    // Return original message if no mapping found
    return message;
  };

  const friendlyMessage = getUserFriendlyMessage(error.message, error.code);

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-red-800">
          Error
        </h3>
        <p className="text-sm text-red-700 mt-1">
          {friendlyMessage}
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message !== friendlyMessage && (
          <details className="mt-2">
            <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
              Technical Details
            </summary>
            <div className="mt-1 p-2 bg-red-100 rounded text-xs font-mono text-red-800">
              <p><strong>Original Message:</strong> {error.message}</p>
              {error.code && <p><strong>Code:</strong> {error.code}</p>}
              {error.timestamp && (
                <p><strong>Time:</strong> {error.timestamp.toLocaleString()}</p>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
            title="Retry"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center w-6 h-6 text-red-400 hover:text-red-600 transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Toast-style error component for global error notifications
export function ErrorToast({
  error,
  onRetry,
  onDismiss,
  className = '',
}: Omit<ErrorDisplayProps, 'variant'>) {
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
        variant="toast"
      />
    </div>
  );
}

// Banner-style error component for page-level errors
export function ErrorBanner({
  error,
  onRetry,
  onDismiss,
  className = '',
}: Omit<ErrorDisplayProps, 'variant'>) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      variant="banner"
      className={className}
    />
  );
}