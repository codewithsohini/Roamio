import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { MapPin, Calendar, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { GamifiedLoader } from '@/components/gamified-loader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJourney } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function Planner() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('3');
  const [companions, setCompanions] = useState('couple');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const createJourneyMutation = useMutation({
    mutationFn: () =>
      createJourney({ destination, days: parseInt(days) || 3, companions }),
    onSuccess: (data) => {
      setGeneratedId(data.trip_id);
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Error generating journey',
        description: err.data?.detail || 'Please try again later.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) {
      toast({ title: 'Destination required', description: 'Please tell us where you want to go.', variant: 'destructive' });
      return;
    }
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Please sign in to save and generate your itinerary.' });
      setLocation('/login');
      return;
    }
    setIsGenerating(true);
    createJourneyMutation.mutate();
  };

  const handleAnimationComplete = () => {
    if (generatedId) {
      setLocation(`/trips/${generatedId}`);
    } else {
      setIsGenerating(false);
      toast({ title: 'Almost ready', description: 'Your trip is still generating in the background.' });
      setLocation('/trips');
    }
  };

  return (
    <Layout>
      <GamifiedLoader isVisible={isGenerating} onComplete={handleAnimationComplete} />

      <div className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Design your <span className="text-gradient">Escape</span></h1>
          <p className="text-slate-400 text-lg">Tell us where. Our AI will craft the perfect cinematic itinerary.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 md:p-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <form onSubmit={handleGenerate} className="relative z-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-slate-300 font-semibold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Where do you want to go?
              </Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Tokyo, Japan or Amalfi Coast"
                className="h-16 text-lg bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-blue-500 px-6"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-slate-300 font-semibold text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  How many days?
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1" max="30"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="h-16 text-lg bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-blue-500 pl-6 pr-16"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">Days</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300 font-semibold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Who's going?
                </Label>
                <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                  {['Solo', 'Couple', 'Family', 'Friends'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCompanions(type.toLowerCase())}
                      className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                        companions === type.toLowerCase()
                          ? 'bg-blue-600 text-white shadow-lg glow-blue-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white border-0 glow-blue hover-glow transition-all duration-300"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                Generate Cinematic Itinerary
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}