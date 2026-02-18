
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { useActivities } from '../hooks/useActivities';

const ActivitiesView: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const vibes = ['Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const { 
    activities, engagedActivity, loading, activeVibe, setActiveVibe, loadActivities, engage, cancelEngage, finalize 
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
                    {/* Fix: Wrap finalize and cancelEngage in arrow functions to avoid passing MouseEvent to mutation */}
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
      <div className="flex gap-10 overflow-x-auto no-scrollbar mb-16 pb-6 border-b border-current border-opacity-5">
          {vibes.map(v => <button key={v} onClick={() => setActiveVibe(v)} className={`text-xs font-bold uppercase tracking-widest heading-font transition-all whitespace-nowrap ${activeVibe === v ? 'opacity-100' : 'opacity-40'}`}>{v}</button>)}
      </div>
      <div className="space-y-20">
        {loading ? Array(3).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 bg-current opacity-10 rounded-full w-2/3" />
              <div className="h-4 bg-current opacity-5 rounded-full w-12" />
            </div>
            <div className="h-6 bg-current opacity-5 rounded-full w-full" />
            <div className="h-6 bg-current opacity-5 rounded-full w-4/5" />
            <div className="h-12 bg-current opacity-5 rounded-full w-40" />
          </div>
        )) : activities.map((a, i) => (
          <div key={i} className="animate-fade-in-up group">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-4xl font-light max-w-[80%] leading-snug">{a.title}</h3>
                <span className="text-xs font-bold uppercase tracking-widest opacity-30 pt-3">{a.duration}</span>
            </div>
            <p className="opacity-70 text-xl leading-relaxed mb-8 font-light italic">{a.description}</p>
            <button onClick={() => engage(a)} className="text-xs font-bold uppercase tracking-widest border border-current border-opacity-20 px-10 py-4 rounded-full hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all heading-font">Initiate Space</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesView;
