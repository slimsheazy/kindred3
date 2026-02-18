
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';

const SpeakerListenerCard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [role, setRole] = useState<'speaker' | 'listener'>('speaker');
  const [step, setStep] = useState(0);

  const steps = {
    speaker: [
      "Speak for yourself. Use 'I' statements.",
      "Keep it brief. Don't go on and on.",
      "Stop to let the listener paraphrase."
    ],
    listener: [
      "Paraphrase what you heard. 'What I heard you say is...'",
      "Don't rebut. Focus on understanding, not agreeing.",
      "Check for accuracy. 'Did I get that right?'"
    ]
  };

  const next = () => {
    sensoryService.tap();
    if (step < steps[role].length - 1) {
      setStep(step + 1);
    } else if (role === 'speaker') {
      setRole('listener');
      setStep(0);
    } else {
      sensoryService.success();
      onComplete();
    }
  };

  return (
    <div className="space-y-12">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Dialogue Card.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Speaker-Listener Technique</p>
      </header>

      <div className="flex justify-center gap-4 mb-12">
        <button 
          className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${role === 'speaker' ? 'bg-current text-[var(--bg-primary)]' : 'border-current border-opacity-10 opacity-40'}`}
          onClick={() => { setRole('speaker'); setStep(0); }}
        >
          Speaker
        </button>
        <button 
          className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${role === 'listener' ? 'bg-current text-[var(--bg-primary)]' : 'border-current border-opacity-10 opacity-40'}`}
          onClick={() => { setRole('listener'); setStep(0); }}
        >
          Listener
        </button>
      </div>

      <div className="p-10 rounded-[3rem] bg-current/2 border border-current border-opacity-5 text-center min-h-[200px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role}-${step}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-6 block">Rule {step + 1}</span>
            <p className="text-3xl font-light italic leading-relaxed">
              "{steps[role][step]}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <button 
        onClick={next}
        className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all"
      >
        {step === steps[role].length - 1 && role === 'listener' ? 'Complete Exercise' : 'Next Rule'}
      </button>
    </div>
  );
};

export default SpeakerListenerCard;
