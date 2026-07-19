import React from 'react';
import { Layout } from '@/components/layout';
import { Link } from 'wouter';
import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center h-full pt-32">
        <div className="w-32 h-32 rounded-full bg-red-500/10 flex items-center justify-center mb-8 relative">
          <MapPinOff className="w-16 h-16 text-red-500 relative z-10" />
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-8 max-w-md">Looks like you've wandered off the map. This destination doesn't exist.</p>
        
        <Link href="/">
          <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-500 text-white px-8 h-14 text-lg glow-blue hover-glow transition-all duration-300">
            Return Home
          </Button>
        </Link>
      </div>
    </Layout>
  );
}