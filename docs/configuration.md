# Environment Configuration

This document describes the environment configuration system for the SME Platform application.

## Overview

The application uses a robust environment configuration system that provides:
- Type-safe configuration interfaces
- Environment variable validation
- Fallback handling for development
- Environment-specific settings
- Feature flag management

## Environment Variables

### Required Variables

| Variable | Description | Example | Validation |
|----------|-------------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` | Must start with `https://` and contain `.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` | Must be JWT format (starts with `eyJ`) and > 100 chars |

### Optional Variables

| Variable | Default | Description | Validation |
|----------|---------|-------------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application base URL | Must start with `http` |
| `NEXT_PUBLIC_ENABLE_MCP` | `false` | Enable MCP integration | `true` or `false` |
| `NEXT_PUBLIC_DEV_MODE` | `false` | Enable development mode | `true` or `false` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable analytics tracking | `true` or `false` |
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Application log level | `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_MAX_RETRIES` | `3` | Maximum API retries | Positive integer |
| `NEXT_PUBLIC_TIMEOUT_MS` | `10000` | API timeout in milliseconds | Positive integer |

## Usage

### Basic Configuration

```typescript
import { getEnvironmentConfig } from '@/lib/env';

const config = getEnvironmentConfig();
console.log(config.supabaseUrl);
```

### Using Configuration Manager

```typescript
import { config } from '@/lib/config';

// Get full configuration
const fullConfig = config.getConfig();

// Check feature flags
if (config.isFeatureEnabled('mcp')) {
  // MCP-specific logic
}

// Get API configuration
const apiConfig = config.getApiConfig();
```

### Environment-Specific Settings

```typescript
import { getEnvironmentSpecificConfig } from '@/lib/env';

const envConfig = getEnvironmentSpecificConfig();

if (envConfig.enableDebugLogs) {
  console.log('Debug mode enabled');
}
```

## Validation

The configuration system includes comprehensive validation:

### Development Mode
- Missing required variables generate warnings (not errors)
- Placeholder values are allowed
- Additional debugging features are enabled

### Production Mode
- Missing required variables throw errors
- Placeholder values are rejected
- Strict validation is enforced

### Validation Example

```typescript
import { validateCurrentEnvironment } from '@/lib/env';

const validation = validateCurrentEnvironment();

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Configuration warnings:', validation.warnings);
}
```

## Environment Files

### `.env.example`
Template file showing all available environment variables with example values.

### `.env.local`
Local development overrides (not committed to version control).

### `.env.production`
Production-specific environment variables.

## Best Practices

1. **Always use the configuration system** instead of accessing `process.env` directly
2. **Validate configuration early** in your application startup
3. **Use feature flags** for conditional functionality
4. **Provide meaningful defaults** for optional variables
5. **Document new environment variables** in this file

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure all required variables are set in your environment
   - Check `.env.example` for the correct variable names

2. **"Invalid value for environment variable"**
   - Verify the format of your environment variable values
   - Check the validation rules in the table above

3. **"Production environment cannot use placeholder values"**
   - Replace placeholder values with real configuration in production
   - Ensure `NODE_ENV=production` is set correctly

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```bash
NEXT_PUBLIC_LOG_LEVEL=debug npm run dev
```

## Testing

The configuration system includes comprehensive tests. Run them with:

```bash
npm test lib/__tests__/config.test.ts
```