import React, { useState, useEffect } from 'react';
import { UserData, Goal } from '../types';
import { useGoals } from '../hooks/useGoals';
import { motion, AnimatePresence } from 'framer-motion';
import * as schemas from '../lib/schemas';
import { sensoryService } from '../services/sensoryService';

const Goals: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const { goals, isAdding, loading, isPivoting, addGoal, toggleStep, pivotGoal } = useGoals(userData);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = schemas.GoalTitleSchema.safeParse(newTitle);
    if (!valid.success) { setError(valid.error.issues[0].message); return; }
    setError(null);
    await addGoal(newTitle);
    setNewTitle('');
  };

  const handlePivot = async (goal: Goal) => {
    sensoryService.tap();
    try {
      await pivotGoal(goal);
    } catch (err) {
      console.error("Pivot failed", err);
    }
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
          <div key={g.id} className={`animate-fade-in-up p-8 rounded-[3rem] transition-all duration-700 ${g.isStagnant ? 'bg-amber-500/5 border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)]' : 'bg-transparent border border-transparent'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-2">
                {g.isStagnant && (
                  <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-amber-500 animate-pulse heading-font">Stagnant Energy Detected</span>
                )}
                <h3 className="text-clamp-4xl font-light leading-tight">{g.title}</h3>
              </div>
              <span className="text-sm font-bold tracking-[0.2em] opacity-100 heading-font">{g.progress}%</span>
            </div>

            <div className="w-full h-1 bg-current opacity-10 mb-8 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${g.isStagnant ? 'bg-amber-500' : 'bg-[var(--accent-green)]'}`} 
                  style={{width: `${g.progress}%`}} 
                />
            </div>

            {g.pivotReason && (
              <div className="mb-8 p-6 bg-current/5 border-l-2 border-[var(--accent-pink)] rounded-r-2xl">
                 <span className="text-[8px] font-bold uppercase tracking-[0.3em] opacity-30 block mb-2 heading-font">Oracle Realignment</span>
                 <p className="text-sm italic font-light opacity-80 leading-relaxed">"{g.pivotReason}"</p>
              </div>
            )}

            <div className="space-y-4 mb-10">
              {g.microSteps?.map(step => (
                <button key={step.id} onClick={() => toggleStep(g, step.id)} className="w-full flex items-center gap-5 text-left group">
                    <div className={`w-5 h-5 rounded-md border border-current transition-all flex items-center justify-center ${step.completed ? 'bg-[var(--accent-green)] border-transparent' : 'bg-transparent opacity-20 group-hover:opacity-40'}`}>
                       {step.completed && <span className="text-[10px] text-[var(--bg-primary)]">✓</span>}
                    </div>
                    <span className={`text-base font-light ${step.completed ? 'opacity-30 line-through' : 'opacity-80'}`}>{step.text}</span>
                </button>
              ))}
            </div>

            {g.isStagnant && (
              <button 
                onClick={() => handlePivot(g)}
                disabled={isPivoting === 'pivoting'}
                className="w-full py-5 bg-amber-500 text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all heading-font disabled:opacity-50"
              >
                {isPivoting === 'pivoting' ? 'Consulting Oracle...' : 'Recalibrate Intention (Pivot)'}
              </button>
            )}
            
            {!g.isStagnant && g.progress < 100 && g.encouragement && (
              <p className="text-[10px] text-center italic opacity-30 mt-6 heading-font">"{g.encouragement}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;