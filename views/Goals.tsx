
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { useGoals } from '../hooks/useGoals';
import { motion, AnimatePresence } from 'framer-motion';
import * as schemas from '../lib/schemas';

const Goals: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const { goals, isAdding, loading, isPivoting, addGoal, toggleStep, pivotGoal, filteredSuggestions } = useGoals(userData);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = schemas.GoalTitleSchema.safeParse(newTitle);
    if (!valid.success) { setError(valid.error.issues[0].message); return; }
    setError(null);
    await addGoal(newTitle);
    setNewTitle('');
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto text-[var(--text-primary)]">
      <header className="mb-16">
          <h1 className="text-clamp-6xl font-light mb-2">Intent.</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Architectural Shared Horizons</p>
      </header>

      <form onSubmit={handleAdd} className="mb-16 flex flex-col gap-4">
        <div className="flex gap-4">
          <input 
              type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} 
              placeholder="Blueprint intention..." disabled={isAdding}
              className="flex-grow bg-transparent border-b border-current opacity-60 focus:opacity-100 outline-none text-2xl p-4 transition-all" 
          />
          <button type="submit" disabled={isAdding || !newTitle.trim()} className="px-10 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-widest rounded-full h-16 shadow-lg">
              {isAdding ? '...' : 'Blueprint'}
          </button>
        </div>
        {error && <p className="text-[10px] text-[var(--accent-pink)] font-bold uppercase tracking-widest">{error}</p>}
      </form>

      <div className="space-y-32">
        {loading ? Array(2).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse space-y-6">
            <div className="flex justify-between items-start">
              <div className="h-12 bg-current opacity-10 rounded-full w-3/4" />
              <div className="h-4 bg-current opacity-5 rounded-full w-10" />
            </div>
            <div className="h-2 bg-current opacity-5 rounded-full w-full" />
            <div className="space-y-3">
              <div className="h-4 bg-current opacity-5 rounded-full w-full" />
              <div className="h-4 bg-current opacity-5 rounded-full w-5/6" />
              <div className="h-4 bg-current opacity-5 rounded-full w-4/5" />
            </div>
          </div>
        )) : goals.map(g => (
          <div key={g.id} className="animate-fade-in-up">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-clamp-4xl font-light leading-tight">{g.title}</h3>
              <span className="text-sm font-bold tracking-[0.2em] opacity-100 heading-font">{g.progress}%</span>
            </div>
            <div className="w-full h-1 bg-current opacity-10 mb-8 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-green)] transition-all duration-1000" style={{width: `${g.progress}%`}} />
            </div>
            {g.microSteps?.map(step => (
              <button key={step.id} onClick={() => toggleStep(g, step.id)} className="w-full flex items-center gap-5 text-left mb-4">
                  <div className={`w-4 h-4 rounded-sm border border-current transition-all ${step.completed ? 'bg-[#3D8C50]' : ''}`} />
                  <span className={`text-sm font-mono ${step.completed ? 'opacity-40 line-through' : ''}`}>{step.text}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;
