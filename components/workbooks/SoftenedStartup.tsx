
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';

const SoftenedStartup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [text, setText] = useState('');

  return (
    <div className="space-y-12">
      <header className="mb-8">
        <h2 className="text-clamp-4xl font-light mb-2">Soft Startup.</h2>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Conflict Initiation Tool</p>
      </header>

      <div className="p-8 bg-[var(--accent-pink)]/5 rounded-[3rem] border border-[var(--accent-pink)]/10 mb-8">
        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-40 heading-font">The Formula</h4>
        <p className="text-xl italic font-light leading-relaxed">
          "I feel [Emotion] about [Specific Event], and I need [Positive Need]."
        </p>
      </div>

      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Draft your softened startup here..."
        className="w-full h-48 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-[3rem] p-10 text-2xl font-light italic"
      />

      <button 
        disabled={!text.trim()}
        onClick={() => { sensoryService.success(); onComplete(); }}
        className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all disabled:opacity-10"
      >
        Internalize Script
      </button>
    </div>
  );
};

export default SoftenedStartup;
