
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

const STAGES = [
  { id: 1, title: "Atonement", desc: "Partner admits fault and takes full responsibility." },
  { id: 2, title: "Attunement", desc: "Understanding the deep impact and pain of the betrayal." },
  { id: 3, title: "Attachment", desc: "Active work to rebuild basic security and trust." },
  { id: 4, title: "Autonomy", desc: "Individual healing and emotional independence." },
  { id: 5, title: "Aspiration", desc: "Moving toward higher functioning and shared growth." },
  { id: 6, title: "Alliance", desc: "Forging a stronger, more resilient partnership." },
  { id: 7, title: "Attachment Security", desc: "Sustainable, deep relational safety achieved." }
];

const BetrayalRecovery: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [step, setStep] = useState<'map' | 'reflection' | 'finalize'>('map');
  const [reflection, setReflection] = useState('');
  const [stalledStage, setStalledStage] = useState<number | null>(null);

  const toggleStage = (id: number) => {
    sensoryService.tap();
    setCompletedStages(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleToReflection = () => {
    sensoryService.tap();
    setStep('reflection');
  };

  const handleToFinalize = () => {
    sensoryService.tap();
    setStep('finalize');
  };

  const finalize = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Betrayal Map', {
        completedStages,
        reflection,
        stalledStage: stalledStage ? STAGES.find(s => s.id === stalledStage)?.title : null,
        timestamp: Date.now()
      });
      // Small boost to trust for the honesty of the map
      await cloudService.updateBondScore(partnerCode, 'Trust', 0.3);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Recovery Map.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">7-Step Healing Architecture</p>
      </header>

      <AnimatePresence mode="wait">
        {step === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <p className="text-sm italic opacity-60 px-2">Mark the stages you feel you have successfully navigated as a couple.</p>
            
            <div className="relative flex flex-col gap-4">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-current opacity-5" />
              {STAGES.map((s) => {
                const isDone = completedStages.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStage(s.id)}
                    className="flex items-start gap-6 text-left group transition-all"
                  >
                    <div className={`mt-1 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 transition-all ${
                      isDone 
                        ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] border-transparent' 
                        : 'bg-transparent border-current border-opacity-10 opacity-40 group-hover:opacity-100'
                    }`}>
                      {isDone ? '✓' : '✗'}
                    </div>
                    <div className={`flex-grow pb-6 border-b border-current border-opacity-5 transition-opacity ${isDone ? 'opacity-100' : 'opacity-40'}`}>
                      <h4 className="text-lg font-bold uppercase tracking-widest heading-font mb-1">Stage {s.id}: {s.title}</h4>
                      <p className="text-sm italic font-light leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={handleToReflection}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
            >
              Continue to Reflection
            </button>
          </motion.div>
        )}

        {step === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h3 className="text-2xl font-light mb-4 italic">"What helped us move forward?"</h3>
              <p className="text-sm italic opacity-60">Identify a specific action or conversation that enabled a transition between stages.</p>
            </div>

            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="E.g., 'The deep listening session last Tuesday helped us move from Atonement to Attunement...'"
              className="w-full p-8 bg-current/5 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-3xl text-lg font-light italic transition-all resize-none h-48"
            />

            <button 
              onClick={handleToFinalize}
              disabled={!reflection.trim()}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font disabled:opacity-20"
            >
              Define Next Step
            </button>
          </motion.div>
        )}

        {step === 'finalize' && (
          <motion.div
            key="finalize"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h3 className="text-2xl font-light mb-4">Focused Growth.</h3>
              <p className="text-sm italic opacity-60">Pick one stage that feels 'stalled' or requires the most focused attention right now.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { sensoryService.tap(); setStalledStage(s.id); }}
                  className={`p-6 rounded-[2rem] border text-left transition-all ${
                    stalledStage === s.id 
                      ? 'bg-[var(--accent-pink)] text-[var(--bg-primary)] border-transparent' 
                      : 'bg-current/2 border-current border-opacity-5 opacity-60'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">Stage {s.id}</span>
                  <span className="text-lg font-light italic">{s.title}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={finalize}
              disabled={!stalledStage}
              className="w-full py-6 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font disabled:opacity-20"
            >
              Seal Map & Commit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BetrayalRecovery;

