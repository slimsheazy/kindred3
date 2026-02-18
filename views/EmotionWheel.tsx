import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../services/sensoryService';
import { generateEmotionSoulPrompt } from '../services/ai/generation';
import { cloudService } from '../services/cloudService';
import { UserData } from '../types';

interface EmotionWheelProps {
  onBack: () => void;
}

const EMOTIONS: Record<string, any> = {
  "Joy": {
    color: "#FDE68A",
    freq: 880,
    sub: ["Content", "Happy", "Cheerful", "Proud"],
    precise: {
      "Proud": ["Accomplished", "Confident"],
      "Content": ["Satisfied", "Peaceful"],
      "Happy": ["Amused", "Delighted"],
      "Cheerful": ["Ecstatic", "Playful"]
    }
  },
  "Love": {
    color: "var(--accent-pink)",
    freq: 783.99,
    sub: ["Affectionate", "Intimate", "Compassionate"],
    precise: {
      "Affectionate": ["Adoring", "Tender"],
      "Intimate": ["Connected", "Vulnerable"],
      "Compassionate": ["Empathetic", "Kind"]
    }
  },
  "Fear": {
    color: "#A78BFA",
    freq: 440,
    sub: ["Scared", "Anxious", "Insecure"],
    precise: {
      "Scared": ["Helpless", "Terrified"],
      "Anxious": ["Overwhelmed", "Worried"],
      "Insecure": ["Inferior", "Inadequate"]
    }
  },
  "Anger": {
    color: "#F87171",
    freq: 220,
    sub: ["Frustrated", "Annoyed", "Resentful"],
    precise: {
      "Frustrated": ["Agitated", "Infuriated"],
      "Annoyed": ["Displeased", "Irritated"],
      "Resentful": ["Bitter", "Jealous"]
    }
  },
  "Sadness": {
    color: "#60A5FA",
    freq: 110,
    sub: ["Lonely", "Hurt", "Melancholy"],
    precise: {
      "Lonely": ["Abandoned", "Isolated"],
      "Hurt": ["Betrayed", "Disappointed"],
      "Melancholy": ["Sorrowful", "Unhappy"]
    }
  },
  "Surprise": {
    color: "#FDBA74",
    freq: 987.77,
    sub: ["Amazed", "Confused", "Stunned"],
    precise: {
      "Amazed": ["Astonished", "Awestruck"],
      "Confused": ["Disoriented", "Perplexed"],
      "Stunned": ["Shocked", "Speechless"]
    }
  },
  "Disgust": {
    color: "var(--accent-green)",
    freq: 146.83,
    sub: ["Repelled", "Disapproving", "Judgmental"],
    precise: {
      "Repelled": ["Averted", "Nauseated"],
      "Disapproving": ["Judgmental", "Critical"],
      "Judgmental": ["Hostile", "Contemptuous"]
    }
  }
};

const EmotionWheel: React.FC<EmotionWheelProps> = ({ onBack }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedCore, setSelectedCore] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedPrecise, setSelectedPrecise] = useState<string | null>(null);
  const [soulPrompt, setSoulPrompt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [broadcastActive, setBroadcastActive] = useState(false);

  // Focus refs for accessibility
  const subContainerRef = useRef<HTMLDivElement>(null);
  const preciseContainerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
    document.documentElement.style.setProperty('--orb-color', '#00F2FF');
  }, []);

  const handleCoreSelect = (core: string) => {
    const config = EMOTIONS[core];
    sensoryService.emotionResonance(config.freq);
    setSelectedCore(core);
    setSelectedSub(null);
    setSelectedPrecise(null);
    setSoulPrompt(null);
    document.documentElement.style.setProperty('--orb-color', config.color);
    
    // Accessibility: Move focus to the new section
    setTimeout(() => {
        subContainerRef.current?.focus();
    }, 100);
  };

  const handleSubSelect = (sub: string) => {
    sensoryService.tap();
    setSelectedSub(sub);
    setSelectedPrecise(null);
    setSoulPrompt(null);
    
    // Accessibility: Move focus to the new section
    setTimeout(() => {
        preciseContainerRef.current?.querySelector('button')?.focus();
    }, 100);
  };

  const handlePreciseSelect = async (precise: string) => {
    sensoryService.tap();
    setSelectedPrecise(precise);
    setIsSyncing(true);
    
    // Accessibility: Focus the summary/soul prompt area
    setTimeout(() => {
        summaryRef.current?.focus();
    }, 100);

    const result = await generateEmotionSoulPrompt(`${selectedCore} > ${selectedSub} > ${precise}`);
    if (result.data) setSoulPrompt(result.data);
    setIsSyncing(false);
  };

  const handleBroadcast = async () => {
    if (!userData || !selectedPrecise) return;
    setBroadcastActive(true);
    sensoryService.success();
    await cloudService.updateVibe(userData.id, selectedPrecise);
    if (userData.partnerCode) {
      await cloudService.sendPulse(userData.partnerCode, userData.id);
    }
    setTimeout(() => {
        setBroadcastActive(false);
        onBack();
    }, 2000);
  };

  const coreList = Object.keys(EMOTIONS);
  const radius = 140;

  return (
    <div 
        className="px-6 py-12 max-w-xl mx-auto text-[var(--text-primary)] min-h-screen flex flex-col animate-fade-in relative overflow-hidden"
        role="main"
        aria-label="Emotion Resonance Wheel"
    >
      <header className="mb-12 z-10">
        <button 
            onClick={onBack} 
            className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mb-8 block hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
            aria-label="Go back to Actions"
        >
            ← Back to Actions
        </button>
        <h1 className="text-clamp-6xl font-light mb-2">Resonance.</h1>
        <p className="text-xl italic opacity-60 font-light leading-relaxed">Articulate the unsaid. Calibrate your presence.</p>
      </header>

      {/* Accessibility Status Summary for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {selectedCore && `Selected core emotion: ${selectedCore}.`}
        {selectedSub && `Selected sub-emotion: ${selectedSub}.`}
        {selectedPrecise && `Selected precise emotion: ${selectedPrecise}.`}
        {soulPrompt && `Oracle insight: ${soulPrompt}`}
      </div>

      <div className="flex-grow flex flex-col justify-start items-center gap-16 relative z-10 pt-10">
        
        {/* Tier 1: Core (Radial Layout) */}
        <div 
            className="relative w-72 h-72 flex items-center justify-center"
            role="radiogroup"
            aria-label="Core emotions"
        >
          {/* Central Point / Ring */}
          <div className="absolute w-12 h-12 rounded-full border border-current border-opacity-10 flex items-center justify-center" aria-hidden="true">
              <div className="w-2 h-2 rounded-full bg-current opacity-20 animate-pulse" />
          </div>

          {coreList.map((core, i) => {
            const angle = (i * 360) / coreList.length;
            const x = radius * Math.cos((angle * Math.PI) / 180);
            const y = radius * Math.sin((angle * Math.PI) / 180);
            const isSelected = selectedCore === core;

            return (
              <motion.button
                key={core}
                onClick={() => handleCoreSelect(core)}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Select ${core}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x, y,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`absolute w-20 h-20 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center text-center p-2 leading-tight focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-current outline-none ${
                  isSelected 
                    ? 'bg-current text-[var(--bg-primary)] border-transparent shadow-xl scale-110 z-20' 
                    : 'bg-current/5 border border-current border-opacity-10 opacity-60 hover:opacity-100 z-10'
                }`}
                style={{ 
                    transform: `translate(${x}px, ${y}px)`,
                    boxShadow: isSelected ? `0 0 20px ${EMOTIONS[core].color}44` : 'none'
                }}
              >
                {core}
              </motion.button>
            );
          })}
        </div>

        {/* Tier 2 & 3: Selection Detail */}
        <div className="w-full flex flex-col items-center gap-8 min-h-[400px]">
            <AnimatePresence mode="wait">
            {selectedCore && !selectedPrecise && (
                <motion.div 
                    key={selectedCore}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full space-y-12"
                    tabIndex={-1}
                    ref={subContainerRef}
                >
                    <div className="flex flex-col items-center gap-4" role="radiogroup" aria-label={`Sub-path for ${selectedCore}`}>
                        <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font" aria-hidden="true">Select Path</span>
                        <div className="flex flex-wrap justify-center gap-3">
                            {EMOTIONS[selectedCore].sub.map((sub: string) => (
                                <button
                                key={sub}
                                onClick={() => handleSubSelect(sub)}
                                role="radio"
                                aria-checked={selectedSub === sub}
                                className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border outline-none focus-visible:ring-2 focus-visible:ring-current ${
                                    selectedSub === sub 
                                    ? 'bg-current text-[var(--bg-primary)] border-transparent' 
                                    : 'border-current border-opacity-5 opacity-40 hover:opacity-100 focus:opacity-100'
                                }`}
                                >
                                {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence>
                        {selectedSub && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex flex-col items-center gap-4"
                                role="radiogroup"
                                aria-label={`Nuance for ${selectedSub}`}
                                ref={preciseContainerRef}
                            >
                                <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font" aria-hidden="true">Define Nuance</span>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {EMOTIONS[selectedCore].precise[selectedSub].map((precise: string) => (
                                        <button
                                        key={precise}
                                        onClick={() => handlePreciseSelect(precise)}
                                        role="radio"
                                        aria-checked={selectedPrecise === precise}
                                        className="px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border border-current border-opacity-10 opacity-40 hover:opacity-100 focus:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-current"
                                        >
                                        {precise}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {selectedPrecise && (
                <motion.div 
                    key="summary"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-10 rounded-[3rem] bg-current/2 border border-current border-opacity-5 relative overflow-hidden flex flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-current"
                    tabIndex={-1}
                    ref={summaryRef}
                    role="region"
                    aria-label="Emotional Resonance Summary"
                >
                    <div className="flex flex-col items-center mb-8">
                        <span className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-40 mb-2 heading-font" aria-hidden="true">Final Resonance</span>
                        <h3 className="text-4xl font-light tracking-tight">{selectedPrecise}</h3>
                    </div>
                
                    <div className="w-full h-[1px] bg-current opacity-5 mb-8" aria-hidden="true" />
                    
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-6 block heading-font" aria-hidden="true">Oracle Deep Dive</span>
                    
                    {isSyncing ? (
                        <div className="animate-pulse space-y-4 w-full" aria-busy="true" aria-label="Oracle is reflecting...">
                            <div className="h-4 bg-current opacity-10 rounded-full w-3/4 mx-auto" />
                            <div className="h-4 bg-current opacity-10 rounded-full w-1/2 mx-auto" />
                        </div>
                    ) : (
                        <h2 className="text-2xl font-light italic leading-relaxed text-center min-h-[80px]" aria-live="assertive">
                            {soulPrompt || "Waiting for resonance..."}
                        </h2>
                    )}

                    <div className="mt-12 w-full flex flex-col gap-6">
                        <button 
                            onClick={handleBroadcast}
                            disabled={broadcastActive}
                            className={`w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl heading-font transition-all active:scale-95 outline-none focus-visible:ring-offset-4 focus-visible:ring-2 focus-visible:ring-current ${broadcastActive ? 'animate-pulse opacity-50' : ''}`}
                            aria-label={broadcastActive ? 'Broadcasting now...' : `Broadcast resonance to ${userData?.partnerName}`}
                        >
                            {broadcastActive ? 'Resonating...' : `Broadcast to ${userData?.partnerName}`}
                        </button>
                        <button 
                            onClick={() => { setSelectedPrecise(null); setSoulPrompt(null); }}
                            className="text-[9px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity outline-none"
                        >
                            Refine Emotion
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

      {/* Broadcast Overlay Effect */}
      <AnimatePresence>
        {broadcastActive && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex items-center justify-center pointer-events-none"
                role="alert"
                aria-label="Broadcast complete"
            >
                <motion.div 
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 5, opacity: 0 }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="w-96 h-96 rounded-full"
                    style={{ backgroundColor: selectedCore ? EMOTIONS[selectedCore].color : 'var(--accent-green)' }}
                />
                <h2 className="absolute text-clamp-5xl font-light italic animate-fade-in">{selectedPrecise} Broadcast</h2>
            </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-20 text-center opacity-20 pb-20" aria-hidden="true">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] heading-font">Kindred Architecture</p>
      </footer>
    </div>
  );
};

export default EmotionWheel;