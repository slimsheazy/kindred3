
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';

type BuildStep = 'situation' | 'feeling' | 'trigger' | 'need' | 'final';

const FEELINGS = ['angry', 'sad', 'scared', 'hurt'];
const NEEDS = ['reassurance', 'space', 'time', 'validation'];

const IStatementBuilder: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<BuildStep>('situation');
  const [situation, setSituation] = useState('');
  const [feeling, setFeeling] = useState('');
  const [trigger, setTrigger] = useState('');
  const [need, setNeed] = useState('');

  const nextStep = () => {
    sensoryService.tap();
    if (step === 'situation') setStep('feeling');
    else if (step === 'feeling') setStep('trigger');
    else if (step === 'trigger') setStep('need');
    else if (step === 'need') setStep('final');
  };

  const getProgress = () => {
    const steps: BuildStep[] = ['situation', 'feeling', 'trigger', 'need', 'final'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  return (
    <div className="space-y-12">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Builder.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Constructive Expression Architecture</p>
      </header>

      <div className="w-full h-1 bg-current opacity-5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[var(--accent-green)]" 
          animate={{ width: `${getProgress()}%` }} 
          transition={{ duration: 0.5, ease: "circOut" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 'situation' && (
          <motion.div key="situation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <h3 className="text-3xl font-light italic">"When..." (Situation)</h3>
            <textarea 
              value={situation} 
              onChange={(e) => setSituation(e.target.value)}
              placeholder="e.g., we are late for dinner, the house is cluttered..."
              className="w-full bg-transparent border-b border-current border-opacity-10 py-6 text-2xl font-light italic outline-none focus:border-opacity-60 transition-all resize-none h-32"
            />
            <p className="text-sm opacity-40 italic">Describe the context objectively.</p>
            <button disabled={!situation.trim()} onClick={nextStep} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-20 transition-all">Next Component</button>
          </motion.div>
        )}

        {step === 'feeling' && (
          <motion.div key="feeling" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h3 className="text-3xl font-light italic">"...I feel..."</h3>
            <div className="grid grid-cols-2 gap-4">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFeeling(f); sensoryService.tap(); }}
                  className={`py-6 rounded-2xl border text-sm font-bold uppercase tracking-widest transition-all ${feeling === f ? 'bg-current text-[var(--bg-primary)] border-transparent' : 'border-current border-opacity-10 opacity-40 hover:opacity-100'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="text-sm opacity-40 italic text-center">Circle your core emotional resonance.</p>
            <button disabled={!feeling} onClick={nextStep} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-20 transition-all">Next Component</button>
          </motion.div>
        )}

        {step === 'trigger' && (
          <motion.div key="trigger" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h3 className="text-3xl font-light italic">"...because..." (Trigger)</h3>
            <textarea 
              value={trigger} 
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Identify the partner's words or action..."
              className="w-full bg-transparent border-b border-current border-opacity-10 py-6 text-2xl font-light italic outline-none focus:border-opacity-60 transition-all resize-none h-32"
            />
            <p className="text-sm opacity-40 italic">Connect the feeling to a specific behavioral trigger.</p>
            <button disabled={!trigger.trim()} onClick={nextStep} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-20 transition-all">Next Component</button>
          </motion.div>
        )}

        {step === 'need' && (
          <motion.div key="need" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h3 className="text-3xl font-light italic">"I need..."</h3>
            <div className="grid grid-cols-2 gap-4">
              {NEEDS.map((n) => (
                <button
                  key={n}
                  onClick={() => { setNeed(n); sensoryService.tap(); }}
                  className={`py-6 rounded-2xl border text-sm font-bold uppercase tracking-widest transition-all ${need === n ? 'bg-current text-[var(--bg-primary)] border-transparent' : 'border-current border-opacity-10 opacity-40 hover:opacity-100'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm opacity-40 italic text-center">Select your positive request.</p>
            <button disabled={!need} onClick={nextStep} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-20 transition-all">Generate Script</button>
          </motion.div>
        )}

        {step === 'final' && (
          <motion.div key="final" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
            <div className="p-12 rounded-[3.5rem] bg-current/2 border border-current border-opacity-5 text-center shadow-inner relative overflow-hidden">
               <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8 block">Full Statement</span>
               <p className="text-3xl font-light italic leading-relaxed">
                 "When <span className="font-bold">{situation}</span>, I feel <span className="text-[var(--accent-pink)] font-bold">{feeling}</span> because <span className="font-bold">{trigger}</span>. I need <span className="text-[var(--accent-green)] font-bold">{need}</span>."
               </p>
               <div className="mt-12 pt-8 border-t border-current border-opacity-5">
                 <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--accent-green)]">PRACTICE 3x this week.</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => { sensoryService.success(); onComplete(); }}
                className="w-full py-7 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Seal & Commit to Practice
              </button>
              <button 
                onClick={() => { setStep('situation'); setSituation(''); setFeeling(''); setTrigger(''); setNeed(''); }}
                className="w-full text-[10px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
              >
                Rebuild Statement
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IStatementBuilder;
