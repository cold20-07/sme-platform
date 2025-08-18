#!/usr/bin/env node

/**
 * Configuration validation script
 * Run with: npx tsx scripts/validate-config.ts
 */

import { getEnvironmentConfig, validateCurrentEnvironment } from '../lib/env';
import { ConfigManager } from '../lib/config';

console.log('🔧 Validating Environment Configuration...\n');

try {
  // Test environment validation
  const validation = validateCurrentEnvironment();
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Configuration Warnings:');
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
  }
  
  if (!validation.isValid) {
    console.log('❌ Configuration Errors:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
    process.exit(1);
  }
  
  // Test configuration loading
  const config = getEnvironmentConfig();
  console.log('✅ Environment Configuration Loaded Successfully');
  console.log(`   - Environment: ${config.nodeEnv}`);
  console.log(`   - Dev Mode: ${config.devMode}`);
  console.log(`   - MCP Enabled: ${config.enableMCP}`);
  console.log(`   - Analytics Enabled: ${config.enableAnalytics}`);
  console.log(`   - Log Level: ${config.logLevel}`);
  console.log(`   - Max Retries: ${config.maxRetries}`);
  console.log(`   - Timeout: ${config.timeoutMs}ms`);
  console.log('');
  
  // Test ConfigManager
  const configManager = ConfigManager.getInstance();
  const apiConfig = configManager.getApiConfig();
  const supabaseConfig = configManager.getSupabaseConfig();
  
  console.log('✅ Configuration Manager Working');
  console.log(`   - API Max Retries: ${apiConfig.maxRetries}`);
  console.log(`   - API Timeout: ${apiConfig.timeoutMs}ms`);
  console.log(`   - Supabase URL: ${supabaseConfig.url.substring(0, 30)}...`);
  console.log(`   - MCP Feature: ${configManager.isFeatureEnabled('mcp') ? 'Enabled' : 'Disabled'}`);
  console.log('');
  
  // Test singleton behavior
  const configManager2 = ConfigManager.getInstance();
  if (configManager === configManager2) {
    console.log('✅ ConfigManager Singleton Pattern Working');
  } else {
    console.log('❌ ConfigManager Singleton Pattern Failed');
    process.exit(1);
  }
  
  console.log('\n🎉 All configuration tests passed!');
  
} catch (error) {
  console.error('❌ Configuration Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}