import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Compass, Loader2 } from 'lucide-react';
import { AnimatedBackground } from '@/components/animated-background';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setAuth(data.access_token);
      toast({ title: 'Welcome back', description: 'Successfully signed in.' });
      setLocation('/planner');
    },
    onError: (err: any) => {
      toast({
        title: 'Sign in failed',
        description: err.data?.detail || 'Invalid credentials.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative px-6">
      <AnimatedBackground />

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
        <Compass className="w-6 h-6" />
        <span className="font-bold tracking-widest">ROAMIO</span>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-8">Sign in to access your cinematic journeys.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-blue-500 px-5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-blue-500 px-5"
              />
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg mt-4 glow-blue transition-all"
            >
              {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}