import { queryClient } from './react-query';

// Debug levels
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

// Debug categories
export enum DebugCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  REACT_QUERY = 'react-query',
  SUPABASE = 'supabase',
  MCP = 'mcp',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI = 'ui',
  GENERAL = 'general',
}

interface DebugConfig {
  level: DebugLevel;
  categories: Set<DebugCategory>;
  enableConsoleOutput: boolean;
  enableLocalStorage: boolean;
  maxLogEntries: number;
  enablePerformanceTracking: boolean;
}

interface LogEntry {
  timestamp: number;
  level: DebugLevel;
  category: DebugCategory;
  message: string;
  data?: any;
  stack?: string;
  performance?: {
    duration?: number;
    memory?: number;
  };
}

class DebugLogger {
  private config: DebugConfig;
  private logs: LogEntry[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'development' ? DebugLevel.DEBUG : DebugLevel.WARN,
      categories: new Set(Object.values(DebugCategory)),
      enableConsoleOutput: process.env.NODE_ENV === 'development',
      enableLocalStorage: true,
      maxLogEntries: 1000,
      enablePerformanceTracking: true,
    };

    // Load saved config from localStorage
    this.loadConfig();
    
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  private loadConfig() {
    // Only load config in browser environment
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('debug-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
        this.config.categories = new Set(parsed.categories || Object.values(DebugCategory));
      }
    } catch (error) {
      console.warn('Failed to load debug config:', error);
    }
  }

  private saveConfig() {
    // Only save config in browser environment
    if (typeof window === 'undefined') return;

    try {
      const configToSave = {
        ...this.config,
        categories: Array.from(this.config.categories),
      };
      localStorage.setItem('debug-config', JSON.stringify(configToSave));
    } catch (error) {
      console.warn('Failed to save debug config:', error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Only setup error handlers in browser environment
    if (typeof window === 'undefined') return;

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(DebugCategory.GENERAL, 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise,
      });
    });

    // Catch global errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.error(DebugCategory.GENERAL, 'Global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });
  }

  private shouldLog(level: DebugLevel, category: DebugCategory): boolean {
    return level <= this.config.level && this.config.categories.has(category);
  }

  private addLogEntry(level: DebugLevel, category: DebugCategory, message: string, data?: any) {
    if (!this.shouldLog(level, category)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stack: level === DebugLevel.ERROR ? new Error().stack : undefined,
    };

    // Add performance data if available (browser only)
    if (
      this.config.enablePerformanceTracking &&
      typeof window !== 'undefined' &&
      typeof (performance as any).memory !== 'undefined'
    ) {
      entry.performance = {
        memory: ((performance as any).memory).usedJSHeapSize,
      };
    }

    this.logs.push(entry);

    // Trim logs if exceeding max entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Save to localStorage
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage();
    }
  }

  private outputToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.category.toUpperCase()}]`;
    
    switch (entry.level) {
      case DebugLevel.ERROR:
        console.error(prefix, entry.message, entry.data);
        break;
      case DebugLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case DebugLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case DebugLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case DebugLevel.TRACE:
        console.trace(prefix, entry.message, entry.data);
        break;
    }
  }

  private saveLogsToStorage() {
    // Only save logs in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Only save recent logs to avoid localStorage quota issues
      const recentLogs = this.logs.slice(-100);
      localStorage.setItem('debug-logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  // Public logging methods
  error(category: DebugCategory, message: string, data?: any) {
    this.addLogEntry(DebugLevel.ERROR, category, message, data);
  }

  warn(category: DebugCategory, message: string, data?: any) {
    this.addLogEntry(DebugLevel.WARN, category, message, data);
  }

  info(category: DebugCategory, message: string, data?: any) {
    this.addLogEntry(DebugLevel.INFO, category, message, data);
  }

  debug(category: DebugCategory, message: string, data?: any) {
    this.addLogEntry(DebugLevel.DEBUG, category, message, data);
  }

  trace(category: DebugCategory, message: string, data?: any) {
    this.addLogEntry(DebugLevel.TRACE, category, message, data);
  }

  // Performance tracking
  startPerformanceTimer(name: string) {
    if (!this.config.enablePerformanceTracking || typeof window === 'undefined') return;
    
    this.performanceMarks.set(name, performance.now());
    this.debug(DebugCategory.PERFORMANCE, `Started timer: ${name}`);
  }

  endPerformanceTimer(name: string, category: DebugCategory = DebugCategory.PERFORMANCE) {
    if (!this.config.enablePerformanceTracking || typeof window === 'undefined') return;
    
    const startTime = this.performanceMarks.get(name);
    if (startTime === undefined) {
      this.warn(DebugCategory.PERFORMANCE, `Timer not found: ${name}`);
      return;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(name);
    
    this.info(category, `Timer completed: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    
    // Warn about slow operations
    if (duration > 1000) {
      this.warn(DebugCategory.PERFORMANCE, `Slow operation detected: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    }

    return duration;
  }

  // Configuration methods
  setLevel(level: DebugLevel) {
    this.config.level = level;
    this.saveConfig();
    this.info(DebugCategory.GENERAL, `Debug level set to: ${DebugLevel[level]}`);
  }

  enableCategory(category: DebugCategory) {
    this.config.categories.add(category);
    this.saveConfig();
    this.info(DebugCategory.GENERAL, `Enabled debug category: ${category}`);
  }

  disableCategory(category: DebugCategory) {
    this.config.categories.delete(category);
    this.saveConfig();
    this.info(DebugCategory.GENERAL, `Disabled debug category: ${category}`);
  }

  // Utility methods
  getLogs(category?: DebugCategory, level?: DebugLevel): LogEntry[] {
    return this.logs.filter(log => {
      if (category && log.category !== category) return false;
      if (level !== undefined && log.level !== level) return false;
      return true;
    });
  }

  clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug-logs');
    }
    this.info(DebugCategory.GENERAL, 'Debug logs cleared');
  }

  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      logs: this.logs,
    };
    return JSON.stringify(exportData, null, 2);
  }

  getStats() {
    const stats = {
      totalLogs: this.logs.length,
      logsByLevel: {} as Record<string, number>,
      logsByCategory: {} as Record<string, number>,
      recentErrors: this.logs.filter(log => 
        log.level === DebugLevel.ERROR && 
        Date.now() - log.timestamp < 5 * 60 * 1000 // Last 5 minutes
      ).length,
    };

    // Count by level
    this.logs.forEach(log => {
      const levelName = DebugLevel[log.level];
      stats.logsByLevel[levelName] = (stats.logsByLevel[levelName] || 0) + 1;
    });

    // Count by category
    this.logs.forEach(log => {
      stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Convenience functions for common logging patterns
export const logApiCall = (method: string, url: string, data?: any) => {
  debugLogger.debug(DebugCategory.API, `${method} ${url}`, data);
};

export const logApiError = (method: string, url: string, error: any) => {
  debugLogger.error(DebugCategory.API, `${method} ${url} failed`, error);
};

export const logAuthEvent = (event: string, data?: any) => {
  debugLogger.info(DebugCategory.AUTH, event, data);
};

export const logDatabaseQuery = (query: string, params?: any) => {
  debugLogger.debug(DebugCategory.DATABASE, 'Database query', { query, params });
};

export const logReactQueryEvent = (event: string, queryKey: any, data?: any) => {
  debugLogger.debug(DebugCategory.REACT_QUERY, event, { queryKey, ...data });
};

export const logSupabaseEvent = (event: string, data?: any) => {
  debugLogger.debug(DebugCategory.SUPABASE, event, data);
};

export const logMCPEvent = (event: string, data?: any) => {
  debugLogger.debug(DebugCategory.MCP, event, data);
};

export const logPerformanceMetric = (metric: string, value: number, unit: string = 'ms') => {
  debugLogger.info(DebugCategory.PERFORMANCE, `Performance metric: ${metric}`, { value, unit });
};

export const logSecurityEvent = (event: string, data?: any) => {
  debugLogger.warn(DebugCategory.SECURITY, event, data);
};

export const logUIEvent = (event: string, component: string, data?: any) => {
  debugLogger.debug(DebugCategory.UI, `${component}: ${event}`, data);
};

// Development helpers
export const devHelpers = {
  // Quick access to common debug operations
  showLogs: () => console.table(debugLogger.getLogs().slice(-20)),
  showErrors: () => console.table(debugLogger.getLogs(undefined, DebugLevel.ERROR)),
  showStats: () => console.log(debugLogger.getStats()),
  clearLogs: () => debugLogger.clearLogs(),
  exportLogs: () => {
    if (typeof window === 'undefined') {
      console.log('Export logs not available in server environment');
      return;
    }
    
    const data = debugLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },
  
  // React Query debugging
  showQueryCache: () => {
    const cache = queryClient.getQueryCache();
    console.table(cache.getAll().map(query => ({
      queryKey: JSON.stringify(query.queryKey),
      status: query.state.status,
      fetchStatus: query.state.fetchStatus,
      observers: query.getObserversCount(),
      isStale: query.isStale(),
    })));
  },
  
  // Performance monitoring
  startMonitoring: () => {
    debugLogger.info(DebugCategory.GENERAL, 'Starting comprehensive monitoring');
    
    // Monitor React Query performance
    const cache = queryClient.getQueryCache();
    cache.subscribe((event) => {
      if (event?.type === 'updated') {
        logReactQueryEvent('Query updated', event.query.queryKey, {
          status: event.query.state.status,
          fetchStatus: event.query.state.fetchStatus,
        });
      }
    });
    
    // Monitor page performance (browser only)
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            logPerformanceMetric('Page load time', entry.duration);
          } else if (entry.entryType === 'paint') {
            logPerformanceMetric(entry.name, entry.startTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'paint'] });
    }
  },
};

// Make debug utilities available globally in development (browser only)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
  (window as any).devHelpers = devHelpers;
  (window as any).DebugLevel = DebugLevel;
  (window as any).DebugCategory = DebugCategory;
  
  console.log('Debug utilities available:');
  console.log('- window.debugLogger: Main debug logger instance');
  console.log('- window.devHelpers: Development helper functions');
  console.log('- window.DebugLevel: Debug level enum');
  console.log('- window.DebugCategory: Debug category enum');
}

// DebugLevel and DebugCategory are already exported at the top of the file