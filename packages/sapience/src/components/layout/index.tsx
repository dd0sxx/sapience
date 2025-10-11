'use client';

import {
  SidebarInset,
  SidebarProvider,
} from '@sapience/sdk/ui/components/ui/sidebar';
import type { ReactNode } from 'react';

import Header from './Header';
import Footer from './Footer';

const ContentArea = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarInset className={`p-0 m-0 w-full max-w-none !bg-transparent`}>
      {children}
    </SidebarInset>
  );
};

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider
      defaultOpen
      style={{ '--sidebar-width': '12rem' } as React.CSSProperties}
    >
      <div className="min-h-screen flex flex-col w-full relative z-10">
        <Header />
        <div className="flex-1 flex w-full">
          <ContentArea>{children}</ContentArea>
        </div>
        {/* Desktop footer */}
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
