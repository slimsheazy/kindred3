
import React from 'react';
import { sensoryService } from '../../services/sensoryService';

const REPAIRS = [
  { cat: "I Feel", text: "I'm feeling defensive. Can you rephrase that?" },
  { cat: "I Sorry", text: "I really blew that. I'm sorry." },
  { cat: "Get to Yes", text: "I agree with part of what you're saying." },
  { cat: "Appreciation", text: "I love you. This is hard, but I'm here." },
  { cat: "Stop Action", text: "Let's take a 20-minute break." }
];

const RepairAttemptMenu: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <div className="space-y-12">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Repair Menu.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">De-escalation Phrases</p>
      </header>

      <div className="space-y-4">
        {REPAIRS.map((repair, i) => (
          <button
            key={i}
            onClick={() => sensoryService.tap()}
            className="w-full p-8 border border-current border-opacity-5 rounded-[2rem] bg-current/2 hover:bg-current/5 text-left flex flex-col group transition-all"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent-pink)] opacity-60 mb-2">{repair.cat}</span>
            <p className="text-xl font-light italic">"{repair.text}"</p>
          </button>
        ))}
      </div>

      <button 
        onClick={() => { sensoryService.success(); onComplete(); }}
        className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all"
      >
        Finish Review
      </button>
    </div>
  );
};

export default RepairAttemptMenu;
