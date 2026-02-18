
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

const HORSEMEN_ITEMS = [
  { id: 'criticism', name: 'CRITICISM', example: '"You never..." / "You always..."' },
  { id: 'defensiveness', name: 'DEFENSIVENESS', example: '"I was just..." / "It\'s not my fault..."' },
  { id: 'contempt', name: 'CONTEMPT', example: 'Eye roll, sarcasm, mockery, name-calling.' },
  { id: 'stonewalling', name: 'STONEWALLING', example: 'Silence, walking away, shutting down.' }
];

const ANTIDOTES = [
  { id: 'gentle', label: 'Gentle Startup', detail: '"I feel... about... I need..."' },
  { id: 'responsibility', label: 'Take Responsibility', detail: '"You\'re right, I played a part in this by..."' },
  { id: 'culture', label: 'Build Culture of Appreciation', detail: 'Aim for a 5:1 ratio of positive to negative.' },
  { id: 'soothing', label: 'Self-Soothing', detail: 'Implement a 20-min physiological break plan.' }
];

const HorsemenAudit: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState<'audit' | 'practice' | 'finalize'>('audit');
  const [ratings, setRatings] = useState<Record<string, number>>({
    criticism: 1,
    defensiveness: 1,
    contempt: 1,
    stonewalling: 1
  });
  const [checkedAntidotes, setCheckedAntidotes] = useState<string[]>([]);

  const handleRating = (id: string, val: number) => {
    sensoryService.tap();
    setRatings(prev => ({ ...prev, [id]: val }));
  };

  const toggleAntidote = (id: string) => {
    sensoryService.tap();
    setCheckedAntidotes(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const finalize = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Four Horsemen Audit', {
        ratings,
        antidotesCommitted: checkedAntidotes,
        timestamp: Date.now()
      });
      // Small nudge to conflict score for self-awareness
      await cloudService.updateBondScore(partnerCode, 'Conflict', 0.2);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Self-Audit.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Four Horsemen Inventory</p>
      </header>

      <AnimatePresence mode="wait">
        {activeStep === 'audit' && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="text-center">
              <p className="text-sm italic opacity-60">"In our last conflict, rate your use of each behavior (1-5):"</p>
            </div>

            <div className="space-y-10">
              {HORSEMEN_ITEMS.map((h) => (
                <div key={h.id} className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-bold tracking-[0.2em] heading-font">{h.name}</h4>
                    <span className="text-[10px] italic opacity-40">{h.example}</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => handleRating(h.id, num)}
                        className={`flex-1 py-4 rounded-2xl border transition-all text-sm font-bold ${
                          ratings[h.id] === num 
                            ? 'bg-current text-[var(--bg-primary)] border-transparent' 
                            : 'bg-transparent border-current border-opacity-10 opacity-40 hover:opacity-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { sensoryService.tap(); setActiveStep('practice'); }}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
            >
              Define Antidote Practice
            </button>
          </motion.div>
        )}

        {activeStep === 'practice' && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-10"
          >
            <div className="text-center">
              <h3 className="text-2xl font-light mb-2 uppercase tracking-widest heading-font">Antidote Practice.</h3>
              <p className="text-sm italic opacity-60">Select the practices you will consciously use moving forward.</p>
            </div>

            <div className="space-y-4">
              {ANTIDOTES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAntidote(a.id)}
                  className={`w-full p-8 rounded-[2.5rem] border text-left transition-all relative overflow-hidden group ${
                    checkedAntidotes.includes(a.id)
                      ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] border-transparent'
                      : 'bg-current/2 border-current border-opacity-5 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <span className="text-lg font-bold block mb-1">{a.label}</span>
                      <span className="text-xs italic opacity-80">{a.detail}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      checkedAntidotes.includes(a.id) ? 'border-[var(--bg-primary)]' : 'border-current border-opacity-10'
                    }`}>
                      {checkedAntidotes.includes(a.id) && <span>✓</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => { sensoryService.tap(); setActiveStep('finalize'); }}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
            >
              Continue to Finalize
            </button>
          </motion.div>
        )}

        {activeStep === 'finalize' && (
          <motion.div
            key="finalize"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-center py-10"
          >
            <div className="w-24 h-24 rounded-full border border-current border-opacity-5 flex items-center justify-center mx-auto mb-12 relative">
              <div className="absolute inset-0 bg-[var(--accent-green)] rounded-full animate-ping opacity-10" />
              <div className="w-4 h-4 bg-[var(--accent-green)] rounded-full" />
            </div>
            
            <h3 className="text-clamp-4xl font-light mb-6">Commitment Captured.</h3>
            <p className="text-xl italic opacity-60 font-light leading-relaxed max-w-sm mx-auto mb-16">
              Recognizing these patterns is the architecture of change. Seal this audit to update your shared connection state.
            </p>

            <div className="space-y-4">
              <button 
                onClick={finalize}
                className="w-full py-7 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl transition-all active:scale-95 heading-font"
              >
                Seal & Commit
              </button>
              <button 
                onClick={() => setActiveStep('audit')}
                className="text-[10px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
              >
                Revise Audit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HorsemenAudit;
