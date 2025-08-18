'use client';

import React, { useState } from 'react';
import { useRealtimeHealth } from '../../hooks/use-realtime-subscription';
import { realtimeManager } from '../../lib/realtime-subscriptions';

interface RealtimeStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function RealtimeStatus({ showDetails = false, className = '' }: RealtimeStatusProps) {
  const { isHealthy, totalSubscriptions, activeSubscriptions, failedSubscriptions, reconnectAll } = useRealtimeHealth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnectAll();
    } catch (error) {
      console.error('Failed to reconnect subscriptions:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusColor = () => {
    if (isHealthy) return 'text-green-600';
    if (failedSubscriptions > 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (isHealthy) return '🟢';
    if (failedSubscriptions > 0) return '🔴';
    return '🟡';
  };

  const getStatusText = () => {
    if (isHealthy) return 'Connected';
    if (failedSubscriptions > 0) return 'Connection Issues';
    return 'Connecting';
  };

  if (!showDetails && totalSubscriptions === 0) {
    return null;
  }

  return (
    <div className={`realtime-status ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm">{getStatusIcon()}</span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {totalSubscriptions > 0 && (
          <span className="text-xs text-gray-500">
            ({activeSubscriptions}/{totalSubscriptions})
          </span>
        )}
        {showDetails && totalSubscriptions > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 ml-2"
          >
            {isExpanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>

      {isExpanded && showDetails && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Subscriptions:</span>
              <span className="font-medium">{totalSubscriptions}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="font-medium text-green-600">{activeSubscriptions}</span>
            </div>
            {failedSubscriptions > 0 && (
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{failedSubscriptions}</span>
              </div>
            )}
            <div className="pt-2 border-t">
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RealtimeSubscriptionListProps {
  className?: string;
}

export function RealtimeSubscriptionList({ className = '' }: RealtimeSubscriptionListProps) {
  const [subscriptions, setSubscriptions] = useState(realtimeManager.getAllSubscriptionStatuses());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSubscriptions = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSubscriptions(realtimeManager.getAllSubscriptionStatuses());
      setIsRefreshing(false);
    }, 500);
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptions(realtimeManager.getAllSubscriptionStatuses());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleUnsubscribe = (subscriptionId: string) => {
    realtimeManager.unsubscribe(subscriptionId);
    refreshSubscriptions();
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>;
    }
    
    switch (status) {
      case 'JOINING':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Connecting</span>;
      case 'CHANNEL_ERROR':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Error</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{status}</span>;
    }
  };

  return (
    <div className={`realtime-subscription-list ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Real-time Subscriptions</h3>
        <button
          onClick={refreshSubscriptions}
          disabled={isRefreshing}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No active subscriptions
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{subscription.id}</h4>
                    {getStatusBadge(subscription.status, subscription.isActive)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Table: <span className="font-mono">{subscription.table}</span></div>
                    <div>Event: <span className="font-mono">{subscription.event}</span></div>
                    <div>Created: {subscription.createdAt.toLocaleString()}</div>
                    {subscription.retryCount > 0 && (
                      <div>Retries: <span className="text-orange-600">{subscription.retryCount}</span></div>
                    )}
                    {subscription.lastError && (
                      <div className="text-red-600 text-xs">
                        Error: {subscription.lastError.message}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnsubscribe(subscription.id)}
                  className="ml-4 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Unsubscribe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RealtimeDebugPanelProps {
  className?: string;
}

export function RealtimeDebugPanel({ className = '' }: RealtimeDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
      >
        Real-time Debug
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-auto bg-white border rounded-lg shadow-xl">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Real-time Debug Panel</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-4">
            <RealtimeStatus showDetails={true} />
            <div className="mt-4">
              <RealtimeSubscriptionList />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}