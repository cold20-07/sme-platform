'use client';
import React from 'react';
import { AlertTriangle, RefreshCw, LogIn, Clock, Wifi, WifiOff } from 'lucide-react';
import { AuthenticationError } from '@/lib/auth-error-handler';

interface AuthErrorDisplayProps {
  error: AuthenticationError;
  onRetry?: () => void;
  onReauth?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  showReauthButton?: boolean;
  compact?: boolean;
}

export function AuthErrorDisplay({
  error,
  onRetry,
  onReauth,
  onDismiss,
  showRetryButton = true,
  showReauthButton = true,
  compact = false,
}: AuthErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (error.category) {
      case 'network':
        return <WifiOff className="h-5 w-5" />;
      case 'auth':
        return <LogIn className="h-5 w-5" />;
      case 'server':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getErrorColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'high':
        return 'border-red-400 bg-red-50 text-red-700';
      case 'medium':
        return 'border-yellow-400 bg-yellow-50 text-yellow-700';
      case 'low':
        return 'border-blue-400 bg-blue-50 text-blue-700';
      default:
        return 'border-gray-400 bg-gray-50 text-gray-700';
    }
  };

  const getIconColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-md border ${getErrorColor()}`}>
        <div className={getIconColor()}>
          {getErrorIcon()}
        </div>
        <span className="text-sm font-medium">{error.userMessage}</span>
        {error.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto p-1 hover:bg-white/50 rounded"
            title="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${getErrorColor()}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">
              Authentication Error
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <p className="text-sm mb-3">
            {error.userMessage}
          </p>
          
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-3">
              <summary className="text-xs cursor-pointer hover:underline">
                Technical Details (Development Only)
              </summary>
              <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono">
                <div><strong>Code:</strong> {error.authCode}</div>
                <div><strong>Category:</strong> {error.category}</div>
                <div><strong>Severity:</strong> {error.severity}</div>
                <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                <div><strong>Requires Reauth:</strong> {error.requiresReauth ? 'Yes' : 'No'}</div>
                <div><strong>Session Expired:</strong> {error.sessionExpired ? 'Yes' : 'No'}</div>
                {error.details && (
                  <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>
                )}
              </div>
            </details>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {error.canRetry && showRetryButton && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white/80 hover:bg-white border border-current/20 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Try Again
              </button>
            )}
            
            {error.requiresReauth && showReauthButton && onReauth && (
              <button
                onClick={onReauth}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white/80 hover:bg-white border border-current/20 transition-colors"
              >
                <LogIn className="h-3 w-3" />
                Sign In Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Session status indicator component
interface SessionStatusProps {
  timeRemaining: number | null;
  isValid: boolean;
  needsRefresh: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function SessionStatus({
  timeRemaining,
  isValid,
  needsRefresh,
  onRefresh,
  className = '',
}: SessionStatusProps) {
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = () => {
    if (!isValid) return 'text-red-500';
    if (needsRefresh) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isValid) return 'Session expired';
    if (needsRefresh) return 'Session expiring soon';
    return 'Session active';
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        <Clock className="h-4 w-4" />
        <span>{getStatusText()}</span>
      </div>
      
      {timeRemaining && timeRemaining > 0 && (
        <span className="text-gray-500">
          ({formatTimeRemaining(timeRemaining)} remaining)
        </span>
      )}
      
      {needsRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Refresh now
        </button>
      )}
    </div>
  );
}

// Authentication loading indicator
interface AuthLoadingProps {
  message?: string;
  showSpinner?: boolean;
}

export function AuthLoading({ 
  message = 'Authenticating...', 
  showSpinner = true 
}: AuthLoadingProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-4">
      {showSpinner && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      )}
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
}

// Network status indicator
interface NetworkStatusProps {
  isOnline: boolean;
  className?: string;
}

export function NetworkStatus({ isOnline, className = '' }: NetworkStatusProps) {
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      )}
    </div>
  );
}