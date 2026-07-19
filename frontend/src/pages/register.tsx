import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { register } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Compass, Loader2 } from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: () => register({ email, password }),
    onSuccess: () => {
      toast({ title: 'Account created', description: 'Please sign in with your new account.' });
      setLocation('/login');
    },
    onError: (err: any) => {
      toast({
        title: 'Registration failed',
        description: err.data?.detail || 'An error occurred.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative px-6">
      <AnimatedBackground />

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
        <Compass className="w-6 h-6" />
        <span className="font-bold tracking-widest">ROAMIO</span>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">Start your journey</h1>
          <p className="text-slate-400 mb-8">Create an account to save your cinematic itineraries.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-cyan-500 px-5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-cyan-500 px-5"
              />
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full h-14 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg mt-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              {registerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}