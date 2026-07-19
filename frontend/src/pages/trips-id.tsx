import React from 'react';
import { Layout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { getJourney } from '@/lib/api';
import { useParams, Link } from 'wouter';
import { motion } from 'framer-motion';
import { MapPin, Coffee, ShoppingBag, Home, Star, ChevronLeft, Map, Share2, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function TripDetail() {
  const params = useParams();
  const tripId = params.tripId;

  const { data: journey, isLoading, isError } = useQuery({
    queryKey: ['journey', tripId],
    queryFn: () => getJourney(tripId!),
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto w-full px-6 pt-8">
          <Skeleton className="h-10 w-24 mb-8 bg-white/10" />
          <Skeleton className="h-64 w-full rounded-3xl mb-8 bg-white/5" />
          <Skeleton className="h-10 w-1/2 mb-4 bg-white/10" />
          <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
        </div>
      </Layout>
    );
  }

  if (isError || !journey) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto w-full px-6 pt-20 text-center">
          <h2 className="text-2xl text-white font-bold mb-4">Journey not found</h2>
          <Link href="/trips">
            <Button variant="outline" className="glass-panel text-white">Back to Trips</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const itinerary = journey.itinerary as any;
  const daysData = itinerary?.daywise_itinerary || [];
  const whyPlan = itinerary?.why_this_plan || "Crafted specifically for your vibe.";

  return (
    <Layout>
      {/* Hero Header */}
      <div className="w-full relative h-[40vh] min-h-[300px] -mt-24 md:-mt-32 mb-12">
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2000&auto=format&fit=crop"
          alt="Destination"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-[#050810]/60 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-6 pb-8">
          <Link href="/trips" className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors font-medium">
            <ChevronLeft className="w-4 h-4" /> Back to My Trips
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3 text-cyan-400 font-medium tracking-wide text-sm uppercase">
                <MapPin className="w-4 h-4" />
                {journey.destination}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">{journey.destination.split(',')[0]}</h1>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="glass-panel border-white/20 text-white rounded-full">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button variant="outline" className="glass-panel border-white/20 text-white rounded-full">
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 flex flex-col md:flex-row gap-8">

        {/* Main Content - Timeline */}
        <div className="flex-1 space-y-12">

          <div className="glass-panel p-6 md:p-8 rounded-3xl">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Why this itinerary?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {whyPlan}
            </p>
          </div>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Daily Itinerary</h2>

            {daysData.length > 0 ? daysData.map((day: any, i: number) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className="relative pl-8 md:pl-0"
              >
                <div className="absolute left-[11px] top-10 bottom-0 w-[2px] bg-white/10 md:hidden" />

                <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
                  <div className="bg-white/5 p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl shrink-0 absolute -left-6 md:relative md:left-0 ring-4 ring-[#050810] md:ring-0">
                        {day.day}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{day.theme || `Day ${day.day}`}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-8">
                    {day.morning && (
                      <div className="relative pl-6 border-l-2 border-amber-500/30">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Morning</h4>
                        <p className="text-slate-300 text-lg mb-2">{day.morning.activity}</p>
                        {day.morning.location && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {day.morning.location}</p>}
                      </div>
                    )}
                    {day.afternoon && (
                      <div className="relative pl-6 border-l-2 border-blue-500/30">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                        <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">Afternoon</h4>
                        <p className="text-slate-300 text-lg mb-2">{day.afternoon.activity}</p>
                        {day.afternoon.location && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {day.afternoon.location}</p>}
                      </div>
                    )}
                    {day.evening && (
                      <div className="relative pl-6 border-l-2 border-purple-500/30">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">Evening</h4>
                        <p className="text-slate-300 text-lg mb-2">{day.evening.activity}</p>
                        {day.evening.location && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {day.evening.location}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="glass-panel p-8 rounded-3xl text-slate-400 text-center">
                Itinerary details are currently generating or unavailable.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 space-y-6">
          <div className="glass-panel p-6 rounded-3xl">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <Map className="w-5 h-5 text-cyan-400" /> At a glance
            </h4>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-slate-400">Duration</span>
                <span className="text-white font-medium">{journey.days} Days</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-slate-400">Group</span>
                <span className="text-white font-medium capitalize">{journey.companions || 'Solo'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-slate-400">Status</span>
                <span className="text-green-400 font-medium capitalize">{journey.status}</span>
              </div>
            </div>
          </div>

          {itinerary?.estimated_budget && (
            <div className="glass-panel p-6 rounded-3xl">
              <h4 className="font-bold text-white mb-4">Estimated Budget</h4>
              <p className="text-3xl font-bold text-blue-400 mb-6">{itinerary.estimated_budget.total || '$$$'}</p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2"><Home className="w-4 h-4"/> Stay</span>
                  <div className="h-1.5 flex-1 mx-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2"><Coffee className="w-4 h-4"/> Food</span>
                  <div className="h-1.5 flex-1 mx-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 w-1/4" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Fun</span>
                  <div className="h-1.5 flex-1 mx-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-2/5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {itinerary?.travel_tips && itinerary.travel_tips.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl bg-blue-900/10 border-blue-500/20">
              <h4 className="font-bold text-white mb-4">Travel Tips</h4>
              <ul className="space-y-3 text-sm text-slate-300">
                {itinerary.travel_tips.map((tip: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}