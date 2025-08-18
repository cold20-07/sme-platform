#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Test runner configuration
const TEST_CONFIG = {
  unit: {
    pattern: 'lib/__tests__/**/*.test.{ts,tsx}',
    exclude: ['lib/__tests__/integration/**', 'lib/__tests__/e2e/**'],
  },
  integration: {
    pattern: 'lib/__tests__/integration/**/*.test.{ts,tsx}',
  },
  e2e: {
    pattern: 'lib/__tests__/e2e/**/*.test.{ts,tsx}',
  },
  components: {
    pattern: 'components/__tests__/**/*.test.{ts,tsx}',
  },
  hooks: {
    pattern: 'hooks/__tests__/**/*.test.{ts,tsx}',
  },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utility functions
const log = (message: string, color: string = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logHeader = (message: string) => {
  log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}`);
};

const logSuccess = (message: string) => {
  log(`${colors.green}✓ ${message}${colors.reset}`);
};

const logError = (message: string) => {
  log(`${colors.red}✗ ${message}${colors.reset}`);
};

const logWarning = (message: string) => {
  log(`${colors.yellow}⚠ ${message}${colors.reset}`);
};

// Check if test files exist
const checkTestFiles = (pattern: string): boolean => {
  try {
    const result = execSync(`find . -path "./node_modules" -prune -o -name "${pattern}" -print`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
};

// Run tests with specific pattern
const runTests = async (
  testType: string,
  pattern: string,
  options: string[] = []
): Promise<boolean> => {
  logHeader(`Running ${testType} tests`);

  if (!checkTestFiles(pattern.replace('**/', ''))) {
    logWarning(`No ${testType} test files found matching pattern: ${pattern}`);
    return true;
  }

  try {
    const command = [
      'npx vitest run',
      `--config vitest.config.ts`,
      `"${pattern}"`,
      ...options,
    ].join(' ');

    log(`Command: ${command}`, colors.cyan);
    
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logSuccess(`${testType} tests passed`);
    return true;
  } catch (error) {
    logError(`${testType} tests failed`);
    return false;
  }
};

// Generate test coverage report
const generateCoverage = async (): Promise<boolean> => {
  logHeader('Generating test coverage report');

  try {
    execSync('npx vitest run --coverage', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logSuccess('Coverage report generated');
    return true;
  } catch (error) {
    logError('Failed to generate coverage report');
    return false;
  }
};

// Run specific test suite
const runTestSuite = async (suite: keyof typeof TEST_CONFIG): Promise<boolean> => {
  const config = TEST_CONFIG[suite];
  return await runTests(suite, config.pattern);
};

// Run all tests
const runAllTests = async (): Promise<boolean> => {
  logHeader('Running all tests');

  const results = await Promise.all([
    runTestSuite('unit'),
    runTestSuite('components'),
    runTestSuite('hooks'),
    runTestSuite('integration'),
    runTestSuite('e2e'),
  ]);

  const allPassed = results.every(result => result);

  if (allPassed) {
    logSuccess('All tests passed!');
  } else {
    logError('Some tests failed');
  }

  return allPassed;
};

// Watch mode for development
const runWatchMode = async (pattern?: string): Promise<void> => {
  logHeader('Starting test watch mode');

  const watchPattern = pattern || '**/*.test.{ts,tsx}';
  
  try {
    execSync(`npx vitest --watch "${watchPattern}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    logError('Watch mode failed');
  }
};

// Lint test files
const lintTests = async (): Promise<boolean> => {
  logHeader('Linting test files');

  try {
    execSync('npx eslint "**/__tests__/**/*.{ts,tsx}" --fix', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logSuccess('Test files linted successfully');
    return true;
  } catch (error) {
    logError('Test linting failed');
    return false;
  }
};

// Type check test files
const typeCheckTests = async (): Promise<boolean> => {
  logHeader('Type checking test files');

  try {
    execSync('npx tsc --noEmit --project tsconfig.json', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logSuccess('Test files type checked successfully');
    return true;
  } catch (error) {
    logError('Test type checking failed');
    return false;
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'unit':
      await runTestSuite('unit');
      break;
    
    case 'integration':
      await runTestSuite('integration');
      break;
    
    case 'e2e':
      await runTestSuite('e2e');
      break;
    
    case 'components':
      await runTestSuite('components');
      break;
    
    case 'hooks':
      await runTestSuite('hooks');
      break;
    
    case 'all':
      await runAllTests();
      break;
    
    case 'coverage':
      await generateCoverage();
      break;
    
    case 'watch':
      await runWatchMode(args[1]);
      break;
    
    case 'lint':
      await lintTests();
      break;
    
    case 'typecheck':
      await typeCheckTests();
      break;
    
    case 'ci':
      // CI pipeline: lint, typecheck, and run all tests
      logHeader('Running CI test pipeline');
      const lintResult = await lintTests();
      const typeCheckResult = await typeCheckTests();
      const testResult = await runAllTests();
      
      if (lintResult && typeCheckResult && testResult) {
        logSuccess('CI pipeline passed!');
        process.exit(0);
      } else {
        logError('CI pipeline failed');
        process.exit(1);
      }
      break;
    
    default:
      log(`
${colors.bright}Test Runner Usage:${colors.reset}

${colors.cyan}npm run test:unit${colors.reset}        - Run unit tests
${colors.cyan}npm run test:integration${colors.reset} - Run integration tests
${colors.cyan}npm run test:e2e${colors.reset}         - Run end-to-end tests
${colors.cyan}npm run test:components${colors.reset}  - Run component tests
${colors.cyan}npm run test:hooks${colors.reset}       - Run hook tests
${colors.cyan}npm run test:all${colors.reset}         - Run all tests
${colors.cyan}npm run test:coverage${colors.reset}    - Generate coverage report
${colors.cyan}npm run test:watch${colors.reset}       - Run tests in watch mode
${colors.cyan}npm run test:lint${colors.reset}        - Lint test files
${colors.cyan}npm run test:typecheck${colors.reset}   - Type check test files
${colors.cyan}npm run test:ci${colors.reset}          - Run full CI pipeline

${colors.yellow}Examples:${colors.reset}
${colors.cyan}npm run test:watch unit${colors.reset}  - Watch unit tests only
${colors.cyan}npm run test:coverage${colors.reset}    - Generate and view coverage report
      `);
      break;
  }
};

// Run the main function
main().catch((error) => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});