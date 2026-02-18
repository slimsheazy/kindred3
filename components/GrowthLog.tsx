
// Fix: Import React to resolve 'Cannot find namespace React' error when using React.FC
import React, { useState, useEffect } from 'react';
import { GrowthLog as GrowthLogType } from '../types';
import { cloudService } from '../services/cloudService';
import { motion as motionBase, AnimatePresence } from 'framer-motion';

// Fix: Cast motion to any to resolve environment-specific type errors with motion component props
const motion = motionBase as any;

interface GrowthLogProps {
  partnerCode: string;
}

const GrowthLog: React.FC<GrowthLogProps> = ({ partnerCode }) => {
  const [logs, setLogs] = useState<GrowthLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await cloudService.getGrowthLogs(partnerCode);
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [partnerCode]);

  if (loading && logs.length === 0) return (
    <div className="py-12 animate-pulse space-y-6">
      <div className="h-4 bg-current opacity-10 w-24 rounded-full mx-2" />
      <div className="h-24 bg-current opacity-5 rounded-[2rem]" />
      <div className="h-24 bg-current opacity-5 rounded-[2rem]" />
    </div>
  );

  if (logs.length === 0) return null;

  const displayLogs = isExpanded ? logs : logs.slice(0, 3);

  return (
    <div className="py-12 animate-fade-in-up text-[var(--text-primary)]">
      <div className="flex justify-between items-center mb-8 px-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-30 heading-font">Recent Shifts</h3>
        {logs.length > 3 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-colors">
                {isExpanded ? 'Show Less' : `View All (${logs.length})`}
            </button>
        )}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {displayLogs.map((log) => (
            <motion.div key={log.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 bg-white/2 border border-white/5 rounded-[2rem] flex flex-col gap-3 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className={`text-2xl font-bold ${log.delta > 0 ? 'text-[#A8FFB5]' : 'text-[#FF85B3]'}`}>
                      {log.delta > 0 ? '+' : ''}{log.delta.toFixed(1)}
                  </span>
              </div>
              <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#A8FFB5] heading-font">{log.category}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-20 heading-font">
                      {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
              </div>
              <p className="text-base font-light italic opacity-80 leading-relaxed pr-10">"Kindred observed a shift in {log.category} ({log.delta > 0 ? '+' : ''}{log.delta.toFixed(1)}) {log.context}"</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GrowthLog;
