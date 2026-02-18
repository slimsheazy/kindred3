
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

type Phase = 'speaker' | 'listener' | 'validate' | 'switch' | 'reflection';

const SpeakerListenerProtocol: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('speaker');
  const [currentSpeaker, setCurrentSpeaker] = useState('You');
  const [hardReflection, setHardReflection] = useState('');
  const [helpReflection, setHelpReflection] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const nextPhase = () => {
    sensoryService.tap();
    if (phase === 'speaker') setPhase('listener');
    else if (phase === 'listener') setPhase('validate');
    else if (phase === 'validate') setPhase('switch');
    else if (phase === 'switch') {
      if (round < 3) {
        setRound(r => r + 1);
        setPhase('speaker');
        setCurrentSpeaker(s => s === 'You' ? 'Partner' : 'You');
      } else {
        setPhase('reflection');
      }
    }
  };

  const finalize = async () => {
    sensoryService.success();
    setIsFinalizing(true);
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Speaker-Listener Protocol', {
        roundsCompleted: 3,
        reflections: { hard: hardReflection, helped: helpReflection },
        timestamp: Date.now()
      });
      await cloudService.updateBondScore(partnerCode, 'Communication', 0.5);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Safe Dialogue.</h2>
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Speaker-Listener Protocol</p>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-20">Round {round} / 3</span>
        </div>
      </header>

      <div className="w-full h-1 bg-current opacity-5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[var(--accent-green)]" 
          animate={{ width: `${((round - 1) * 4 + ['speaker', 'listener', 'validate', 'switch', 'reflection'].indexOf(phase)) / (3 * 4) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'speaker' && (
          <motion.div key="speaker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-pink)] mb-6 block heading-font">{currentSpeaker} Speak</span>
              <h3 className="text-2xl font-light italic opacity-60">"Set the floor (3 min limit)."</h3>
            </div>
            <div className="p-12 rounded-[3.5rem] bg-current/2 border border-current border-opacity-5 text-center shadow-inner">
               <p className="text-2xl font-light leading-relaxed mb-6">"I feel ________ when ________ because ________. I need ________."</p>
               <p className="text-[9px] font-bold uppercase tracking-widest opacity-20">No attacks. Only feelings and needs.</p>
            </div>
            <button onClick={nextPhase} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all heading-font">Transition to Listener</button>
          </motion.div>
        )}

        {phase === 'listener' && (
          <motion.div key="listener" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] mb-6 block heading-font">{currentSpeaker === 'You' ? 'Partner' : 'You'} Paraphrase</span>
              <h3 className="text-2xl font-light italic opacity-60">"Reflect the essence."</h3>
            </div>
            <div className="p-12 rounded-[3.5rem] bg-current/2 border border-current border-opacity-5 text-center shadow-inner">
               <p className="text-2xl font-light leading-relaxed mb-6">"What I'm hearing is you feel ________ because ________."</p>
               <p className="text-[9px] font-bold uppercase tracking-widest opacity-20">Don't rebut. Only understand.</p>
            </div>
            <button onClick={nextPhase} className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all heading-font">Submit Paraphrase</button>
          </motion.div>
        )}

        {phase === 'validate' && (
          <motion.div key="validate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-6 block heading-font">{currentSpeaker} Validate</span>
              <h3 className="text-2xl font-light italic opacity-60">"Correct or confirm."</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={nextPhase} className="p-8 rounded-[2.5rem] bg-current/5 border border-current border-opacity-10 text-center text-xl italic font-light hover:bg-[var(--accent-green)] hover:text-black transition-all">"Yes, that's right."</button>
              <button onClick={() => { sensoryService.tap(); setPhase('speaker'); }} className="p-8 rounded-[2.5rem] bg-current/5 border border-current border-opacity-10 text-center text-xl italic font-light hover:bg-[var(--accent-pink)] hover:text-black transition-all">"No, more like ________."</button>
            </div>
          </motion.div>
        )}

        {phase === 'switch' && (
          <motion.div key="switch" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-12 text-center py-10">
            <div className="w-24 h-24 rounded-full border border-current border-opacity-10 flex items-center justify-center mx-auto mb-10">
               <span className="text-2xl opacity-40">⇄</span>
            </div>
            <h3 className="text-3xl font-light italic opacity-60">"Swap Roles."</h3>
            <p className="text-sm italic opacity-40">The listener now becomes the speaker. The floor is handed over.</p>
            <button onClick={nextPhase} className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] heading-font shadow-xl">Hand Over the Floor</button>
          </motion.div>
        )}

        {phase === 'reflection' && (
          <motion.div key="reflection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="text-center">
              <h3 className="text-2xl font-light mb-4 italic">Collaborative Reflection.</h3>
              <p className="text-sm italic opacity-60">Summarize the shared experience after 3 rounds.</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 heading-font ml-4">What was hard?</label>
                <textarea
                  value={hardReflection}
                  onChange={(e) => setHardReflection(e.target.value)}
                  placeholder="The urge to rebut, find words, etc."
                  className="w-full p-8 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-3xl text-lg font-light italic transition-all resize-none h-32"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 heading-font ml-4">What helped?</label>
                <textarea
                  value={helpReflection}
                  onChange={(e) => setHelpReflection(e.target.value)}
                  placeholder="Paraphrasing, slowing down, validation..."
                  className="w-full p-8 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-3xl text-lg font-light italic transition-all resize-none h-32"
                />
              </div>
            </div>

            <button 
              onClick={finalize}
              disabled={isFinalizing || !hardReflection.trim() || !helpReflection.trim()}
              className="w-full py-7 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl transition-all active:scale-95 disabled:opacity-20 heading-font"
            >
              {isFinalizing ? 'Archiving...' : 'Internalize Protocol'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpeakerListenerProtocol;
