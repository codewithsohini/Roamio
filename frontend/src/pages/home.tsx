import React, { Suspense } from 'react';
import { Layout } from '@/components/layout';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Sparkles, Map, Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy-load the heavy 3D canvas
const AeroPlaneHero = React.lazy(() => import('@/components/AeroPlaneHero'));

export default function Home() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-7xl mx-auto w-full">

        {/* ─── Hero ──────────────────────────────────────────── */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-4 md:mt-8 min-h-[540px]">

          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="text-left flex flex-col justify-center order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-sm text-blue-300 mb-6 w-fit">
              <Sparkles className="w-4 h-4" />
              <span>Roamio AI Travel Engine 2.0 is live</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-white mb-6 leading-[1.02]">
              Go Anywhere.<br />
              <span className="text-gradient">Worry About Nothing.</span>
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              From hidden cafés to iconic landmarks, Roamio builds journeys
              that feel like they were planned by someone who truly knows you.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/planner" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-500 text-white px-8 h-14 text-lg glow-blue hover-glow transition-all duration-300"
                >
                  <Sparkles className="mr-2 w-5 h-5" />
                  Plan My Adventure
                </Button>
              </Link>
              <Link href="/explore" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto rounded-full glass-panel border-white/20 hover:bg-white/10 text-white px-8 h-14 text-lg transition-all duration-300"
                >
                  Explore Destinations
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right: 3D Aeroplane */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
            className="relative order-1 lg:order-2 flex items-center justify-center"
            style={{ height: '480px' }}
          >
            {/* Glow behind the plane */}
            <div
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, rgba(6,182,212,0.08) 60%, transparent 100%)',
              }}
            />
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              }
            >
              <AeroPlaneHero />
            </Suspense>
          </motion.div>
        </div>

        {/* ─── Feature Cards ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45 }}
          className="mt-20 w-full grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: <Map className="w-8 h-8 text-cyan-400" />,
              title: 'Smart Routing',
              desc: 'Optimized paths that save you hours of travel time between spots.',
            },
            {
              icon: <Calendar className="w-8 h-8 text-blue-400" />,
              title: 'Paced for You',
              desc: "No more burnout. We pace your days based on your actual energy levels.",
            },
            {
              icon: <Heart className="w-8 h-8 text-purple-400" />,
              title: 'Hidden Gems',
              desc: 'Skip the tourist traps. Discover places locals actually love.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-panel p-8 rounded-3xl text-left hover:-translate-y-2 transition-transform duration-500 hover:border-white/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Social proof ──────────────────────────────────── */}
        <div className="mt-24 pb-24 text-center">
          <p className="text-slate-500 mb-8 uppercase tracking-widest text-sm font-semibold">
            Loved by travelers from
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['Airbnb', 'Booking.com', 'Expedia', 'Tripadvisor'].map((brand) => (
              <span key={brand} className="text-xl font-bold text-white tracking-wider">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
