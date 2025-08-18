import { debugLogger, DebugCategory } from './debug-utilities';

// Environment detection utilities
export const environment = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Feature flags for development
  features: {
    enableMockData: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true',
    enableDebugPanel: process.env.NEXT_PUBLIC_ENABLE_DEBUG_PANEL === 'true',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableQueryDevtools: process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS !== 'false',
    skipAuth: process.env.NEXT_PUBLIC_SKIP_AUTH === 'true',
  },
  
  // Get environment info
  getInfo: () => ({
    nodeEnv: process.env.NODE_ENV,
    nextjsVersion: process.env.NEXT_PUBLIC_NEXTJS_VERSION,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    features: environment.features,
  }),
};

// Initialize development environment
export const initializeDevEnvironment = () => {
  if (!environment.isDevelopment) return;

  debugLogger.info(DebugCategory.GENERAL, 'Initializing development environment', environment.getInfo());

  console.log('🚀 Development environment initialized');
};