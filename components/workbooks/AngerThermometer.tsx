
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

const AngerThermometer: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [level, setLevel] = useState(1);
  const [isFlooded, setIsFlooded] = useState(false);
  const [step, setStep] = useState<'rating' | 'protocol' | 'finalize'>('rating');

  useEffect(() => {
    // My self-soothing threshold: 6+
    if (level >= 6 && !isFlooded) {
      sensoryService.alert();
      setIsFlooded(true);
    } else if (level < 6) {
      setIsFlooded(false);
    }
  }, [level, isFlooded]);

  const handleFinalize = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Anger Thermometer', {
        level,
        thresholdReached: level >= 6,
        timestamp: Date.now()
      });
      await cloudService.updateBondScore(partnerCode, 'Conflict', 0.2);
    }
    onComplete();
  };

  const getThermometerColor = () => {
    if (level < 4) return 'var(--accent-green)';
    if (level < 6) return '#FFCC00';
    return 'var(--accent-pink)';
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="mb-8 text-center">
        <h2 className="text-clamp-4xl font-light mb-2">Resonance Check.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Anger Thermometer + Time-Out</p>
      </header>

      <AnimatePresence mode="wait">
        {step === 'rating' && (
          <motion.div key="rating" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12 text-center">
            <h3 className="text-2xl font-light italic mb-8">"Rate your current intensity:"</h3>
            
            <div className="relative h-20 bg-current/5 rounded-full flex items-center px-4">
              <motion.div 
                className="absolute left-0 top-0 bottom-0 rounded-full transition-colors duration-500"
                initial={false}
                animate={{ width: `${(level / 10) * 100}%`, backgroundColor: getThermometerColor() }}
              />
              <input 
                type="range" min="1" max="10" step="1"
                value={level}
                onChange={(e) => { setLevel(parseInt(e.target.value)); sensoryService.tap(); }}
                className="relative z-10 w-full accent-white"
              />
            </div>

            <div className="flex justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">1 (Calm)</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">10 (Exploding)</span>
            </div>

            <div className="text-8xl font-light tracking-tighter" style={{ color: getThermometerColor() }}>
              {level}
            </div>

            <div className="space-y-2">
                <p className="text-sm italic opacity-60">
                {level < 4 ? "Grounded & Receptive." : level < 6 ? "Internal heat rising." : "FLOODING DETECTED."}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-20">Threshold: 6+</p>
            </div>

            <button 
              onClick={() => { sensoryService.tap(); setStep(level >= 6 ? 'protocol' : 'finalize'); }}
              className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl"
            >
              {level >= 6 ? "Activate Break Plan" : "Archive Measurement"}
            </button>
          </motion.div>
        )}

        {step === 'protocol' && (
          <motion.div key="protocol" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="p-12 bg-[var(--accent-pink)]/5 border border-[var(--accent-pink)]/20 rounded-[3.5rem]">
               <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--accent-pink)] mb-10 block text-center heading-font">Emergency Break Plan</span>
               
               <div className="space-y-10 text-left">
                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-pink)] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-widest">Separate</h4>
                        <p className="text-sm italic opacity-60">Agree to stop immediately. Move to different rooms for 20-30 min.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-pink)] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-widest">Self-Soothe</h4>
                        <p className="text-sm italic opacity-60">Practice Deep Breathing (4-7-8 technique). Focus on physiology, not the fight.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-pink)] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-widest">Release</h4>
                        <p className="text-sm italic opacity-60">Write an "Angry Letter" to your partner detailing everything you feel. DO NOT SEND IT.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-pink)] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">4</div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-widest">Re-entry</h4>
                        <p className="text-sm italic opacity-60">Return only when calm. Initiate with: "I'm calmer now. Can we try again?"</p>
                    </div>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => { sensoryService.tap(); setStep('finalize'); }}
              className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl"
            >
              Protocol Internalized
            </button>
          </motion.div>
        )}

        {step === 'finalize' && (
          <motion.div key="finalize" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-12 py-10">
            <div className="w-24 h-24 rounded-full border border-current border-opacity-10 flex items-center justify-center mx-auto mb-10">
               <span className="text-3xl opacity-40">✦</span>
            </div>
            <h3 className="text-clamp-4xl font-light">Equilibrium Architected.</h3>
            <div className="space-y-6 max-w-sm mx-auto">
                <p className="text-xl italic opacity-60 font-light leading-relaxed">
                Self-regulation is the foundation of relational safety.
                </p>
                <div className="p-6 bg-[var(--accent-green)]/10 rounded-3xl border border-[var(--accent-green)]/20">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] block mb-2">Practice Goal</span>
                    <p className="text-sm font-bold uppercase tracking-widest">Implement this Protocol 3x this month.</p>
                </div>
            </div>
            <button onClick={handleFinalize} className="w-full py-7 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] heading-font">Seal Measurement</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AngerThermometer;
