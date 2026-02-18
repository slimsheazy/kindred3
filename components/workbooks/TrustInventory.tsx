
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

interface Dimension {
  key: string;
  label: string;
  description: string;
}

const DIMENSIONS: Dimension[] = [
  { key: 'honesty', label: 'Honesty', description: 'Truthfulness and authenticity.' },
  { key: 'reliability', label: 'Reliability', description: 'Following through on commitments.' },
  { key: 'vulnerability', label: 'Vulnerability', description: 'Willingness to share deep feelings.' },
  { key: 'competence', label: 'Competence', description: 'Handling shared responsibilities.' },
  { key: 'consistency', label: 'Consistency', description: 'Predictable and safe behavior.' },
  { key: 'benevolence', label: 'Benevolence', description: 'Having your best interests at heart.' },
];

type Step = 'assessment' | 'analysis' | 'partner_response' | 'action_plan' | 'finalize';

const TrustInventory: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState<Step>('assessment');
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    honesty: 5,
    reliability: 5,
    vulnerability: 5,
    competence: 5,
    consistency: 5,
    benevolence: 5,
  });
  const [actionPlans, setActionPlans] = useState<Record<string, string>>({});

  const gaps = useMemo(() => {
    // Fix: Cast Object.entries to [string, number][] to ensure arithmetic operations on values are valid
    const entries = Object.entries(scores) as [string, number][];
    return entries
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([key]) => DIMENSIONS.find(d => d.key === key)!);
  }, [scores]);

  const handleScoreChange = (val: number) => {
    setScores(prev => ({ ...prev, [DIMENSIONS[currentDimensionIndex].key]: val }));
  };

  const nextDimension = () => {
    sensoryService.tap();
    if (currentDimensionIndex < DIMENSIONS.length - 1) {
      setCurrentDimensionIndex(prev => prev + 1);
    } else {
      setActiveStep('analysis');
    }
  };

  const saveInventory = async () => {
    sensoryService.success();
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Trust Inventory', {
        scores,
        actionPlans,
        timestamp: Date.now()
      });
      // Boost trust score slightly
      await cloudService.updateBondScore(partnerCode, 'Trust', 0.5);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Trust Inventory.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Relational Integrity Assessment</p>
      </header>

      <AnimatePresence mode="wait">
        {activeStep === 'assessment' && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="w-full h-1 bg-current opacity-5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[var(--accent-green)]" 
                animate={{ width: `${((currentDimensionIndex + 1) / DIMENSIONS.length) * 100}%` }}
              />
            </div>

            <div className="min-h-[200px] flex flex-col justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-4 block heading-font">Dimension {currentDimensionIndex + 1}</span>
              <h3 className="text-4xl font-light mb-4">{DIMENSIONS[currentDimensionIndex].label}</h3>
              <p className="text-base italic opacity-50 font-light">{DIMENSIONS[currentDimensionIndex].description}</p>
            </div>

            <div className="space-y-8">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest opacity-40 heading-font">
                <span>Low Resonance</span>
                <span>High Resonance</span>
              </div>
              <input 
                type="range" 
                min="1" max="10" step="1" 
                value={scores[DIMENSIONS[currentDimensionIndex].key]}
                onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-6xl font-light opacity-80">{scores[DIMENSIONS[currentDimensionIndex].key]}</div>
            </div>

            <button 
              onClick={nextDimension}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
            >
              {currentDimensionIndex === DIMENSIONS.length - 1 ? 'Analyze Gaps' : 'Next Dimension'}
            </button>
          </motion.div>
        )}

        {activeStep === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h3 className="text-2xl font-light mb-4">Gap Analysis.</h3>
              <p className="text-sm italic opacity-60">Highlighting the three lowest scores in your assessment.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {gaps.map((gap, i) => (
                <div key={gap.key} className="p-8 rounded-[2.5rem] bg-current/5 border border-current border-opacity-5 flex justify-between items-center group">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-30 block mb-1">Gap {i+1}</span>
                    <h4 className="text-xl font-light">{gap.label}</h4>
                  </div>
                  <div className="text-2xl font-light opacity-40">{scores[gap.key]}/10</div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-current/2 rounded-[2.5rem] border border-current border-opacity-5 text-center">
              <p className="text-lg italic font-light opacity-60 leading-relaxed">
                "Discussion: What would make each of these a 10?"
              </p>
            </div>

            <button 
              onClick={() => { sensoryService.tap(); setActiveStep('partner_response'); }}
              className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
            >
              Continue to Partner Response
            </button>
          </motion.div>
        )}

        {activeStep === 'partner_response' && (
          <motion.div
            key="partner_response"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-center"
          >
            <div className="mb-12">
              <h3 className="text-3xl font-light mb-4">Partner Response.</h3>
              <p className="text-lg italic opacity-60 font-light">"Rate me on these same factors."</p>
            </div>

            <div className="p-10 bg-[var(--accent-pink)]/5 rounded-[3rem] border border-[var(--accent-pink)]/10">
              <p className="text-base italic font-light leading-relaxed">
                Relational trust is circular. Hand your device to your partner and let them provide their resonance on these same dimensions.
              </p>
            </div>

            <div className="pt-12">
               <button 
                onClick={() => { sensoryService.tap(); setActiveStep('action_plan'); }}
                className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font"
              >
                Partners Swapped: Next Step
              </button>
            </div>
          </motion.div>
        )}

        {activeStep === 'action_plan' && (
          <motion.div
            key="action_plan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h3 className="text-2xl font-light mb-4">Joint Action Plan.</h3>
              <p className="text-sm italic opacity-60">Define one small step for each identified gap.</p>
            </div>

            <div className="space-y-8">
              {gaps.map((gap) => (
                <div key={gap.key} className="space-y-3">
                  <label className="text-[9px] font-bold uppercase tracking-widest opacity-40 heading-font">{gap.label} Commitment</label>
                  <textarea
                    value={actionPlans[gap.key] || ''}
                    onChange={(e) => setActionPlans(prev => ({ ...prev, [gap.key]: e.target.value }))}
                    placeholder="E.g., 'I will provide a daily update on my scheduled meetings.'"
                    className="w-full p-6 bg-current/5 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-3xl text-lg font-light italic transition-all resize-none h-32"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={saveInventory}
              disabled={gaps.some(g => !actionPlans[g.key])}
              className="w-full py-6 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95 heading-font disabled:opacity-20"
            >
              Seal Inventory & Commit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrustInventory;
