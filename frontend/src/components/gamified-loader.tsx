import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Map } from 'lucide-react';
import Strands from '@/components/Strands';

interface Stage {
  title: string;
  duration: number;
}

const STAGES: Stage[] = [
  { title: '🌍 Connecting to the World...', duration: 1000 },
  { title: '📍 Scanning destinations...', duration: 1500 },
  { title: '🧠 Analyzing travel personality...', duration: 1500 },
  { title: '⚡ AI is thinking...', duration: 2500 },
  { title: '🗺️ Mapping your journey...', duration: 1500 },
  { title: '🎉 Your adventure is ready!', duration: 1000 },
];

const AI_THOUGHTS = [
  'Reading weather patterns...',
  'Checking flight availability...',
  'Finding hidden gems...',
  'Searching local restaurants...',
  'Optimising your route...',
  'Calculating budget...',
  'Generating your perfect itinerary...',
];

export const GamifiedLoader = ({
  isVisible,
  onComplete,
}: {
  isVisible: boolean;
  onComplete: () => void;
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [thoughtIndex, setThoughtIndex] = useState(0);

  React.useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      return;
    }

    const runStages = async () => {
      for (let i = 0; i < STAGES.length; i++) {
        setCurrentStage(i);
        await new Promise((resolve) => setTimeout(resolve, STAGES[i].duration));
      }
      onComplete();
    };

    runStages();

    const thoughtInterval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % AI_THOUGHTS.length);
    }, 400);

    return () => {
      clearInterval(thoughtInterval);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  // Stages 3 & 4 (AI thinking + Mapping) show the Strands effect
  const showStrands = currentStage === 3 || currentStage === 4;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050810]/90 backdrop-blur-xl overflow-hidden">

      {/* ── Strands background (shown during AI generation stages) ── */}
      <AnimatePresence>
        {showStrands && (
          <motion.div
            key="strands"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 pointer-events-none"
          >
            <Strands
              colors={['#3b82f6', '#06b6d4', '#8b5cf6', '#1d4ed8']}
              count={6}
              speed={0.45}
              amplitude={1.2}
              waviness={0.9}
              thickness={0.85}
              glow={3.2}
              taper={2.5}
              spread={1.1}
              intensity={0.55}
              saturation={1.6}
              opacity={0.75}
              scale={1.4}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rotating ambient glow (always visible) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl"
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-lg p-8 flex flex-col items-center justify-center text-center">

        {/* Visualiser centre */}
        <div className="h-52 flex items-center justify-center mb-8 relative w-full">
          <AnimatePresence mode="wait">

            {currentStage === 0 && (
              <motion.div
                key="stage0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
              >
                <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center pulse-ring">
                  <Map className="w-10 h-10 text-blue-400" />
                </div>
              </motion.div>
            )}

            {currentStage === 1 && (
              <motion.div
                key="stage1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap justify-center gap-2 max-w-sm"
              >
                {['Tokyo', 'Paris', 'New York', 'London', 'Kyoto', 'Bali', 'Rome'].map((city, i) => (
                  <motion.span
                    key={city}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                    className="px-3 py-1 bg-white/10 rounded-full text-xs text-white"
                  >
                    {city}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {currentStage === 2 && (
              <motion.div
                key="stage2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap justify-center gap-3"
              >
                {['Adventure', 'Food', 'Luxury', 'Nature', 'Culture', 'Photography'].map((chip, i) => (
                  <motion.div
                    key={chip}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2, type: 'spring' }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full text-sm font-medium text-blue-200"
                  >
                    {chip}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Stage 3: Strands fills background; show pulsing orb in front */}
            {currentStage === 3 && (
              <motion.div
                key="stage3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full border-2 border-blue-500/40 flex items-center justify-center relative"
                  style={{ boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(6,182,212,0.2)' }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-blue-500/20"
                  />
                  <Sparkles className="w-9 h-9 text-cyan-300 relative z-10" />
                </div>
                <span className="text-xs text-blue-400/80 uppercase tracking-widest font-semibold">
                  Neural processing
                </span>
              </motion.div>
            )}

            {/* Stage 4: Strands still in background; show a path SVG */}
            {currentStage === 4 && (
              <motion.div
                key="stage4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center relative"
              >
                <svg viewBox="0 0 220 110" className="w-full" style={{ maxHeight: 160 }}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M 20,60 Q 70,10 110,55 T 200,45"
                    fill="none"
                    stroke="rgba(59,130,246,0.4)"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                  <motion.circle
                    r="5"
                    fill="#3b82f6"
                    filter="url(#glow)"
                    initial={{ offsetDistance: '0%' }}
                    animate={{ offsetDistance: '100%' }}
                    transition={{ duration: 1.5, ease: 'linear', repeat: Infinity }}
                    style={{ offsetPath: "path('M 20,60 Q 70,10 110,55 T 200,45')" } as any}
                  />
                  {/* Destination dots */}
                  {[[20, 60], [80, 22], [140, 50], [200, 45]].map(([x, y], i) => (
                    <motion.circle
                      key={i}
                      cx={x} cy={y} r="4"
                      fill="transparent"
                      stroke="rgba(6,182,212,0.7)"
                      strokeWidth="1.5"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.25, duration: 0.4 }}
                    />
                  ))}
                </svg>
              </motion.div>
            )}

            {currentStage === 5 && (
              <motion.div
                key="stage5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50"
                style={{ boxShadow: '0 0 40px rgba(34,197,94,0.35)' }}
              >
                <Sparkles className="w-10 h-10 text-green-400" />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Stage title */}
        <div className="h-20">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentStage}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-2xl font-bold text-white mb-2"
            >
              {STAGES[currentStage].title}
            </motion.h2>
          </AnimatePresence>

          {currentStage === 3 && (
            <motion.p
              key={thoughtIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-blue-300 text-sm h-6"
            >
              {AI_THOUGHTS[thoughtIndex]}
            </motion.p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full mt-4 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
            animate={{ width: `${((currentStage + 1) / STAGES.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Companion widget */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-8 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-300">
            Roamie is building your dream trip...
          </span>
        </motion.div>
      </div>
    </div>
  );
};