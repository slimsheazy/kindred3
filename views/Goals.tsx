
import React, { useState, useEffect, useRef } from 'react';
import { Goal, MicroStep } from '../types';
import { cloudService } from '../services/cloudService';
import { generateGoalMicroSteps, getGoalEncouragement } from '../services/geminiService';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const encouragementTimeoutRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getGoals(user.partnerCode || 'default').then(setGoals);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !userData || isAdding) return;
    
    setIsAdding(true);
    const goal: Goal = { 
        id: Date.now().toString(), 
        title: newTitle, 
        type: 'Couple', 
        progress: 0, 
        lastUpdated: Date.now(),
        encouragement: "Generating your shared horizon..."
    };
    
    // Optimistic UI
    setGoals(prev => [goal, ...prev]);
    setNewTitle('');

    // AI Enrichment
    try {
        const [steps, enc] = await Promise.all([
            generateGoalMicroSteps(goal.title),
            getGoalEncouragement(goal.title, 0)
        ]);
        const enrichedGoal = { ...goal, microSteps: steps, encouragement: enc };
        await cloudService.saveGoal(userData.partnerCode || 'default', enrichedGoal);
        setGoals(prev => prev.map(g => g.id === goal.id ? enrichedGoal : g));
    } catch (err) {
        console.error("Goal enrichment failed", err);
    } finally {
        setIsAdding(false);
    }
  };

  const updateProgress = async (goal: Goal, newProgress: number) => {
    const updated = { ...goal, progress: newProgress, lastUpdated: Date.now() };
    setGoals(prev => prev.map(item => item.id === goal.id ? updated : item));
    
    // Save locally
    await cloudService.saveGoal(userData?.partnerCode || 'default', updated);

    // Debounce AI encouragement
    if (encouragementTimeoutRef.current[goal.id]) clearTimeout(encouragementTimeoutRef.current[goal.id]);
    encouragementTimeoutRef.current[goal.id] = setTimeout(async () => {
        const enc = await getGoalEncouragement(goal.title, newProgress);
        const latestGoal = { ...updated, encouragement: enc };
        setGoals(prev => prev.map(item => item.id === goal.id ? latestGoal : item));
        await cloudService.saveGoal(userData?.partnerCode || 'default', latestGoal);
    }, 2000);
  };

  const toggleMicroStep = async (goal: Goal, stepId: string) => {
    const updatedSteps = (goal.microSteps || []).map(s => 
        s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const newProgress = Math.round((completedCount / updatedSteps.length) * 100);
    
    const updatedGoal = { ...goal, microSteps: updatedSteps, progress: newProgress };
    setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g));
    await cloudService.saveGoal(userData?.partnerCode || 'default', updatedGoal);
  };

  const GhostBlueprint = () => (
    <div className="border border-dashed border-white/10 rounded-[2.5rem] p-10 opacity-[0.08] animate-pulse">
        <span className="text-xs font-bold uppercase tracking-[0.4em] mb-4 block">Unmapped Horizon</span>
        <div className="h-12 w-2/3 bg-white/10 rounded-full mb-10" />
        <div className="w-full h-[1.5px] bg-white/20 mb-6" />
        <div className="flex gap-3">
            <div className="w-5 h-5 rounded-sm border border-white/20" />
            <div className="h-4 w-1/3 bg-white/10 rounded-full" />
        </div>
    </div>
  );

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
      <header className="mb-16">
          <h1 className="text-clamp-6xl font-light mb-2 text-[#FDFCF0]">Intent.</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDFCF0]/40 heading-font">Architectural Shared Horizons</p>
      </header>

      <form onSubmit={handleAdd} className="mb-24 flex gap-4">
        <input 
            type="text" 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)} 
            placeholder="Blueprint a new intention..." 
            disabled={isAdding}
            className="flex-grow bg-transparent border-b border-white/10 focus:border-[#A8FFB5] outline-none text-2xl p-4 transition-all text-[#FDFCF0] placeholder-[#FDFCF0]/25 font-light italic" 
        />
        <button 
            type="submit" 
            disabled={isAdding || !newTitle.trim()}
            className="px-10 border border-white/20 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white/10 hover:text-white transition-all text-[#FDFCF0]/70 h-16 heading-font disabled:opacity-10 shadow-sm"
        >
            {isAdding ? 'Scribing...' : 'Blueprint'}
        </button>
      </form>

      <div className="space-y-24">
        {goals.map(g => (
          <div key={g.id} className="animate-fade-in-up group">
            <div className="flex justify-between items-start mb-8">
              <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block heading-font">Project Horizon</span>
                  <h3 className="text-clamp-4xl font-light text-[#FDFCF0] leading-tight group-hover:pl-2 transition-all duration-500">{g.title}</h3>
              </div>
              <span className="text-sm font-bold tracking-[0.2em] text-[#FDFCF0]/90 heading-font pt-2">{g.progress}%</span>
            </div>

            {/* Architectural Progress Visual */}
            <div className="w-full h-2 bg-white/5 relative mb-12 overflow-hidden rounded-full">
                <div 
                    className="absolute left-0 top-0 h-full bg-[#A8FFB5] transition-all duration-[2000ms] ease-out shadow-[0_0_12px_rgba(168,255,181,0.25)]" 
                    style={{width: `${g.progress}%`}}
                >
                    <div className="w-full h-full animate-pulse opacity-30 bg-white" />
                </div>
            </div>

            {/* Micro-steps Specs */}
            {g.microSteps && g.microSteps.length > 0 && (
                <div className="mb-12 space-y-4 pl-4 border-l border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 block heading-font">Technical Specifications</span>
                    {g.microSteps.map(step => (
                        <button 
                            key={step.id}
                            onClick={() => toggleMicroStep(g, step.id)}
                            className="w-full flex items-center gap-5 text-left group/step"
                        >
                            <div className={`w-4 h-4 rounded-sm border border-white/20 transition-all ${step.completed ? 'bg-[#A8FFB5] border-[#A8FFB5]' : 'group-hover/step:border-white/40'}`} />
                            <span className={`text-sm font-mono tracking-tight transition-all ${step.completed ? 'text-white/20 line-through' : 'text-white/80'}`}>
                                {step.text}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* AI Encouragement */}
            {g.encouragement && (
                <div className="bg-white/2 p-8 rounded-[2.5rem] border border-white/5 animate-fade-in backdrop-blur-sm shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block heading-font">Kindred Oracle Insight</span>
                    <p className="text-base italic font-light text-white/70 leading-relaxed">"{g.encouragement}"</p>
                </div>
            )}

            {/* Slider for manual adjustment */}
            <div className="mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <input 
                    type="range" 
                    value={g.progress} 
                    min="0" 
                    max="100" 
                    onChange={(e) => updateProgress(g, parseInt(e.target.value))} 
                    className="w-full h-1 bg-transparent cursor-pointer appearance-none [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A8FFB5]" 
                />
            </div>
          </div>
        ))}
        {goals.length === 0 && !isAdding && (
            <div className="space-y-16">
                <GhostBlueprint />
                <GhostBlueprint />
                <div className="text-center opacity-20 py-14">
                    <p className="text-sm font-bold uppercase tracking-[0.5em]">Future Architectures Await</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Goals;
