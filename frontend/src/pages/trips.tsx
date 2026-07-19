import React from 'react';
import { Layout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { listJourneys } from '@/lib/api';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Plane } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Trips() {
  const { data: journeys, isLoading } = useQuery({
    queryKey: ['journeys'],
    queryFn: () => listJourneys(),
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">My Journeys</h1>
          <p className="text-slate-400 text-lg">Your cinematic travel plans.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-6 rounded-3xl space-y-4">
                <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                <Skeleton className="h-6 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
              </div>
            ))}
          </div>
        ) : !journeys || journeys.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-white/10">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <Plane className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No trips planned yet</h3>
            <p className="text-slate-400 mb-8 max-w-md">Start your next adventure by telling Roamio where you want to go.</p>
            <Link href="/planner" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium glow-blue transition-colors">
              Plan a Trip
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeys.map((journey, i) => (
              <Link key={journey.trip_id} href={`/trips/${journey.trip_id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel p-2 rounded-3xl cursor-pointer group hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                >
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4 bg-slate-800">
                    <img
                      src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
                      alt="Travel"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                        journey.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        journey.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {journey.destination}
                      </h3>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {journey.days} Days</span>
                      <span className="flex items-center gap-1.5 capitalize"><Users className="w-4 h-4"/> {journey.companions || 'Solo'}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm font-medium text-blue-400 group-hover:text-cyan-400 transition-colors">
                      View Itinerary
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
