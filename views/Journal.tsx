
import React, { useState, useEffect, useRef } from 'react';
import { UserData } from '../types';
import { useJournal } from '../hooks/useJournal';
import Markdown from 'markdown-to-jsx';
import * as schemas from '../lib/schemas';

const Journal: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const { entries, isArchiving, loading, addEntry } = useJournal(userData);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = schemas.JournalTextSchema.safeParse(newText);
    if (!valid.success) { setError(valid.error.issues[0].message); return; }
    setError(null);
    await addEntry(newText);
    setNewText('');
    setIsAddingMode(false);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto min-h-screen pb-40 text-[var(--text-primary)]">
      <header className="mb-12 flex justify-between items-end">
          <h1 className="text-clamp-6xl font-light mb-2">Archive.</h1>
          <button onClick={() => setIsAddingMode(!isAddingMode)} className="w-14 h-14 rounded-full border border-current flex items-center justify-center text-3xl">+</button>
      </header>

      {isAddingMode && (
        <form onSubmit={handleAdd} className="bg-current bg-opacity-5 p-10 rounded-[3rem] mb-12 border border-current border-opacity-20">
          <textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Etch a memory..." className="w-full bg-transparent border-b border-current outline-none text-2xl font-light italic p-4 h-40" />
          {error && <p className="mt-4 text-[10px] text-[var(--accent-pink)] font-bold uppercase tracking-widest">{error}</p>}
          <button type="submit" disabled={isArchiving || !newText.trim()} className="mt-8 px-10 py-5 text-xs font-bold uppercase bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full">
              {isArchiving ? '...' : 'Archive Memory'}
          </button>
        </form>
      )}

      <div className="space-y-24 mt-12">
        {loading ? Array(3).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse space-y-4">
            <div className="h-4 bg-current opacity-10 rounded-full w-20" />
            <div className="h-10 bg-current opacity-10 rounded-full w-full" />
            <div className="h-10 bg-current opacity-10 rounded-full w-4/5" />
          </div>
        )) : entries.map((e) => (
          <article key={e.id} className="animate-fade-in">
            <span className="text-xs font-bold uppercase tracking-widest block mb-1.5 opacity-60">{e.author}</span>
            <p className="text-4xl leading-relaxed font-light">{e.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Journal;
