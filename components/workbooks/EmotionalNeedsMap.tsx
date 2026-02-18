
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';

const NEEDS = [
  "Affection", "Conversation", "Honesty", "Financial Support", "Family Commitment",
  "Physical Intimacy", "Shared Hobbies", "Domestic Support", "Admirtion", "Security"
];

const EmotionalNeedsMap: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleNeed = (need: string) => {
    sensoryService.tap();
    if (selected.includes(need)) {
      setSelected(selected.filter(n => n !== need));
    } else if (selected.length < 5) {
      setSelected([...selected, need]);
    }
  };

  return (
    <div className="space-y-12">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Needs Map.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Identify your Top 5 Priorities</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {NEEDS.map((need) => (
          <button
            key={need}
            onClick={() => toggleNeed(need)}
            className={`p-6 rounded-[2rem] border text-left transition-all ${
              selected.includes(need) 
                ? 'bg-current text-[var(--bg-primary)] border-transparent' 
                : 'bg-current/2 border-current border-opacity-5 opacity-60'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-widest">{need}</span>
          </button>
        ))}
      </div>

      <div className="text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">{selected.length}/5 Selected</span>
      </div>

      <button 
        disabled={selected.length < 5}
        onClick={() => { sensoryService.success(); onComplete(); }}
        className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all disabled:opacity-10"
      >
        Finalize Priorities
      </button>
    </div>
  );
};

export default EmotionalNeedsMap;
