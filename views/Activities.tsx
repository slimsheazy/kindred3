
import React, { useState, useEffect } from 'react';
import { UserData, View } from '../types';
import { useActivities } from '../hooks/useActivities';
import { Button } from '../components/atoms/Button';

interface ActivitiesViewProps {
  onNavigate?: (view: View) => void;
}

const ActivitiesView: React.FC<ActivitiesViewProps> = ({ onNavigate }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const vibes = ['Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const { 
    activities, engagedActivity, loading, error, activeVibe, setActiveVibe, loadActivities, engage, cancelEngage, finalize 
  } = useActivities(userData);

  useEffect(() => {
    loadActivities(activeVibe);
  }, [activeVibe, loadActivities]);

  if (engagedActivity) {
      const isPartner = engagedActivity.startedBy !== userData?.id;
      return (
          <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
              <header className="mb-16">
                    <span className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] mb-2 block heading-font">{isPartner ? `${userData?.partnerName} Initiated Space` : 'Live Shared Session'}</span>
                    <h1 className="text-clamp-5xl font-light mb-6 leading-tight">{engagedActivity.title}</h1>
                    <div className="flex gap-6 items-center">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-40 heading-font">{engagedActivity.duration}</span>
                        <div className="w-1.5 h-1.5 bg-current opacity-20 rounded-full" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-green)] heading-font animate-pulse">Session Active</span>
                    </div>
              </header>
              <div className="bg-current bg-opacity-5 border border-current border-opacity-10 rounded-[3rem] p-12 mb-16 shadow-sm backdrop-blur-md">
                  <p className="text-3xl font-light leading-relaxed italic mb-12">"{engagedActivity.description}"</p>
                  <div className="flex flex-col gap-6">
                    <button onClick={() => finalize()} className="w-full py-7 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full text-xs font-bold uppercase tracking-[0.3em] heading-font shadow-2xl transition-all">Complete Shared Intent</button>
                    <button onClick={() => cancelEngage()} className="text-xs font-bold uppercase opacity-30 hover:opacity-100 transition-all py-4">Dissolve Shared Intent</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="px-6 py-12 max-w-xl mx-auto text-[var(--text-primary)]">
       <header className="mb-16">
            <h1 className="text-clamp-6xl font-light mb-2">Actions.</h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 heading-font">Unified Shared Time</p>
      </header>

      {/* Featured: Salsa Deck & Emotion Wheel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        <button 
          onClick={() => onNavigate?.(View.SalsaDeck)}
          className="w-full relative overflow-hidden rounded-[3rem] p-8 bg-gradient-to-br from-[var(--accent-pink)]/20 to-transparent border border-current border-opacity-5 group transition-all hover:scale-[1.01]"
        >
          <div className="relative z-10 flex flex-col items-start text-left">
            <h2 className="text-3xl font-light mb-2">Salsa Deck.</h2>
            <p className="text-xs italic opacity-60 font-light leading-relaxed mb-6">Conversation cards from zest to flame.</p>
            <span className="text-[10px] font-bold uppercase tracking-widest border-b border-current pb-1 group-hover:opacity-100 opacity-40 transition-opacity">Enter Deck</span>
          </div>
        </button>

        <button 
          onClick={() => onNavigate?.(View.EmotionWheel)}
          className="w-full relative overflow-hidden rounded-[3rem] p-8 bg-gradient-to-br from-[var(--accent-green)]/20 to-transparent border border-current border-opacity-5 group transition-all hover:scale-[1.01]"
        >
          <div className="relative z-10 flex flex-col items-start text-left">
            <h2 className="text-3xl font-light mb-2">Resonance.</h2>
            <p className="text-xs italic opacity-60 font-light leading-relaxed mb-6">Navigate your shared inner architecture.</p>
            <span className="text-[10px] font-bold uppercase tracking-widest border-b border-current pb-1 group-hover:opacity-100 opacity-40 transition-opacity">Seek Resonance</span>
          </div>
        </button>
      </div>
      
      <div className="flex gap-10 overflow-x-auto no-scrollbar mb-16 pb-6 border-b border-current border-opacity-5">
          {vibes.map(v => (
            <button 
              key={v} 
              onClick={() => setActiveVibe(v)} 
              className={`text-xs font-bold uppercase tracking-widest heading-font transition-all whitespace-nowrap ${activeVibe === v ? 'opacity-100' : 'opacity-40'}`}
            >
              {v}
            </button>
          ))}
      </div>

      <div className="space-y-20 min-h-[400px]">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse space-y-4">
              <div className="h-10 bg-current opacity-10 rounded-full w-2/3" />
              <div className="h-12 bg-current opacity-5 rounded-full w-full" />
            </div>
          ))
        ) : error ? (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-xl italic opacity-60 mb-8">The Oracle is momentarily unreachable.</p>
            <Button onClick={() => loadActivities(activeVibe)} variant="outline">Retry Sync</Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-xl italic opacity-60 mb-8">No shared paths found for this vibe.</p>
            <Button onClick={() => loadActivities(activeVibe)} variant="outline">Refresh Suggestions</Button>
          </div>
        ) : (
          activities.map((a, i) => (
            <div key={i} className="animate-fade-in-up group">
              <div className="flex justify-between items-start mb-6">
                  <h3 className="text-4xl font-light max-w-[80%] leading-snug">{a.title}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-30 pt-3">{a.duration}</span>
              </div>
              <p className="opacity-70 text-xl leading-relaxed mb-8 font-light italic">{a.description}</p>
              <button 
                onClick={() => engage(a)} 
                className="text-xs font-bold uppercase tracking-widest border border-current border-opacity-20 px-10 py-4 rounded-full hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all heading-font"
              >
                Initiate Space
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivitiesView;
