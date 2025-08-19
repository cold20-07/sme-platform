'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.logError(error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Details:', errorDetails);
      console.groupEnd();
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service
      // errorReportingService.captureException(error, errorDetails);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  };

  private handleReload = () => {
    // Reload only on client
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    // Redirect only on client
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with mock error log and statistics
      const mockErrors = [
        {
          id: 'ERR-001',
          message: 'Network request failed',
          status: 'Resolved',
          timestamp: '2025-08-18 10:23',
        },
        {
          id: 'ERR-002',
          message: 'Invalid user input',
          status: 'Unresolved',
          timestamp: '2025-08-18 11:05',
        },
        {
          id: 'ERR-003',
          message: 'Database connection lost',
          status: 'Resolved',
          timestamp: '2025-08-19 09:42',
        },
      ];

      const totalErrors = mockErrors.length;
      const resolvedErrors = mockErrors.filter(e => e.status === 'Resolved').length;
      const unresolvedErrors = mockErrors.filter(e => e.status === 'Unresolved').length;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified.<br />
              <span className="text-xs text-gray-400">(Demo: Mock error log below)</span>
            </p>

            {/* Error statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-lg font-bold text-gray-800">{totalErrors}</div>
                <div className="text-xs text-gray-500">Total Errors</div>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <div className="text-lg font-bold text-green-800">{resolvedErrors}</div>
                <div className="text-xs text-green-600">Resolved</div>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <div className="text-lg font-bold text-red-800">{unresolvedErrors}</div>
                <div className="text-xs text-red-600">Unresolved</div>
              </div>
            </div>

            {/* Mock error log table */}
            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full text-left border rounded-lg">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700">ID</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700">Message</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {mockErrors.map((err) => (
                    <tr key={err.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-xs text-gray-800 font-mono">{err.id}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{err.message}</td>
                      <td className={`px-3 py-2 text-xs font-semibold ${err.status === 'Resolved' ? 'text-green-700' : 'text-red-700'}`}>{err.status}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{err.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'production' && this.state.errorId && (
              <p className="text-xs text-gray-500 mt-4">
                Reference ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components that need error boundary functionality
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // This would typically integrate with the same error reporting service
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service
    }
  };
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}