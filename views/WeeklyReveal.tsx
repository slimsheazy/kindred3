
import React, { useState, useEffect, useCallback } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';

// Fix: Cast motion to any to resolve environment-specific type errors with motion component props
const motion = motionBase as any;

import { cloudService } from '../services/cloudService';
import { generateWeeklySynthesis } from '../services/geminiService';
import { UserData, WeeklySynthesis, JournalEntry, Activity } from '../types';
import Markdown from 'markdown-to-jsx';

interface WeeklyRevealProps {
  userData: UserData | null;
  onClose: () => void;
}

const WeeklyReveal: React.FC<WeeklyRevealProps> = ({ userData, onClose }) => {
  const [synthesis, setSynthesis] = useState<WeeklySynthesis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'intro' | 'poem' | 'insight' | 'seal'>('intro');

  const initiateReveal = useCallback(async () => {
    if (!userData) return;
    const partnerCode = userData.partnerCode || userData.id;
    
    // 1. Try to fetch existing for this week (simple timestamp check for now)
    const existing = await cloudService.getLatestWeeklySynthesis(partnerCode);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    if (existing && existing.timestamp > oneWeekAgo) {
      setSynthesis(existing);
      setIsLoading(false);
      return;
    }

    // 2. Generate new if not found or stale
    try {
      const [entries, activities] = await Promise.all([
        cloudService.getJournalEntries(partnerCode),
        cloudService.getActiveActivity(partnerCode).then(a => a ? [a] : []) // Simplified activity fetch
      ]);

      const result = await generateWeeklySynthesis(entries, activities as Activity[]);
      const newSynthesis: WeeklySynthesis = {
        id: `weekly-${Date.now()}`,
        partnerCode,
        poem: result.poem,
        insight: result.insight,
        timestamp: Date.now(),
        readBy: [userData.id]
      };

      await cloudService.saveWeeklySynthesis(newSynthesis);
      setSynthesis(newSynthesis);
    } catch (err) {
      console.error("Synthesis generation failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    initiateReveal();
  }, [initiateReveal]);

  const handleSeal = async () => {
    if (synthesis && userData) {
      const updated = {
        ...synthesis,
        readBy: Array.from(new Set([...synthesis.readBy, userData.id]))
      };
      await cloudService.saveWeeklySynthesis(updated);
    }
    onClose();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#121212] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border border-white/10 border-t-white rounded-full animate-spin mb-12" />
        <h2 className="text-clamp-5xl font-light text-[#FDFCF0] mb-4">Weaving Time.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#FDFCF0]/30 heading-font">Kindred Oracle is gathering your echoes</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#121212] text-[#FDFCF0] flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-[#FF85B3] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-[#A8FFB5] blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center z-10"
          >
            <h1 className="text-clamp-7xl font-light mb-8">The Reveal.</h1>
            <p className="text-xl italic opacity-60 font-light max-w-sm mx-auto mb-16 leading-relaxed">
              Seven days of shared breath, captured and distilled into a singular frequency.
            </p>
            <button 
              onClick={() => setStep('poem')}
              className="px-12 py-5 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all heading-font"
            >
              Enter the Synthesis
            </button>
          </motion.div>
        )}

        {step === 'poem' && (
          <motion.div 
            key="poem"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center z-10 max-w-lg"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-12 block heading-font">Weekly Echo</span>
            <div className="text-3xl font-light leading-relaxed italic mb-16 whitespace-pre-wrap">
               <Markdown>{synthesis?.poem || ""}</Markdown>
            </div>
            <button 
              onClick={() => setStep('insight')}
              className="text-xs font-bold uppercase tracking-[0.2em] border-b border-white/20 pb-2 hover:opacity-100 opacity-40 transition-all heading-font"
            >
              Continue to Insight
            </button>
          </motion.div>
        )}

        {step === 'insight' && (
          <motion.div 
            key="insight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 max-w-lg"
          >
            <div className="p-12 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl shadow-2xl">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8 block heading-font">Oracle Insight</span>
              <p className="text-2xl font-light leading-relaxed mb-12 italic">
                {synthesis?.insight}
              </p>
              <button 
                onClick={() => setStep('seal')}
                className="w-full py-6 bg-[#FDFCF0] text-[#121212] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl heading-font"
              >
                Seal the Week
              </button>
            </div>
          </motion.div>
        )}

        {step === 'seal' && (
          <motion.div 
            key="seal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center z-10"
          >
            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-12">
               <div className="w-4 h-4 bg-[#A8FFB5] rounded-full animate-ping" />
            </div>
            <h2 className="text-clamp-5xl font-light mb-4">Internalized.</h2>
            <p className="text-base opacity-40 italic mb-16">
              This synthesis has been added to your shared Archive.
            </p>
            <button 
              onClick={handleSeal}
              className="text-xs font-bold uppercase tracking-widest border-b border-white/20 pb-2 heading-font"
            >
              Return to Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklyReveal;
