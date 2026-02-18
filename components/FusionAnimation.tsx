
import React, { useEffect } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';

// Fix: Cast motion to any to resolve environment-specific type errors with motion component props
const motion = motionBase as any;

import { sensoryService } from '../services/sensoryService';

interface FusionAnimationProps {
  partnerName: string;
  onComplete: () => void;
}

const FusionAnimation: React.FC<FusionAnimationProps> = ({ partnerName, onComplete }) => {
  useEffect(() => {
    // Initial contact ripple
    sensoryService.ripple();
    
    // Final success chime after animation peaks
    const timer = setTimeout(() => {
      sensoryService.success();
      onComplete();
    }, 4500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--bg-primary)] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Atmosphere */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--text-primary-rgb),0.03)_0%,transparent_70%)]" />
      </motion.div>

      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Particle Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border border-current opacity-5 rounded-full"
        />

        {/* The Two Identities (Orbs) */}
        <AnimatePresence>
          {/* Partner Orb (Pink) */}
          <motion.div
            initial={{ x: -100, opacity: 0, scale: 0.5 }}
            animate={{ 
              x: 0, 
              opacity: 0.8, 
              scale: 1,
              transition: { duration: 2, ease: [0.16, 1, 0.3, 1] }
            }}
            className="absolute w-32 h-32 rounded-full blur-2xl"
            style={{ backgroundColor: 'var(--accent-pink)' }}
          />

          {/* User Orb (Green) */}
          <motion.div
            initial={{ x: 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              x: 0, 
              opacity: 0.8, 
              scale: 1,
              transition: { duration: 2, ease: [0.16, 1, 0.3, 1] }
            }}
            className="absolute w-32 h-32 rounded-full blur-2xl"
            style={{ backgroundColor: 'var(--accent-green)' }}
          />
        </AnimatePresence>

        {/* The Fusion Core (Emerging Unity) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.4],
            transition: { delay: 1.8, duration: 2, times: [0, 0.6, 1] }
          }}
          className="absolute w-48 h-48 rounded-full bg-white blur-3xl mix-blend-screen"
        />

        {/* Central Monogram / Soul */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="text-xs font-bold uppercase tracking-[0.5em] opacity-40 heading-font mb-4">
            Unified
          </div>
          <div className="text-4xl font-light tracking-tighter opacity-80 italic">
            Kindred.
          </div>
        </motion.div>
      </div>

      {/* Progress Labels */}
      <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.5, 1] }}
          className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font"
        >
          Syncing Frequencies
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] heading-font"
        >
          Connection Established with {partnerName}
        </motion.div>
      </div>
    </div>
  );
};

export default FusionAnimation;
