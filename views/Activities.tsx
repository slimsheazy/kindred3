
import React, { useState, useEffect, useMemo } from 'react';
import { generateActivities, tagJournalEntry } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import type { Activity, JournalEntry, GrowthLog } from '../types';

const ActivitiesView: React.FC = () => {
  const [activeVibe, setActiveVibe] = useState('Deep');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [engagedActivity, setEngagedActivity] = useState<Activity | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const vibes = ['Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  useEffect(() => {
    const savedUser = localStorage.getItem('kindred_user_data');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setUserData(user);
        const partnerCode = user.partnerCode || user.id;
        cloudService.getActiveActivity(partnerCode).then(setEngagedActivity);
    }
    setLoading(true);
    generateActivities(activeVibe).then(data => { setActivities(data); setLoading(false); });
  }, [activeVibe]);

  const handleEngage = async (activity: Activity) => {
    if (!userData) return;
    const partnerCode = userData.partnerCode || userData.id;
    const startedActivity = { ...activity, startTime: Date.now(), startedBy: userData.id };
    await cloudService.setActiveActivity(partnerCode, startedActivity);
    setEngagedActivity(startedActivity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEngage = async () => {
    if (window.confirm("Abandon this shared intent?") && userData) {
        const partnerCode = userData.partnerCode || userData.id;
        await cloudService.setActiveActivity(partnerCode, null);
        setEngagedActivity(null);
        setReflectionText('');
    }
  };

  const finalizeActivity = async () => {
    if (!engagedActivity || !userData || isFinalizing) return;
    setIsFinalizing(true);
    try {
        const partnerCode = userData.partnerCode || userData.id;
        const tags = await tagJournalEntry(reflectionText || engagedActivity.title);
        const entry: JournalEntry = {
            id: `act-${Date.now()}`,
            authorId: userData.id,
            author: userData.userName,
            authorImage: '',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timestamp: Date.now(),
            text: `[Intent: ${engagedActivity.title}] ${reflectionText || "We unified in this space."}`,
            themeTags: [...tags, engagedActivity.category]
        };
        await cloudService.saveJournalEntry(partnerCode, entry);
        const targetCategory = ({ 'Deep': 'Intimacy', 'Playful': 'Communication', 'Adventurous': 'Shared Vision', 'Romantic': 'Intimacy', 'Relaxing': 'Trust' }[engagedActivity.category]) || 'Communication';
        const delta = 0.4;
        await cloudService.updateBondScore(partnerCode, targetCategory, delta);
        await cloudService.saveGrowthLog(partnerCode, { id: `growth-${Date.now()}`, timestamp: Date.now(), category: targetCategory, delta, context: `following your shared intentional act: "${engagedActivity.title}"` });
        await cloudService.setActiveActivity(partnerCode, null);
        setEngagedActivity(null);
        setReflectionText('');
        alert("Memory archived and bond strengthened.");
    } catch (err) { console.error(err); } finally { setIsFinalizing(false); }
  };

  if (engagedActivity) {
      return (
          <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in bg-[#FDFCF0] min-h-screen text-[#121212]">
              <header className="mb-16">
                    <span className="text-xs font-bold uppercase tracking-[0.4em] text-[#3D8C50] mb-2 block heading-font">Live Shared Session</span>
                    <h1 className="text-clamp-5xl font-light mb-6 leading-tight">{engagedActivity.title}</h1>
                    <div className="flex gap-6 items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-black/50 heading-font">{engagedActivity.duration}</span>
                        <div className="w-1.5 h-1.5 bg-black/20 rounded-full" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#3D8C50] heading-font animate-pulse">Session Active</span>
                    </div>
              </header>
              <div className="bg-black/5 border border-black/10 rounded-[3rem] p-12 mb-16 shadow-sm backdrop-blur-md">
                  <p className="text-3xl font-light text-[#121212] leading-relaxed italic mb-12">"{engagedActivity.description}"</p>
                  <div className="space-y-10">
                      <div className="space-y-6">
                          <label className="text-xs font-bold uppercase tracking-widest text-black/40 px-2">Shared Discovery</label>
                          <textarea value={reflectionText} onChange={(e) => setReflectionText(e.target.value)} placeholder="Seal this memory together..." className="w-full bg-transparent border-b border-black/10 focus:border-[#3D8C50] outline-none text-2xl font-light italic p-4 h-40 resize-none transition-all placeholder-black/20" />
                      </div>
                      <div className="flex flex-col gap-6">
                        <button onClick={finalizeActivity} disabled={isFinalizing} className="w-full py-7 bg-black text-white rounded-full text-xs font-bold uppercase tracking-[0.3em] heading-font shadow-2xl disabled:opacity-30">{isFinalizing ? 'Archiving...' : 'Internalize Memory'}</button>
                        <button onClick={cancelEngage} className="text-xs font-bold uppercase tracking-widest text-black/30 hover:text-black transition-all py-4">Dissolve Shared Intent</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
       <header className="mb-16">
            <h1 className="text-clamp-6xl font-light mb-2 text-[#121212]">Actions.</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#121212]/40 heading-font">Unified Shared Time</p>
      </header>
      <div className="flex gap-10 overflow-x-auto no-scrollbar mb-16 pb-6 border-b border-black/5">
          {vibes.map(vibe => <button key={vibe} onClick={() => setActiveVibe(vibe)} className={`text-xs font-bold uppercase tracking-widest heading-font transition-all whitespace-nowrap ${activeVibe === vibe ? 'text-[#121212]' : 'text-[#121212]/40'}`}>{vibe}</button>)}
      </div>
      <div className="space-y-20">
        {activities.map((a, i) => (
          <div key={i} className="animate-fade-in-up group">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-4xl font-light max-w-[80%] text-[#121212] leading-snug">{a.title}</h3>
                <span className="text-xs font-bold uppercase tracking-widest text-black/30 pt-3">{a.duration}</span>
            </div>
            <p className="text-[#121212]/70 text-xl leading-relaxed mb-8 font-light italic">{a.description}</p>
            <button onClick={() => handleEngage(a)} className="text-xs font-bold uppercase tracking-widest border border-black/20 px-10 py-4 rounded-full hover:bg-black hover:text-white transition-all heading-font">Initiate Space</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesView;
