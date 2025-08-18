import '@testing-library/jest-dom';

// Mock config modules to avoid environment validation
vi.mock('../env.ts', () => ({
  getEnvironmentConfig: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    nodeEnv: 'test',
    enableMCP: false,
  }),
}));

vi.mock('../config.ts', () => ({
  ConfigManager: class MockConfigManager {
    static getInstance() {
      return new MockConfigManager();
    }
    getConfig() {
      return {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
        nodeEnv: 'test',
        enableMCP: false,
      };
    }
  },
  config: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    nodeEnv: 'test',
    enableMCP: false,
  },
}));

vi.mock('../supabase.ts', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
  handleSupabaseError: (error: any) => ({
    message: error?.message || 'Unknown error',
    code: error?.code || 'UNKNOWN',
  }),
}));

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NjA2NzI2MCwiZXhwIjoxOTYxNjQzMjYwfQ.test-key-for-testing';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));