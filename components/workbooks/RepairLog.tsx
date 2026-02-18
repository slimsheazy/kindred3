
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

const REPAIR_OPTIONS = ["I'm sorry", "Humor", "Touch", "Take break"];
const RESPONSE_OPTIONS = ["Accepted", "Rejected", "Neutral"];

type Step = 'date_attempt' | 'response' | 'reflection' | 'finalize';

const RepairLog: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('date_attempt');
  const [conflictDate, setConflictDate] = useState(new Date().toISOString().split('T')[0]);
  const [repairAttempt, setRepairAttempt] = useState('');
  const [partnerResponse, setPartnerResponse] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [futureUse, setFutureUse] = useState('');
  const [entriesCount, setEntriesCount] = useState(0);

  useEffect(() => {
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      cloudService.getQuizAnswers(partnerCode, 'Repair Attempt Log').then(ans => {
        setEntriesCount(ans.length);
      });
    }
  }, []);

  const next = () => {
    sensoryService.tap();
    if (step === 'date_attempt') setStep('response');
    else if (step === 'response') setStep('reflection');
    else if (step === 'reflection') setStep('finalize');
  };

  const finalize = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Repair Attempt Log', {
        conflictDate,
        repairAttempt,
        partnerResponse,
        whatWorked,
        futureUse,
        timestamp: Date.now()
      });
      await cloudService.updateBondScore(partnerCode, 'Conflict', 0.2);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Repair Log.</h2>
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">De-escalation Tracking</p>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent-green)]">
            {entriesCount}/5 Conflicts Logged
          </span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'date_attempt' && (
          <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Conflict Date</label>
              <input 
                type="date" 
                value={conflictDate}
                onChange={(e) => setConflictDate(e.target.value)}
                className="w-full bg-transparent border-b border-current border-opacity-10 py-4 text-2xl font-light outline-none focus:border-opacity-60 transition-all"
              />
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Repair Attempt</label>
              <div className="grid grid-cols-2 gap-3">
                {REPAIR_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setRepairAttempt(opt); sensoryService.tap(); }}
                    className={`py-6 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${repairAttempt === opt ? 'bg-current text-[var(--bg-primary)] border-transparent shadow-lg' : 'border-current border-opacity-10 opacity-40 hover:opacity-100'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={!repairAttempt}
              onClick={next}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10 transition-all"
            >
              Log Response
            </button>
          </motion.div>
        )}

        {step === 'response' && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="text-center mb-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 block mb-4 heading-font">Partner Response</span>
              <h3 className="text-2xl font-light italic">"How did they receive the attempt?"</h3>
            </div>

            <div className="space-y-4">
              {RESPONSE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setPartnerResponse(opt); sensoryService.tap(); }}
                  className={`w-full p-8 rounded-[2.5rem] border text-lg font-bold uppercase tracking-widest transition-all ${partnerResponse === opt ? 'bg-current text-[var(--bg-primary)] border-transparent' : 'bg-current/2 border-current border-opacity-5 opacity-40'}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button 
              disabled={!partnerResponse}
              onClick={next}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl disabled:opacity-10 transition-all"
            >
              Analyze Outcome
            </button>
          </motion.div>
        )}

        {step === 'reflection' && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font ml-4">What Worked?</label>
                <textarea 
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value)}
                  placeholder="Identify the effective nuance..."
                  className="w-full h-32 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-[2.5rem] p-6 text-xl font-light italic leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font ml-4">Future Use</label>
                <textarea 
                  value={futureUse}
                  onChange={(e) => setFutureUse(e.target.value)}
                  placeholder="How will we implement this next time?"
                  className="w-full h-32 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-[2.5rem] p-6 text-xl font-light italic leading-relaxed"
                />
              </div>
            </div>

            <button 
              disabled={!whatWorked.trim() || !futureUse.trim()}
              onClick={next}
              className="w-full py-6 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl disabled:opacity-10 transition-all"
            >
              Generate Synthesis
            </button>
          </motion.div>
        )}

        {step === 'finalize' && (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12 text-center py-10">
            <div className="p-12 rounded-[3.5rem] bg-current/2 border border-current border-opacity-5 text-left shadow-inner">
               <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8 block text-center">Log Entry Summary</span>
               <div className="space-y-4 font-light italic text-lg leading-relaxed">
                  <p><span className="font-bold uppercase tracking-widest text-[9px] opacity-40 not-italic mr-2">Date:</span> {conflictDate}</p>
                  <p><span className="font-bold uppercase tracking-widest text-[9px] opacity-40 not-italic mr-2">Attempt:</span> {repairAttempt}</p>
                  <p><span className="font-bold uppercase tracking-widest text-[9px] opacity-40 not-italic mr-2">Response:</span> {partnerResponse}</p>
                  <div className="h-[1px] bg-current opacity-5 my-4" />
                  <p className="text-sm opacity-60"><span className="font-bold uppercase tracking-widest text-[9px] opacity-40 not-italic mr-2 block mb-1">Impact:</span> {whatWorked}</p>
                  <p className="text-sm opacity-60"><span className="font-bold uppercase tracking-widest text-[9px] opacity-40 not-italic mr-2 block mb-1">Strategy:</span> {futureUse}</p>
               </div>
            </div>

            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--accent-green)]">
                Track 5 conflicts to identify your "repair superpower."
              </p>
              <button 
                onClick={finalize}
                className="w-full py-7 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] heading-font"
              >
                Seal & Archive Attempt
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RepairLog;
