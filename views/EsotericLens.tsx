import React, { useState, useRef, useEffect } from 'react';
import { interpretSynchronicity, tagJournalEntry } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { JournalEntry, UserData } from '../types';
import Markdown from 'react-markdown';

const EsotericLens: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      setUserData(JSON.parse(saved));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setInterpretation(null);
        setArchiveSuccess(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInterpret = async () => {
    if (!image) return;
    setIsLoading(true);
    setArchiveSuccess(false);
    try {
      const base64Data = image.split(',')[1];
      const result = await interpretSynchronicity(base64Data);
      setInterpretation(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!interpretation || !image || !userData || isArchiving) return;
    setIsArchiving(true);
    try {
      const partnerCode = userData.partnerCode || userData.id;
      const tags = await tagJournalEntry(interpretation);
      
      const entry: JournalEntry = {
        id: `lens-${Date.now()}`,
        authorId: userData.id,
        author: userData.userName,
        authorImage: '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        text: `[Oracle Vision]: ${interpretation}`,
        image: image,
        themeTags: [...tags, 'Lens']
      };

      await cloudService.saveJournalEntry(partnerCode, entry);
      setArchiveSuccess(true);
    } catch (error) {
      console.error("Failed to archive lens vision:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const reset = () => {
    setImage(null);
    setInterpretation(null);
    setArchiveSuccess(false);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-current">
      <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2 text-[var(--text-primary)]">Lens.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font text-[var(--text-primary)]">Kindred Oracle Vision</p>
      </header>

      {!image ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-current/10 rounded-[3rem] space-y-8">
          <p className="text-xl italic font-light opacity-60 text-center px-10 text-[var(--text-primary)]">Capture a fragment of your shared world to find its hidden resonance.</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-12 py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-[0.3em] shadow-xl active:scale-95 transition-all heading-font"
          >
            Capture Light
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      ) : (
        <div className="space-y-12 animate-fade-in">
          <div className="relative group overflow-hidden rounded-[3rem] border border-current/10 shadow-2xl">
            <img src={image} alt="Captured light" className="w-full h-auto object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000" />
            {isLoading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center z-20">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-white animate-pulse">Consulting the Oracle</span>
              </div>
            )}
          </div>

          {!interpretation && !isLoading && (
            <button 
              onClick={handleInterpret}
              className="w-full py-6 border border-current/20 rounded-full font-bold uppercase text-xs tracking-[0.4em] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all heading-font"
            >
              Seek Interpretation
            </button>
          )}

          {interpretation && (
            <div className="space-y-8">
              <div className="p-10 bg-current/2 border border-current/5 rounded-[3rem] animate-fade-in-up">
                <span className="text-xs font-bold uppercase tracking-widest opacity-30 mb-6 block heading-font text-[var(--text-primary)]">Oracle Synthesis</span>
                <div className="prose prose-stone dark:prose-invert prose-xl italic font-light leading-relaxed text-[var(--text-primary)]">
                  <Markdown>{interpretation}</Markdown>
                </div>
                
                <div className="mt-12 flex flex-col gap-6">
                  {archiveSuccess ? (
                    <div className="text-center py-4 bg-[var(--accent-green)] bg-opacity-10 rounded-full border border-[var(--accent-green)] border-opacity-20 animate-fade-in">
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-green)] heading-font">Archived to Echoes</span>
                    </div>
                  ) : (
                    <button 
                      onClick={handleArchive}
                      disabled={isArchiving}
                      className="w-full py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all heading-font disabled:opacity-50"
                    >
                      {isArchiving ? 'Archiving...' : 'Archive to Echoes'}
                    </button>
                  )}
                  
                  <button 
                    onClick={reset}
                    className="text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity border-b border-current pb-1 self-center text-[var(--text-primary)]"
                  >
                    Clear Vision
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EsotericLens;