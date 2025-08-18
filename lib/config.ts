import { getEnvironmentConfig, getEnvironmentSpecificConfig, validateCurrentEnvironment } from './env';

// Configuration manager class
export class ConfigManager {
  private static instance: ConfigManager;
  private config: ReturnType<typeof getEnvironmentConfig>;
  private envSpecificConfig: ReturnType<typeof getEnvironmentSpecificConfig>;

  private constructor() {
    this.config = getEnvironmentConfig();
    this.envSpecificConfig = getEnvironmentSpecificConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // Get full configuration
  public getConfig() {
    return this.config;
  }

  // Get environment-specific configuration
  public getEnvSpecificConfig() {
    return this.envSpecificConfig;
  }

  // Get specific configuration value
  public get<K extends keyof ReturnType<typeof getEnvironmentConfig>>(key: K) {
    return this.config[key];
  }

  // Check if feature is enabled
  public isFeatureEnabled(feature: 'mcp' | 'analytics' | 'devMode'): boolean {
    switch (feature) {
      case 'mcp':
        return this.config.enableMCP;
      case 'analytics':
        return this.config.enableAnalytics;
      case 'devMode':
        return this.config.devMode;
      default:
        return false;
    }
  }

  // Get API configuration
  public getApiConfig() {
    return {
      maxRetries: this.config.maxRetries,
      timeoutMs: this.config.timeoutMs,
      baseUrl: this.config.appUrl,
    };
  }

  // Get Supabase configuration
  public getSupabaseConfig() {
    return {
      url: this.config.supabaseUrl,
      anonKey: this.config.supabaseAnonKey,
      enableMCP: this.config.enableMCP,
    };
  }

  // Validate configuration
  public validateConfig() {
    return validateCurrentEnvironment();
  }

  // Refresh configuration (useful for testing)
  public refresh() {
    this.config = getEnvironmentConfig();
    this.envSpecificConfig = getEnvironmentSpecificConfig();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Export convenience functions
export const getConfig = () => config.getConfig();
export const isFeatureEnabled = (feature: Parameters<typeof config.isFeatureEnabled>[0]) => 
  config.isFeatureEnabled(feature);
export const getApiConfig = () => config.getApiConfig();
export const getSupabaseConfig = () => config.getSupabaseConfig();