'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DevAuthProvider, useDevAuth } from '@/lib/dev-auth';
import { getEnvironmentConfig } from '@/lib/env';
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { ErrorProvider, useErrorBoundaryHandler } from '@/lib/error-context';
import ReactQueryProvider, { QueryPerformanceMonitor, QueryCacheInspector } from '@/lib/react-query-provider';
import { PerformanceMetrics } from '@/lib/performance-monitor';
import { LoadingStateProvider } from '@/lib/loading-state-context';
import { GlobalLoadingIndicator, NetworkStatusIndicator, LoadingStateSummary } from '@/components/ui/loading-states';
import { SecurityProvider } from '@/lib/security-context';
import DevelopmentTools from '@/components/dev/development-tools';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const config = getEnvironmentConfig();
  const authHook = config.devMode ? useDevAuth : useAuth;
  const { user, loading } = authHook();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/auth') {
      router.push('/auth');
    }
    if (!loading && user && pathname === '/auth') {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user && pathname !== '/auth') {
    return null;
  }

  if (user && pathname === '/auth') {
    return null;
  }

  if (pathname === '/auth') {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RootLayoutContent({ 
  children, 
  AuthProviderComponent 
}: { 
  children: React.ReactNode;
  AuthProviderComponent: React.ComponentType<{ children: React.ReactNode }>;
}) {
  const errorHandler = useErrorBoundaryHandler();
  
  return (
    <ErrorBoundary onError={errorHandler}>
      <ReactQueryProvider>
        <LoadingStateProvider>
          <SecurityProvider>
            <AuthProviderComponent>
              <ProtectedRoute>{children}</ProtectedRoute>
              <GlobalLoadingIndicator />
              <NetworkStatusIndicator />
            </AuthProviderComponent>
          </SecurityProvider>
          {process.env.NODE_ENV === 'development' && (
            <>
              <DevelopmentTools 
                enableDebugPanel={true}
                enablePerformanceMonitor={true}
                enableCacheInspector={false}
              />
              <PerformanceMetrics />
              <LoadingStateSummary />
            </>
          )}
        </LoadingStateProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setConfig(getEnvironmentConfig());
  }, []);

  if (!config) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </body>
      </html>
    );
  }

  const AuthProviderComponent = config.devMode ? DevAuthProvider : AuthProvider;

  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorProvider>
          <RootLayoutContent AuthProviderComponent={AuthProviderComponent}>
            {children}
          </RootLayoutContent>
        </ErrorProvider>
      </body>
    </html>
  );
}