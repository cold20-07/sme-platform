'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/app-layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ProtectedRoute>{children}</ProtectedRoute>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}