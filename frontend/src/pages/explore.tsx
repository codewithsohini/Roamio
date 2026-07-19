import React from 'react';
import { Layout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Search, Filter, Star, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

const DESTINATIONS = [
  { id: 1, name: 'Tokyo, Japan', desc: 'Neon lights and ancient temples', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2000&auto=format&fit=crop', tag: 'Trending' },
  { id: 2, name: 'Kyoto, Japan', desc: 'Serene gardens and geisha districts', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2000&auto=format&fit=crop', tag: 'Culture' },
  { id: 3, name: 'Amalfi Coast, Italy', desc: 'Dramatic cliffs and vibrant towns', img: 'https://images.unsplash.com/photo-1610444391672-ec104bc8d748?q=80&w=2000&auto=format&fit=crop', tag: 'Romantic' },
  { id: 4, name: 'Reykjavik, Iceland', desc: 'Glaciers, geysers, and hot springs', img: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=2000&auto=format&fit=crop', tag: 'Nature' },
  { id: 5, name: 'Paris, France', desc: 'Art, fashion, gastronomy, and culture', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2000&auto=format&fit=crop', tag: 'Classic' },
  { id: 6, name: 'Bali, Indonesia', desc: 'Beaches, coral reefs and volcanic mountains', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2000&auto=format&fit=crop', tag: 'Relax' },
];

export default function Explore() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 mt-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Explore Destinations</h1>
            <p className="text-slate-400 text-lg">Find inspiration for your next cinematic journey.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search places..." 
                className="pl-10 bg-white/5 border-white/10 text-white rounded-full h-12 focus-visible:ring-blue-500"
              />
            </div>
            <button className="h-12 w-12 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DESTINATIONS.map((dest, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={dest.id}
              className="group relative rounded-3xl overflow-hidden aspect-[4/5] cursor-pointer"
            >
              <img src={dest.img} alt={dest.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white border border-white/20">
                  {dest.tag}
                </span>
              </div>
              
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  {dest.name}
                </h3>
                <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                  {dest.desc}
                </p>
                <div className="flex items-center gap-4 text-xs font-medium text-blue-400 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> View Map</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3"/> Popular</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}