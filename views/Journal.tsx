
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { JournalEntry, GrowthLog, FoundationSummary } from '../types';
import { cloudService } from '../services/cloudService';
import { analyzeInteractionForScores, generateJournalEchoes, tagJournalEntry, interpretSynchronicity, updateFoundationSummary } from '../services/geminiService';

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newText, setNewText] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [echoSynthesis, setEchoSynthesis] = useState<{ synthesis: string, themes: string[] } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMode, setIsAddingMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getJournalEntries(user.partnerCode || 'default').then(data => {
          setEntries(data);
          if (data.length >= 3) {
            triggerSynthesis(data);
          }
      });
    }
  }, []);

  const triggerSynthesis = async (history: JournalEntry[]) => {
    setIsSynthesizing(true);
    const echoes = await generateJournalEchoes(history.slice(0, 10));
    setEchoSynthesis(echoes);
    setIsSynthesizing(false);
  };

  const handleAdd = async (e: React.FormEvent, customText?: string, imageBase64?: string) => {
    if (e) e.preventDefault();
    const textToArchive = customText || newText;
    if (!textToArchive.trim() || !userData || isArchiving) return;
    
    setIsArchiving(true);
    const partnerCode = userData.partnerCode || 'default';
    const tags = await tagJournalEntry(textToArchive);
    
    const entry: JournalEntry = { 
        id: Date.now().toString(), 
        authorId: userData.id, 
        author: userData.userName, 
        authorImage: '', 
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
        timestamp: Date.now(), 
        text: textToArchive,
        themeTags: tags,
        image: imageBase64
    };
    
    const updatedEntries = [entry, ...entries];
    setEntries(updatedEntries);
    await cloudService.saveJournalEntry(partnerCode, entry);
    
    if (updatedEntries.length > 0 && updatedEntries.length % 10 === 0) {
        try {
            const currentFoundation = await cloudService.getLatestFoundationSummary(partnerCode);
            const newFoundationContent = await updateFoundationSummary(updatedEntries.slice(0, 10), currentFoundation?.content);
            const newFoundation: FoundationSummary = {
                content: newFoundationContent,
                timestamp: Date.now(),
                entryCountAtSummary: updatedEntries.length
            };
            await cloudService.saveFoundationSummary(partnerCode, newFoundation);
        } catch (fErr) {
            console.error("Failed to update foundation", fErr);
        }
    }
    
    try {
      const updates = await analyzeInteractionForScores(textToArchive);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, updates);
          for (const update of updates) {
              const log: GrowthLog = {
                  id: `growth-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  category: update.category,
                  delta: update.delta,
                  context: `following your deep reflection on "${textToArchive.slice(0, 30)}..."`
              };
              await cloudService.saveGrowthLog(partnerCode, log);
          }
      }
    } catch (err) {
      console.warn("Analysis failed", err);
    }
    
    setNewText('');
    setIsArchiving(false);
    setIsAddingMode(false);
    if (updatedEntries.length % 3 === 0) triggerSynthesis(updatedEntries);
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData) return;
    setIsAnalyzingImage(true);
    setIsAddingMode(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const metaphor = await interpretSynchronicity(base64String);
        await handleAdd(null as any, metaphor, `data:${file.type};base64,${base64String}`);
        setIsAnalyzingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image analysis failed", err);
      setIsAnalyzingImage(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const lowerQuery = searchQuery.toLowerCase();
    return entries.filter(e => 
      e.text.toLowerCase().includes(lowerQuery) || 
      e.author.toLowerCase().includes(lowerQuery) ||
      (e.themeTags && (e.themeTags as string[]).some(t => t.toLowerCase().includes(lowerQuery)))
    );
  }, [entries, searchQuery]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const temporalResonance = useMemo(() => {
      if (entries.length < 2) return null;
      const today = new Date();
      return entries.find(e => {
          const entryDate = new Date(e.timestamp);
          return entryDate.getDate() === today.getDate() && 
                 entryDate.getMonth() === today.getMonth() && 
                 entryDate.getFullYear() !== today.getFullYear();
      });
  }, [entries]);

  const GhostEntry: React.FC<{ text: string, delay: string }> = ({ text, delay }) => (
    <div className={`opacity-[0.03] animate-pulse relative py-12 border-b border-black/10 ${delay}`}>
        <div className="absolute left-[-50px] top-4 w-4 h-4 rounded-full border border-black/20" />
        <span className="text-xs font-bold uppercase tracking-[0.3em] mb-4 block heading-font">A Future Memory Awaits</span>
        <p className="text-3xl font-light italic text-[#121212]/50 leading-relaxed">{text}</p>
    </div>
  );

  return (
    <div className="px-6 py-12 max-w-xl mx-auto min-h-screen pb-40">
      <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-clamp-6xl font-light mb-2 text-[#121212]">Archive.</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#121212]/40 heading-font">The Shared Anthology</p>
          </div>
          <div className="flex gap-4">
              <button 
                onClick={handleImageClick}
                disabled={isAnalyzingImage}
                className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center bg-black/5 hover:bg-black/10 text-[#121212] transition-all"
                title="Etch a Metaphor from Photo"
              >
                <span className="text-xl">📷</span>
              </button>
              <button 
                onClick={() => setIsAddingMode(!isAddingMode)}
                className={`w-14 h-14 rounded-full border border-black/10 flex items-center justify-center text-3xl transition-all ${isAddingMode ? 'bg-black text-[#FDFCF0] rotate-45' : 'bg-black/5 hover:bg-black/10 text-[#121212]'}`}
              >
                +
              </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </header>

      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isAddingMode ? 'max-h-[700px] mb-24 opacity-100' : 'max-h-0 opacity-0 mb-0'}`}>
        <form onSubmit={handleAdd} className="bg-black/5 p-10 rounded-[3rem] border border-black/10 shadow-inner">
          {isAnalyzingImage ? (
            <div className="py-16 flex flex-col items-center justify-center animate-pulse">
                <div className="w-14 h-14 border-2 border-[#3D8C50] border-t-transparent rounded-full animate-spin mb-8" />
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-[#3D8C50] heading-font">Oracle is observing...</span>
                <p className="text-base italic text-black/40 mt-3">Etching the metaphor from your light.</p>
            </div>
          ) : (
            <>
              <textarea 
                value={newText} 
                onChange={(e) => setNewText(e.target.value)} 
                placeholder="Etch a memory for your future self..." 
                disabled={isArchiving}
                className="w-full bg-transparent border-b border-black/20 focus:border-[#3D8C50] outline-none text-2xl font-light italic p-4 resize-none transition-all h-40 text-[#121212] placeholder-[#121212]/25"
              />
              <div className="flex justify-between items-center mt-8">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#121212]/20 heading-font">Commit to the shared anthology</span>
                  <button type="submit" disabled={isArchiving || !newText.trim()} className="px-10 py-5 text-xs font-bold uppercase tracking-widest text-white bg-[#3D8C50] rounded-full hover:opacity-90 transition-all disabled:opacity-30 heading-font shadow-lg">
                      {isArchiving ? 'Archiving...' : 'Archive Memory'}
                  </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="mb-16 space-y-8">
        <div className="relative group">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the anthology..."
            className="w-full bg-transparent border-b border-black/10 py-5 outline-none text-lg font-light italic placeholder-black/20 focus:border-[#3D8C50] transition-all"
          />
          <span className="absolute right-4 top-5 text-xs text-black/30 uppercase font-bold heading-font group-focus-within:text-[#3D8C50] transition-colors">Search</span>
        </div>

        {(echoSynthesis || temporalResonance) && !searchQuery && (
            <div className="p-10 bg-black/2 border border-black/5 rounded-[3rem] shadow-sm animate-fade-in relative overflow-hidden group backdrop-blur-md">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#3D8C50]/5 blur-3xl rounded-full group-hover:bg-[#3D8C50]/10 transition-all duration-[3000ms]" />
                <div className="relative z-10">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4 block heading-font">{temporalResonance ? 'Temporal Resonance' : 'Shared Insight'}</span>
                  {temporalResonance ? (
                      <div className="mb-8">
                          <h4 className="text-2xl font-light italic text-black/60 mb-3">"On this day, {new Date(temporalResonance.timestamp).getFullYear()}..."</h4>
                          <p className="text-3xl font-light text-[#121212] leading-relaxed">"{temporalResonance.text.slice(0, 100)}..."</p>
                      </div>
                  ) : (
                      <p className="text-2xl font-light leading-relaxed text-[#121212] mb-8 italic">{isSynthesizing ? "Synthesizing your shared history..." : `"${echoSynthesis?.synthesis}"`}</p>
                  )}
                  {echoSynthesis?.themes && echoSynthesis.themes.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-8 border-t border-black/5">
                          {echoSynthesis.themes.map(t => (
                              <span key={t} className="text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 bg-black/5 text-black/60 rounded-full heading-font">#{t}</span>
                          ))}
                      </div>
                  )}
                </div>
            </div>
        )}
      </div>

      <div className="relative pl-12 border-l border-black/5 ml-4">
        <div className="absolute top-0 left-[-2.5px] bottom-0 w-[5px] bg-gradient-to-b from-black/10 via-black/5 to-transparent rounded-full" />
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="space-y-4">
            <GhostEntry text="A morning light you shared together, captured in ink..." delay="[animation-delay:0s]" />
            <GhostEntry text="A difficult bridge you crossed, now a foundation..." delay="[animation-delay:0.5s]" />
            <GhostEntry text="A future secret yet to be written into the anthology..." delay="[animation-delay:1s]" />
            <div className="text-center py-20 opacity-30 ml-[-3rem]">
                <p className="text-xs font-bold uppercase tracking-[0.5em] heading-font">Anticipating Echoes</p>
            </div>
          </div>
        ) : (
          (Object.entries(groupedEntries) as [string, JournalEntry[]][]).map(([monthYear, monthEntries]) => (
            <div key={monthYear} className="mb-24 relative">
              <div className="absolute left-[-54px] top-1">
                <div className="w-5 h-5 rounded-full bg-[#FDFCF0] border-2 border-[#121212] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3D8C50] animate-pulse" />
                </div>
              </div>
              <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-black/40 mb-14 heading-font translate-y-[-2px] bg-[#FDFCF0] inline-block pr-6">{monthYear}</h2>
              <div className="space-y-24">
                {monthEntries.map((e) => (
                  <div key={e.id} className="animate-fade-in group relative">
                    <div className="absolute left-[-50px] top-2.5 w-4 h-[1px] bg-black/20 group-hover:bg-[#3D8C50] transition-all" />
                    <div className="flex justify-between items-end mb-8">
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold uppercase tracking-widest heading-font mb-1.5 ${e.authorId === userData?.id ? 'text-[#3D8C50]' : 'text-[#D44D85]'}`}>
                              {e.authorId === userData?.id ? 'You' : e.author}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 heading-font">
                              {new Date(e.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    </div>
                    {e.image && (
                        <div className="mb-8 overflow-hidden rounded-[2.5rem] border border-black/5 shadow-2xl">
                            <img src={e.image} alt="Archived memory" className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                    )}
                    <p className="text-4xl leading-relaxed text-[#121212] font-light group-hover:pl-4 transition-all duration-700 ease-out">{e.text}</p>
                    {e.themeTags && e.themeTags.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-6 opacity-0 group-hover:opacity-50 transition-opacity">
                            {(e.themeTags as string[]).map(tag => (
                                <span key={tag} className="text-xs font-bold uppercase tracking-widest border border-black/20 px-3 py-1 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Journal;
