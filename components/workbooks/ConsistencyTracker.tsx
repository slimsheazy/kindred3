
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../../services/sensoryService';
import { cloudService } from '../../services/cloudService';

interface PromiseLog {
  day: string;
  promise: string;
  kept: boolean | null;
  notes: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ConsistencyTracker: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<PromiseLog[]>(
    DAYS.map(day => ({ day, promise: '', kept: null, notes: '' }))
  );
  const [impactStatement, setImpactStatement] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const stats = useMemo(() => {
    const totalWithStatus = logs.filter(l => l.kept !== null).length;
    const keptCount = logs.filter(l => l.kept === true).length;
    const score = totalWithStatus > 0 ? Math.round((keptCount / totalWithStatus) * 100) : 0;
    return { totalWithStatus, score };
  }, [logs]);

  const updateLog = (index: number, updates: Partial<PromiseLog>) => {
    const next = [...logs];
    next[index] = { ...next[index], ...updates };
    setLogs(next);
  };

  const handleToggle = (index: number, status: boolean) => {
    sensoryService.tap();
    updateLog(index, { kept: logs[index].kept === status ? null : status });
  };

  const finalizeTracker = async () => {
    sensoryService.success();
    setIsFinalizing(true);
    const savedData = localStorage.getItem('kindred_user_data');
    if (savedData) {
      const userData = JSON.parse(savedData);
      const partnerCode = userData.partnerCode || userData.id;
      
      await cloudService.saveQuizAnswer(partnerCode, userData.id, 'Consistency Tracker', {
        logs,
        trustScore: stats.score,
        impactStatement,
        timestamp: Date.now()
      });

      // Update global trust score based on this week's performance
      // A high score boosts trust, a low score shows work is needed
      const delta = (stats.score - 50) / 100; // E.g., 80% score adds +0.3, 20% score subtracts -0.3
      await cloudService.updateBondScore(partnerCode, 'Trust', delta);
    }
    onComplete();
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="mb-12">
        <h2 className="text-clamp-4xl font-light mb-2">Integrity Log.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 heading-font">Weekly Promise Architecture</p>
      </header>

      <div className="space-y-8">
        {logs.map((log, i) => (
          <div key={log.day} className="p-8 bg-current/2 border border-current border-opacity-5 rounded-[2.5rem] space-y-6 transition-all group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold tracking-widest opacity-30 heading-font">{log.day}</span>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleToggle(i, true)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm transition-all ${log.kept === true ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] border-transparent' : 'border-current border-opacity-10 opacity-30 hover:opacity-100'}`}
                >
                  ✓
                </button>
                <button 
                  onClick={() => handleToggle(i, false)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm transition-all ${log.kept === false ? 'bg-[var(--accent-pink)] text-[var(--bg-primary)] border-transparent' : 'border-current border-opacity-10 opacity-30 hover:opacity-100'}`}
                >
                  ✗
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                type="text"
                placeholder="The promise (e.g., 'Handle the laundry')"
                value={log.promise}
                onChange={(e) => updateLog(i, { promise: e.target.value })}
                className="w-full bg-transparent border-b border-current border-opacity-10 focus:border-opacity-40 outline-none text-lg font-light italic py-2 placeholder-current placeholder-opacity-20"
              />
              <input 
                type="text"
                placeholder="Notes..."
                value={log.notes}
                onChange={(e) => updateLog(i, { notes: e.target.value })}
                className="w-full bg-transparent text-sm opacity-60 outline-none placeholder-current placeholder-opacity-20"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-10 bg-current/5 border-y border-current border-opacity-10 flex flex-col items-center text-center space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-2 block heading-font">Weekly Trust Score</span>
          <div className="text-6xl font-light tracking-tighter">
            {stats.score}%
          </div>
        </div>
        <p className="text-xs italic opacity-40 max-w-[250px]">
          Based on {stats.totalWithStatus} tracked promises this week.
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 heading-font ml-4">Impact Statement</label>
        <textarea 
          placeholder="When promises are kept, I feel..."
          value={impactStatement}
          onChange={(e) => setImpactStatement(e.target.value)}
          className="w-full h-40 bg-current/2 border-b border-current border-opacity-10 focus:border-opacity-40 outline-none rounded-t-[2.5rem] p-8 text-xl font-light italic leading-relaxed"
        />
      </div>

      <button 
        onClick={finalizeTracker}
        disabled={isFinalizing || stats.totalWithStatus === 0}
        className="w-full py-7 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-xl transition-all active:scale-95 disabled:opacity-20 heading-font"
      >
        {isFinalizing ? 'Archiving...' : 'Seal Weekly Log'}
      </button>
    </div>
  );
};

export default ConsistencyTracker;
