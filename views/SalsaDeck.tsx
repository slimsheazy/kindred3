
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalsaCard } from '../types';
import { generateSalsaCards } from '../services/geminiService';
import { sensoryService } from '../services/sensoryService';

interface SalsaDeckProps {
  onBack: () => void;
}

const SalsaDeck: React.FC<SalsaDeckProps> = ({ onBack }) => {
  const [level, setLevel] = useState<'Mild' | 'Medium' | 'Hot' | null>(null);
  const [cards, setCards] = useState<SalsaCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startLevel = async (newLevel: 'Mild' | 'Medium' | 'Hot') => {
    setLevel(newLevel);
    setIsLoading(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    
    // Trigger specific sensory feedback based on level
    if (newLevel === 'Mild') sensoryService.tap();
    else if (newLevel === 'Medium') sensoryService.pulse();
    else sensoryService.shiver();

    const result = await generateSalsaCards(newLevel);
    if (result.data) {
      setCards(result.data);
    }
    setIsLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      sensoryService.tap();
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setLevel(null); // Reset to level selection
    }
  };

  const toggleFlip = () => {
    sensoryService.tap();
    setIsFlipped(!isFlipped);
  };

  const getLevelColor = () => {
    switch (level) {
      case 'Mild': return 'var(--accent-green)';
      case 'Medium': return '#FFCC00'; // Amber
      case 'Hot': return 'var(--accent-pink)';
      default: return 'var(--text-primary)';
    }
  };

  if (!level) {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)] min-h-screen">
        <header className="mb-20">
          <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mb-8 block hover:opacity-100 transition-opacity">← Back to Actions</button>
          <h1 className="text-clamp-6xl font-light mb-4">Salsa Deck.</h1>
          <p className="text-xl italic opacity-60 font-light leading-relaxed">Choose your intensity. Architect the moment.</p>
        </header>

        <div className="space-y-6">
          {(['Mild', 'Medium', 'Hot'] as const).map((l) => (
            <button
              key={l}
              onClick={() => startLevel(l)}
              className="w-full p-12 rounded-[3.5rem] border border-current border-opacity-5 bg-current/2 text-left group relative overflow-hidden transition-all hover:bg-current/5"
            >
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="text-3xl font-light mb-2">{l}.</h3>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40 heading-font">
                    {l === 'Mild' ? 'Zesty & Curious' : l === 'Medium' ? 'Deep & Vulnerable' : 'Passionate & Daring'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border border-current border-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-xl">→</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-1 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] z-[100] flex flex-col p-8 overflow-hidden">
      <header className="mb-12 flex justify-between items-center">
        <button onClick={() => setLevel(null)} className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity">Exit Deck</button>
        <div className="flex gap-2">
            <span 
              className="text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-current border-opacity-10"
              style={{ color: getLevelColor() }}
            >
                {level}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-30 px-4 py-1.5">{currentIndex + 1} / {cards.length}</span>
        </div>
      </header>

      <div className="flex-grow flex items-center justify-center relative perspective-1000">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-20 h-20 border-2 border-current border-t-transparent rounded-full animate-spin opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 animate-pulse heading-font">Drawing from the Oracle...</p>
            </motion.div>
          ) : (
            <motion.div
              key={cards[currentIndex]?.id}
              initial={{ x: 100, opacity: 0, rotate: 5 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: -100, opacity: 0, rotate: -5 }}
              className="w-full max-w-sm aspect-[3/4] relative cursor-pointer group"
              onClick={toggleFlip}
            >
              {/* Card Container */}
              <div className="w-full h-full relative preserve-3d transition-transform duration-700" style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                
                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden bg-current/2 border border-current border-opacity-10 rounded-[3rem] p-12 flex flex-col justify-between shadow-2xl backdrop-blur-xl">
                  <div className="opacity-10">
                    <div className="w-12 h-12 rounded-full border border-current mb-2" />
                    <div className="w-12 h-1 h-current bg-current rounded-full" />
                  </div>
                  <h2 className="text-3xl font-light italic leading-relaxed text-center">
                    "{cards[currentIndex]?.prompt}"
                  </h2>
                  <div className="text-center">
                    <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Tap to reveal twist</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden bg-current text-[var(--bg-primary)] rounded-[3rem] p-12 flex flex-col justify-between shadow-2xl overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="text-6xl font-bold tracking-tighter">Kindred.</span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 mb-8 block heading-font">The Twist</span>
                    <p className="text-2xl font-light italic leading-relaxed">
                      {cards[currentIndex]?.twist}
                    </p>
                  </div>
                  <div className="text-center relative z-10">
                     <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-60 heading-font">Deepen the Resonance</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-12 py-12 flex flex-col gap-6">
        <button 
          onClick={handleNext}
          disabled={isLoading || cards.length === 0}
          className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl heading-font transition-all active:scale-95 disabled:opacity-20"
        >
          {currentIndex === cards.length - 1 ? 'Finish Flight' : 'Next Card'}
        </button>
        <p className="text-[9px] font-bold uppercase tracking-widest text-center opacity-20">Scale the intensity carefully. The Oracle listens.</p>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default SalsaDeck;
