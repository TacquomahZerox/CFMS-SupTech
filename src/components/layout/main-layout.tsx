'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/components/auth-provider';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ['/login', '/forgot-password'];

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
