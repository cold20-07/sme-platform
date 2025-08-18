'use client';

import React, { useState, useEffect } from 'react';
import { debugLogger, DebugLevel, DebugCategory, devHelpers } from '@/lib/debug-utilities';
import { environment } from '@/lib/dev-environment-helpers-simple';
import { reactQueryDevUtils } from '@/lib/react-query-devtools';

interface DebugPanelProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function DebugPanel({ isOpen = false, onToggle }: DebugPanelProps) {
  const [panelOpen, setPanelOpen] = useState(isOpen);
  const [activeTab, setActiveTab] = useState<'logs' | 'cache' | 'performance' | 'tools'>('logs');
  const [logs, setLogs] = useState(debugLogger.getLogs().slice(-50));
  const [cacheInfo, setCacheInfo] = useState(reactQueryDevUtils.getCacheInfo());
  const [stats, setStats] = useState(debugLogger.getStats());

  useEffect(() => {
    if (!environment.isDevelopment) return;

    const interval = setInterval(() => {
      setLogs(debugLogger.getLogs().slice(-50));
      setCacheInfo(reactQueryDevUtils.getCacheInfo());
      setStats(debugLogger.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newState = !panelOpen;
    setPanelOpen(newState);
    onToggle?.(newState);
  };

  if (!environment.isDevelopment) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-[99999] bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        title="Toggle Debug Panel"
      >
        🐛 Debug
      </button>

      {/* Debug Panel */}
      {panelOpen && (
        <div className="fixed bottom-16 right-4 w-96 h-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[99998] overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Debug Panel</h3>
              <button
                onClick={handleToggle}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-300 dark:border-gray-600">
            {[
              { id: 'logs', label: 'Logs', count: stats.totalLogs },
              { id: 'cache', label: 'Cache', count: cacheInfo.totalQueries },
              { id: 'performance', label: 'Perf', count: stats.recentErrors },
              { id: 'tools', label: 'Tools', count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 h-80 overflow-y-auto text-xs">
            {activeTab === 'logs' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Recent Logs ({logs.length})</span>
                  <button
                    onClick={() => debugLogger.clearLogs()}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Clear
                  </button>
                </div>
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-xs border-l-2 ${
                      log.level === DebugLevel.ERROR
                        ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : log.level === DebugLevel.WARN
                        ? 'bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">[{log.category.toUpperCase()}]</span>
                      <span className="text-xs opacity-75">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1">{log.message}</div>
                    {log.data && (
                      <pre className="mt-1 text-xs opacity-75 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cache' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div className="font-medium">Total Queries</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {cacheInfo.totalQueries}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <div className="font-medium">Active</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {cacheInfo.activeQueries}
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    <div className="font-medium">Stale</div>
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {cacheInfo.staleQueries}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <div className="font-medium">Errors</div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {cacheInfo.errorQueries}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Cache Actions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => reactQueryDevUtils.refetchStaleQueries()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Refetch Stale
                    </button>
                    <button
                      onClick={() => reactQueryDevUtils.analyzeCacheEfficiency()}
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Analyze
                    </button>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="font-medium mb-1">Memory Usage</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    ~{Math.round(cacheInfo.estimatedMemoryUsage / 1024)}KB
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <button
                    onClick={() => console.log('Start memory monitoring')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-xs"
                  >
                    Start Memory Monitoring
                  </button>
                  <button
                    onClick={() => console.log('Analyze bundle size')}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded text-xs"
                  >
                    Analyze Bundle Size
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="font-medium">Network Simulation</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => console.log('Simulate normal network')}
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => console.log('Simulate slow network')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Slow
                    </button>
                    <button
                      onClick={() => console.log('Simulate offline network')}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Offline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="font-medium">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => console.log('Quick login - user')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Login User
                    </button>
                    <button
                      onClick={() => console.log('Quick login - admin')}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Login Admin
                    </button>
                    <button
                      onClick={() => console.log('Populate test data')}
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Add Test Data
                    </button>
                    <button
                      onClick={() => console.log('Clear all data')}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Test Scenarios</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => console.log('Generate empty state')}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Empty State
                    </button>
                    <button
                      onClick={() => console.log('Generate error state')}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Error State
                    </button>
                    <button
                      onClick={() => console.log('Generate loading state')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Loading State
                    </button>
                    <button
                      onClick={() => console.log('Generate success state')}
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Success State
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-medium">Export</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => devHelpers.exportLogs()}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Export Logs
                    </button>
                    <button
                      onClick={() => reactQueryDevUtils.exportCacheData()}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Export Cache
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default DebugPanel;