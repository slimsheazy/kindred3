
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sensoryService } from '../services/sensoryService';
import TrustInventory from '../components/workbooks/TrustInventory';
import BetrayalRecovery from '../components/workbooks/BetrayalRecovery';
import ConsistencyTracker from '../components/workbooks/ConsistencyTracker';
import HorsemenAudit from '../components/workbooks/HorsemenAudit';
import SpeakerListenerProtocol from '../components/workbooks/SpeakerListenerProtocol';
import IStatementBuilder from '../components/workbooks/IStatementBuilder';
import DreamsWithinConflict from '../components/workbooks/DreamsWithinConflict';
import RepairLog from '../components/workbooks/RepairLog';
import AngerThermometer from '../components/workbooks/AngerThermometer';

type WorkbookCategory = 'TRUST' | 'COMMUNICATION' | 'CONFLICT';

const Workbook: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<WorkbookCategory>('TRUST');
  const [activeWorksheet, setActiveWorksheet] = useState<string | null>(null);

  const categories = [
    { id: 'TRUST', label: 'Trust Building' },
    { id: 'COMMUNICATION', label: 'Communication Mastery' },
    { id: 'CONFLICT', label: 'Healthy Conflict' },
  ];

  const worksheets: Record<WorkbookCategory, any[]> = {
    TRUST: [
      { id: 'inventory', title: 'Trust Inventory', subtitle: '12-Factor Assessment', component: TrustInventory },
      { id: 'recovery', title: 'Betrayal Recovery Map', subtitle: '7-Step Timeline', component: BetrayalRecovery },
      { id: 'tracker', title: 'Consistency Tracker', subtitle: 'Weekly Log', component: ConsistencyTracker },
    ],
    COMMUNICATION: [
      { id: 'horsemen_audit', title: 'Horsemen Audit', subtitle: 'Self-Audit', component: HorsemenAudit },
      { id: 'speaker_listener', title: 'Speaker-Listener Protocol', subtitle: '3-Round Dialogue', component: SpeakerListenerProtocol },
      { id: 'i_statement', title: 'I-Statement Builder', subtitle: 'Constructive Tool', component: IStatementBuilder },
    ],
    CONFLICT: [
      { id: 'dreams_conflict', title: 'Dreams within Conflict', subtitle: 'Gridlock Resolution', component: DreamsWithinConflict },
      { id: 'repair_log', title: 'Repair Attempts Log', subtitle: 'De-escalation Tracking', component: RepairLog },
      { id: 'anger_thermometer', title: 'Anger Thermometer', subtitle: 'Time-Out Protocol', component: AngerThermometer },
    ],
  };

  const handleCategorySelect = (id: WorkbookCategory) => {
    sensoryService.tap();
    setActiveCategory(id);
    setActiveWorksheet(null);
  };

  const handleWorksheetSelect = (id: string) => {
    sensoryService.tap();
    setActiveWorksheet(id);
  };

  if (activeWorksheet) {
    const Component = worksheets[activeCategory].find((w: any) => w.id === activeWorksheet)?.component;
    return (
      <div className="px-6 py-12 max-w-xl mx-auto min-h-screen animate-fade-in text-[var(--text-primary)]">
        <button 
          onClick={() => setActiveWorksheet(null)}
          className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mb-12 block hover:opacity-100 transition-opacity"
        >
          ← Back to Workbook
        </button>
        {Component ? <Component onComplete={() => setActiveWorksheet(null)} /> : <div>Worksheet coming soon.</div>}
      </div>
    );
  }

  return (
    <div className="px-6 py-12 max-w-xl mx-auto text-[var(--text-primary)] min-h-screen flex flex-col">
      <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Workbook.</h1>
        <p className="text-xl italic opacity-60 font-light leading-relaxed">Structured paths to relational excellence.</p>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-current border-opacity-5 mb-12 pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id as WorkbookCategory)}
            className={`text-[10px] font-bold uppercase tracking-[0.3em] whitespace-nowrap transition-all pb-4 relative ${
              activeCategory === cat.id ? 'opacity-100' : 'opacity-30 hover:opacity-100'
            }`}
          >
            {cat.label}
            {activeCategory === cat.id && (
              <motion.div layoutId="cat-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-current" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-6"
        >
          {worksheets[activeCategory].map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleWorksheetSelect(ws.id)}
              className="w-full text-left p-10 border border-current border-opacity-5 rounded-[3rem] bg-current/2 hover:bg-current/5 transition-all flex flex-col group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-green)] opacity-60">{ws.subtitle}</span>
                <span className="text-[9px] font-bold uppercase opacity-20 group-hover:opacity-100 transition-opacity">Launch</span>
              </div>
              <h3 className="text-3xl font-light relative z-10">{ws.title}</h3>
              <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-2 transition-opacity" />
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Workbook;
