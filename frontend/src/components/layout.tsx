import React from 'react';
import { Navbar } from '@/components/navbar';
import { AnimatedBackground } from '@/components/animated-background';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-[100dvh] flex flex-col relative w-full overflow-x-hidden">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1 w-full relative z-10 pt-24 pb-24 md:pt-32 md:pb-8 flex flex-col">
        {children}
      </main>
    </div>
  );
};