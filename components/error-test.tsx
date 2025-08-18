'use client';
import React, { useState } from 'react';
import { useGlobalError } from '@/lib/error-context';
import { useAsyncError } from '@/hooks/use-async-error';
import { ErrorDisplay } from '@/components/ui/error-display';

// Component for testing error boundary functionality
export function ErrorTest() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const { showError, showWarning, showInfo } = useGlobalError();
  const { error, handleAsyncError, clearError } = useAsyncError();

  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorTest component');
  }

  const handleComponentError = () => {
    setShouldThrow(true);
  };

  const handleAsyncErrorTest = () => {
    handleAsyncError(new Error('Test async error'));
  };

  const handleGlobalError = () => {
    showError('Test global error message', 'TEST_ERROR');
  };

  const handleGlobalWarning = () => {
    showWarning('Test global warning message', 'TEST_WARNING');
  };

  const handleGlobalInfo = () => {
    showInfo('Test global info message', 'TEST_INFO');
  };

  const simulateNetworkError = () => {
    handleAsyncError({
      message: 'Network request failed',
      code: 'NETWORK_ERROR',
    });
  };

  const simulateAuthError = () => {
    showError('Your session has expired', 'UNAUTHORIZED');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Error Boundary Test Component</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleComponentError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Throw Component Error
          </button>
          
          <button
            onClick={handleAsyncErrorTest}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Test Async Error
          </button>
          
          <button
            onClick={handleGlobalError}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Show Global Error
          </button>
          
          <button
            onClick={handleGlobalWarning}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Show Global Warning
          </button>
          
          <button
            onClick={handleGlobalInfo}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Show Global Info
          </button>
          
          <button
            onClick={simulateNetworkError}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Simulate Network Error
          </button>
          
          <button
            onClick={simulateAuthError}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Simulate Auth Error
          </button>
        </div>

        {error && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Local Async Error:</h3>
            <ErrorDisplay
              error={error}
              onDismiss={clearError}
              onRetry={() => {
                clearError();
                console.log('Retry clicked');
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Component Error:</strong> Will trigger the error boundary</li>
          <li>• <strong>Async Error:</strong> Shows local error handling</li>
          <li>• <strong>Global Errors:</strong> Show toast notifications</li>
          <li>• <strong>Network/Auth Errors:</strong> Test specific error types</li>
        </ul>
      </div>
    </div>
  );
}

// Only show in development
export function ErrorTestWrapper() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <ErrorTest />;
}