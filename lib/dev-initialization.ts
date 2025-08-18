import { initializeDevEnvironment } from './dev-environment-helpers';
import { setupPerformanceMonitoring } from './react-query-devtools';
import { debugLogger, DebugCategory, devHelpers } from './debug-utilities';

// Development initialization configuration
export interface DevInitConfig {
  enableDebugPanel?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableMockData?: boolean;
  enableApiLogging?: boolean;
  enableMemoryMonitoring?: boolean;
  autoPopulateTestData?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

// Default development configuration
const DEFAULT_DEV_CONFIG: DevInitConfig = {
  enableDebugPanel: true,
  enablePerformanceMonitoring: true,
  enableMockData: false, // Disabled by default to avoid interfering with real data
  enableApiLogging: true,
  enableMemoryMonitoring: true,
  autoPopulateTestData: false,
  logLevel: 'debug',
};

// Initialize all development tools and utilities
export function initializeDevelopmentTools(config: DevInitConfig = {}) {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const finalConfig = { ...DEFAULT_DEV_CONFIG, ...config };
  
  debugLogger.info(DebugCategory.GENERAL, 'Initializing development tools', finalConfig);

  try {
    // 1. Initialize base development environment
    initializeDevEnvironment();

    // 2. Setup performance monitoring
    if (finalConfig.enablePerformanceMonitoring) {
      setupPerformanceMonitoring();
      debugLogger.info(DebugCategory.PERFORMANCE, 'Performance monitoring enabled');
    }

    // 3. Setup debug logging level
    if (finalConfig.logLevel) {
      const levelMap = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4,
      };
      debugLogger.setLevel(levelMap[finalConfig.logLevel]);
    }

    // 4. Setup memory monitoring
    if (finalConfig.enableMemoryMonitoring) {
      const { devUtils } = require('./dev-environment-helpers');
      devUtils.monitorMemoryUsage();
      debugLogger.info(DebugCategory.PERFORMANCE, 'Memory monitoring enabled');
    }

    // 5. Auto-populate test data if requested
    if (finalConfig.autoPopulateTestData) {
      setTimeout(() => {
        const { devShortcuts } = require('./dev-environment-helpers');
        devShortcuts.populateTestData();
        debugLogger.info(DebugCategory.GENERAL, 'Test data auto-populated');
      }, 2000); // Wait 2 seconds for app to initialize
    }

    // 6. Setup global keyboard shortcuts for development
    setupDevelopmentKeyboardShortcuts();

    // 7. Setup development console commands
    setupDevelopmentConsoleCommands();

    // 8. Log successful initialization
    debugLogger.info(DebugCategory.GENERAL, '🚀 Development tools initialized successfully');
    
    // Show welcome message
    console.log(`
🔧 Development Tools Initialized
================================
Debug Panel: ${finalConfig.enableDebugPanel ? '✅' : '❌'}
Performance Monitoring: ${finalConfig.enablePerformanceMonitoring ? '✅' : '❌'}
Mock Data: ${finalConfig.enableMockData ? '✅' : '❌'}
API Logging: ${finalConfig.enableApiLogging ? '✅' : '❌'}
Memory Monitoring: ${finalConfig.enableMemoryMonitoring ? '✅' : '❌'}

Keyboard Shortcuts:
- Ctrl+Shift+D: Toggle Debug Panel
- Ctrl+Shift+R: Reset App State
- Ctrl+Shift+L: Quick Login
- Ctrl+Shift+T: Populate Test Data

Console Commands:
- window.dev: Development utilities
- window.debug: Debug utilities
- window.perf: Performance utilities
    `);

  } catch (error) {
    debugLogger.error(DebugCategory.GENERAL, 'Failed to initialize development tools', error);
    console.error('Development tools initialization failed:', error);
  }
}

// Setup keyboard shortcuts for development
function setupDevelopmentKeyboardShortcuts() {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle shortcuts with Ctrl+Shift
    if (!event.ctrlKey || !event.shiftKey) return;

    switch (event.key.toLowerCase()) {
      case 'd':
        event.preventDefault();
        // Toggle debug panel
        const debugPanel = document.querySelector('[data-debug-panel]') as HTMLElement;
        if (debugPanel) {
          debugPanel.click();
        }
        debugLogger.info(DebugCategory.GENERAL, 'Debug panel toggled via keyboard shortcut');
        break;

      case 'r':
        event.preventDefault();
        // Reset app state
        const { devUtils } = require('./dev-environment-helpers');
        devUtils.resetAppState();
        debugLogger.info(DebugCategory.GENERAL, 'App state reset via keyboard shortcut');
        break;

      case 'l':
        event.preventDefault();
        // Quick login
        const { devShortcuts } = require('./dev-environment-helpers');
        devShortcuts.quickLogin('user');
        debugLogger.info(DebugCategory.AUTH, 'Quick login triggered via keyboard shortcut');
        break;

      case 't':
        event.preventDefault();
        // Populate test data
        const { devShortcuts: shortcuts } = require('./dev-environment-helpers');
        shortcuts.populateTestData();
        debugLogger.info(DebugCategory.GENERAL, 'Test data populated via keyboard shortcut');
        break;

      case 'p':
        event.preventDefault();
        // Show performance stats
        devHelpers.showStats();
        debugLogger.info(DebugCategory.PERFORMANCE, 'Performance stats shown via keyboard shortcut');
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  debugLogger.info(DebugCategory.GENERAL, 'Development keyboard shortcuts registered');
}

// Setup development console commands
function setupDevelopmentConsoleCommands() {
  if (typeof window === 'undefined') return;

  // Main development utilities object
  (window as any).dev = {
    // Environment utilities
    env: () => {
      const { environment } = require('./dev-environment-helpers');
      return environment.getInfo();
    },

    // Reset everything
    reset: () => {
      const { devUtils } = require('./dev-environment-helpers');
      devUtils.resetAppState();
    },

    // Quick login
    login: (type: 'user' | 'admin' = 'user') => {
      const { devShortcuts } = require('./dev-environment-helpers');
      devShortcuts.quickLogin(type);
    },

    // Populate test data
    populate: () => {
      const { devShortcuts } = require('./dev-environment-helpers');
      devShortcuts.populateTestData();
    },

    // Network simulation
    network: (condition: 'normal' | 'slow' | 'offline') => {
      const { devUtils } = require('./dev-environment-helpers');
      devUtils.simulateNetworkConditions(condition);
    },

    // Generate test scenarios
    scenario: (type: 'empty-state' | 'error-state' | 'loading-state' | 'success-state') => {
      const { devUtils } = require('./dev-environment-helpers');
      devUtils.generateTestScenario(type);
    },

    // Memory monitoring
    memory: () => {
      const { devUtils } = require('./dev-environment-helpers');
      return devUtils.monitorMemoryUsage();
    },

    // Bundle analysis
    bundle: () => {
      const { devUtils } = require('./dev-environment-helpers');
      return devUtils.analyzeBundleSize();
    },

    // Help command
    help: () => {
      console.log(`
Development Console Commands:
============================
dev.env()           - Show environment info
dev.reset()         - Reset app state
dev.login(type)     - Quick login ('user' or 'admin')
dev.populate()      - Populate test data
dev.network(cond)   - Simulate network ('normal', 'slow', 'offline')
dev.scenario(type)  - Generate test scenario
dev.memory()        - Start memory monitoring
dev.bundle()        - Analyze bundle size
dev.help()          - Show this help

debug.logs()        - Show recent logs
debug.errors()      - Show error logs
debug.clear()       - Clear logs
debug.export()      - Export logs

perf.stats()        - Show performance stats
perf.cache()        - Show cache info
perf.analyze()      - Analyze cache efficiency
      `);
    },
  };

  // Debug utilities
  (window as any).debug = {
    logs: () => devHelpers.showLogs(),
    errors: () => devHelpers.showErrors(),
    stats: () => devHelpers.showStats(),
    clear: () => devHelpers.clearLogs(),
    export: () => devHelpers.exportLogs(),
  };

  // Performance utilities
  (window as any).perf = {
    stats: () => {
      const { reactQueryDevUtils } = require('./react-query-devtools');
      return reactQueryDevUtils.getCacheInfo();
    },
    cache: () => devHelpers.showQueryCache(),
    analyze: () => {
      const { reactQueryDevUtils } = require('./react-query-devtools');
      return reactQueryDevUtils.analyzeCacheEfficiency();
    },
  };

  debugLogger.info(DebugCategory.GENERAL, 'Development console commands registered');
}

// Auto-initialize if in development and not disabled
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DISABLE_DEV_TOOLS !== 'true') {
  // Initialize after a short delay to ensure all modules are loaded
  setTimeout(() => {
    initializeDevelopmentTools();
  }, 1000);
}

export { initializeDevelopmentTools as default };