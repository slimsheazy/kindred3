
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

type Step = 'issue' | 'my-world' | 'partner-world' | 'oasis' | 'finalize';

const ISSUE_PRESETS = ['Money', 'Parenting', 'Sex', 'In-laws', 'Career', 'Time Management'];
const DREAM_PRESETS = ['Independence', 'Security', 'Connection', 'Freedom', 'Validation', 'Joy', 'Order'];

const DreamsWithinConflict: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('issue');
  const [issue, setIssue] = useState('');
  const [myPosition, setMyPosition] = useState('');
  const [myDream, setMyDream] = useState('');
  const [originStory, setOriginStory] = useState('');
  const [partnerDream, setPartnerDream] = useState('');
  const [commonGround, setCommonGround] = useState('');
  const [compromise, setCompromise] = useState('');

  const next = () => {
    sensoryService.tap();
    if (step === 'issue') setStep('my-world');
    else if (step === 'my-world') setStep('partner-world');
    else if (step === 'partner-world') setStep('oasis');
    else if (step === 'oasis') setStep('finalize');
  };

  const finalize = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Dreams within Conflict', {
        issue,
        myPosition,
        myDream,
        originStory,
        partnerDream,
        commonGround,
        compromise,
        timestamp: Date.now()
      });
      await cloudService.updateBondScore(partnerCode, 'Conflict', 0.4);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">The Gridlock.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Dreams Within Conflict Grid</p>
      </header>

      <AnimatePresence mode="wait">
        {step === 'issue' && (
          <motion.div key="issue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Select or Type Issue</span>
              <div className="flex flex-wrap gap-2">
                {ISSUE_PRESETS.map(p => (
                  <button 
                    key={p} 
                    onClick={() => setIssue(p)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${issue === p ? 'bg-current text-[var(--bg-primary)]' : 'border-current border-opacity-10 opacity-40'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Or type another issue..."
                className="w-full bg-transparent border-b border-current border-opacity-10 py-4 text-xl font-light italic outline-none focus:border-opacity-60 transition-all"
              />
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">My Current Position</span>
              <textarea 
                value={myPosition}
                onChange={(e) => setMyPosition(e.target.value)}
                placeholder="What is your 'hard' stance on this issue?"
                className="w-full bg-current/5 p-6 rounded-3xl text-xl font-light italic outline-none h-32 border border-current border-opacity-5"
              />
            </div>

            <button onClick={next} disabled={!issue.trim() || !myPosition.trim()} className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10">Uncover My Dream</button>
          </motion.div>
        )}

        {step === 'my-world' && (
          <motion.div key="my-world" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
             <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] block mb-4 heading-font">My Dream</span>
                <div className="flex flex-wrap gap-2">
                  {DREAM_PRESETS.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setMyDream(d)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${myDream === d ? 'bg-[var(--accent-green)] text-black border-transparent' : 'border-current border-opacity-10 opacity-40'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  value={myDream}
                  onChange={(e) => setMyDream(e.target.value)}
                  placeholder="The hidden value behind my position..."
                  className="w-full bg-transparent border-b border-current border-opacity-10 py-4 text-xl font-light italic outline-none"
                />
             </div>

             <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Origin Story</span>
                <textarea 
                  value={originStory}
                  onChange={(e) => setOriginStory(e.target.value)}
                  placeholder="This comes from my [childhood/experience] where..."
                  className="w-full bg-current/5 p-6 rounded-3xl text-xl font-light italic outline-none h-40 border border-current border-opacity-5 shadow-inner"
                />
             </div>

            <button onClick={next} disabled={!myDream.trim() || !originStory.trim()} className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10">Listen to Partner</button>
          </motion.div>
        )}

        {step === 'partner-world' && (
          <motion.div key="partner-world" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
             <div className="text-center mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-pink)] block mb-4 heading-font">Partner's World</span>
                <h3 className="text-2xl font-light italic leading-relaxed">"What is the dream or value for my partner in this?"</h3>
             </div>
             
             <textarea 
              value={partnerDream}
              onChange={(e) => setPartnerDream(e.target.value)}
              placeholder="Reflect back what you heard about their dream..."
              className="w-full bg-current/5 p-8 rounded-[3rem] text-xl font-light italic outline-none h-48 border border-current border-opacity-5 shadow-inner"
            />
            
            <button onClick={next} disabled={!partnerDream.trim()} className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10">Find the Oasis</button>
          </motion.div>
        )}

        {step === 'oasis' && (
          <motion.div key="oasis" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
             <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] heading-font">Common Ground</span>
                  <textarea 
                    value={commonGround}
                    onChange={(e) => setCommonGround(e.target.value)}
                    placeholder="Where do our dreams overlap?"
                    className="w-full bg-current/2 p-6 rounded-[2rem] text-lg font-light italic outline-none h-28 border border-current border-opacity-10"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-pink)] heading-font">The Compromise</span>
                  <textarea 
                    value={compromise}
                    onChange={(e) => setCompromise(e.target.value)}
                    placeholder="What temporary agreement honors both dreams?"
                    className="w-full bg-current/2 p-6 rounded-[2rem] text-lg font-light italic outline-none h-28 border border-current border-opacity-10"
                  />
                </div>
             </div>

            <button onClick={next} disabled={!commonGround.trim() || !compromise.trim()} className="w-full py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10">Seal the Understanding</button>
          </motion.div>
        )}

        {step === 'finalize' && (
          <motion.div key="finalize" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-12 py-10">
            <div className="w-24 h-24 rounded-full border border-current border-opacity-10 flex items-center justify-center mx-auto mb-10">
               <span className="text-3xl opacity-40">✦</span>
            </div>
            <h3 className="text-clamp-4xl font-light">Dialogue Sealed.</h3>
            <p className="text-xl italic opacity-60 font-light max-w-sm mx-auto">
              Moving from gridlock to understanding is the highest form of conflict resilience.
            </p>
            <button onClick={finalize} className="w-full py-7 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] heading-font">Commit to Shared Dream</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DreamsWithinConflict;
