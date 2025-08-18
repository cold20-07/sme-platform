// Environment configuration interface
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  nodeEnv: 'development' | 'production' | 'test';
  appUrl: string;
  enableMCP: boolean;
  devMode: boolean;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxRetries: number;
  timeoutMs: number;
}

// Environment validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Environment variable definitions with validation rules
interface EnvVarDefinition {
  key: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
}

// Environment variable definitions
const ENV_VAR_DEFINITIONS: EnvVarDefinition[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validator: (value) => value.startsWith('https://') && value.includes('.supabase.co'),
    description: 'Supabase project URL'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    validator: (value) => value.length > 100 && value.startsWith('eyJ'),
    description: 'Supabase anonymous key'
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    required: false,
    defaultValue: 'http://localhost:3000',
    validator: (value) => value.startsWith('http'),
    description: 'Application base URL'
  },
  {
    key: 'NEXT_PUBLIC_ENABLE_MCP',
    required: false,
    defaultValue: 'false',
    validator: (value) => ['true', 'false'].includes(value),
    description: 'Enable MCP integration'
  },
  {
    key: 'NEXT_PUBLIC_DEV_MODE',
    required: false,
    defaultValue: 'false',
    validator: (value) => ['true', 'false'].includes(value),
    description: 'Enable development mode'
  },
  {
    key: 'NEXT_PUBLIC_ENABLE_ANALYTICS',
    required: false,
    defaultValue: 'false',
    validator: (value) => ['true', 'false'].includes(value),
    description: 'Enable analytics tracking'
  },
  {
    key: 'NEXT_PUBLIC_LOG_LEVEL',
    required: false,
    defaultValue: 'info',
    validator: (value) => ['debug', 'info', 'warn', 'error'].includes(value),
    description: 'Application log level'
  },
  {
    key: 'NEXT_PUBLIC_MAX_RETRIES',
    required: false,
    defaultValue: '3',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 0,
    description: 'Maximum number of API retries'
  },
  {
    key: 'NEXT_PUBLIC_TIMEOUT_MS',
    required: false,
    defaultValue: '10000',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    description: 'API timeout in milliseconds'
  }
];

// Validate environment variables
function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isBuild = process.env.NODE_ENV === undefined || process.env.NEXT_PHASE === 'phase-production-build';
  
  // Skip validation during build process
  if (isBuild) {
    return { isValid: true, errors: [], warnings: [] };
  }

  for (const envVar of ENV_VAR_DEFINITIONS) {
    const value = process.env[envVar.key];
    
    // Check if required variable is missing
    if (envVar.required && !value) {
      if (isDevelopment) {
        warnings.push(`Missing required environment variable: ${envVar.key} (${envVar.description})`);
      } else {
        errors.push(`Missing required environment variable: ${envVar.key} (${envVar.description})`);
      }
      continue;
    }
    
    // Validate value if present and validator exists
    if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(`Invalid value for ${envVar.key}: ${value} (${envVar.description})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Get environment variable with fallback
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  
  const envDef = ENV_VAR_DEFINITIONS.find(def => def.key === key);
  if (envDef?.defaultValue) {
    return envDef.defaultValue;
  }
  
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isBuild = process.env.NODE_ENV === undefined || process.env.NEXT_PHASE === 'phase-production-build';
  
  // Provide development fallbacks for critical variables
  if (isDevelopment || isBuild) {
    switch (key) {
      case 'NEXT_PUBLIC_SUPABASE_URL':
        return 'https://placeholder.supabase.co';
      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
        return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';
      default:
        return '';
    }
  }
  
  return '';
}

// Get environment configuration with validation and fallbacks
export function getEnvironmentConfig(): EnvironmentConfig {
  // Validate environment variables
  const validation = validateEnvironmentVariables();
  
  // Log warnings in development
  if (validation.warnings.length > 0 && isDevelopment) {
    console.warn('Environment Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  // Throw errors in production or if validation fails
  if (!validation.isValid) {
    const errorMessage = `Environment Configuration Errors:\n${validation.errors.map(error => `  - ${error}`).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  // Build configuration object
  const config: EnvironmentConfig = {
    supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL'),
    enableMCP: getEnvVar('NEXT_PUBLIC_ENABLE_MCP') === 'true',
    devMode: getEnvVar('NEXT_PUBLIC_DEV_MODE') === 'true' || isDevelopment,
    enableAnalytics: getEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS') === 'true',
    logLevel: getEnvVar('NEXT_PUBLIC_LOG_LEVEL') as 'debug' | 'info' | 'warn' | 'error',
    maxRetries: parseInt(getEnvVar('NEXT_PUBLIC_MAX_RETRIES')),
    timeoutMs: parseInt(getEnvVar('NEXT_PUBLIC_TIMEOUT_MS')),
  };
  
  // Additional production validation
  if (isProduction) {
    if (config.supabaseUrl === 'https://placeholder.supabase.co') {
      throw new Error('Production environment cannot use placeholder Supabase URL');
    }
    if (config.supabaseAnonKey.includes('placeholder')) {
      throw new Error('Production environment cannot use placeholder Supabase key');
    }
  }
  
  return config;
}

// Validate current environment configuration
export function validateCurrentEnvironment(): ValidationResult {
  return validateEnvironmentVariables();
}

// Get environment-specific configuration
export function getEnvironmentSpecificConfig() {
  const config = getEnvironmentConfig();
  
  return {
    // Development specific settings
    development: {
      enableDebugLogs: true,
      enableHotReload: true,
      skipAuthValidation: config.devMode,
      enableMockData: config.devMode,
    },
    
    // Production specific settings
    production: {
      enableDebugLogs: false,
      enableHotReload: false,
      skipAuthValidation: false,
      enableMockData: false,
      enableCompression: true,
      enableCaching: true,
    },
    
    // Test specific settings
    test: {
      enableDebugLogs: false,
      enableHotReload: false,
      skipAuthValidation: true,
      enableMockData: true,
      timeoutMs: 5000,
    }
  }[config.nodeEnv];
}

// Development environment checker
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';