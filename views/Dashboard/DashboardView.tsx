
import React, { useState, useEffect } from 'react';
import DailyPrompt from '../../components/DailyPrompt';
import AICoach from '../../components/AICoach';
import GrowthLog from '../../components/GrowthLog';
import { UserData, CourseModule, Lesson, FoundationSummary, View } from '../../types';
import { Button } from '../../components/atoms/Button';
import Markdown from 'markdown-to-jsx';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '../../components/ErrorBoundary';
import { cloudService } from '../../services/cloudService';
import { generateProactiveNudge } from '../../services/ai/coaching';

const KnowledgeMeter: React.FC<{ score: number, loading?: boolean }> = ({ score, loading }) => {
  const size = 200;
  const strokeWidth = 2;
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;

  if (loading) return (
    <div className="w-full flex flex-col items-center py-12 animate-pulse">
      <div className="w-40 h-40 rounded-full border border-current border-opacity-5" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center py-12 group">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="opacity-5"
          />
          {/* Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "circOut" }}
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(168,255,181,0.3)]"
          />
        </svg>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl font-light tracking-tighter"
          >
            {Math.round(score * 10)}%
          </motion.span>
          <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30 mt-2 heading-font">World Known</span>
        </div>

        {/* Decorative Particles */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-[var(--accent-green)] rounded-full animate-ping" />
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-[var(--accent-pink)] rounded-full animate-ping [animation-delay:1s]" />
        </div>
      </div>
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.5em] opacity-40 heading-font">Love Map Integrity</p>
    </div>
  );
};

const BondMap: React.FC<{ scores: any[], showHistory: boolean, loading?: boolean }> = ({ scores, showHistory, loading }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    const size = 260;
    const center = size / 2;
    const radius = size * 0.35;

    if (loading) return (
      <div className="py-12 flex flex-col items-center my-8 animate-pulse">
        <div className="w-48 h-48 rounded-full bg-current opacity-5" />
      </div>
    );

    const getPoints = (isOrigin = false) => {
        return categories.map((cat, i) => {
            const matching = scores.filter(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim());
            const val = isOrigin ? (matching.find(s => s.timestamp === 1)?.score || 3.5) : ([...matching].sort((a,b) => b.timestamp - a.timestamp)[0]?.score || 3.5);
            const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
            const r = (val / 10) * radius;
            return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
        }).map(p => `${p.x},${p.y}`).join(' ');
    };

    return (
        <div className="py-12 border-y border-current border-opacity-5 flex flex-col items-center my-8">
            <svg width={size} height={size} className="overflow-visible" role="img">
                {categories.map((_, i) => <line key={i} x1={center} y1={center} x2={center + radius * Math.cos((i * 2 * Math.PI) / categories.length - Math.PI / 2)} y2={center + radius * Math.sin((i * 2 * Math.PI) / categories.length - Math.PI / 2)} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />)}
                <AnimatePresence>{showHistory && <motion.polygon initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} points={getPoints(true)} fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />}</AnimatePresence>
                <motion.polygon animate={{ points: getPoints() }} points={getPoints()} fill="var(--accent-green)" fillOpacity="0.1" stroke="var(--accent-green)" strokeWidth="1" />
                {categories.map((cat, i) => <text key={i} x={center + (radius + 40) * Math.cos((i * 2 * Math.PI) / categories.length - Math.PI / 2)} y={center + (radius + 40) * Math.sin((i * 2 * Math.PI) / categories.length - Math.PI / 2)} fontSize="8" fontWeight="700" textAnchor="middle" fill="currentColor" className="opacity-40 uppercase tracking-[0.1em]">{cat}</text>)}
            </svg>
        </div>
    );
};

interface DashboardViewProps {
  userData: UserData | null;
  isPartnerOnline: boolean;
  bondScores: any[];
  growthSummary: any[];
  scoresLoading: boolean;
  courseModules: CourseModule[];
  modulesLoading: boolean;
  selectedModule: CourseModule | null;
  selectedLesson: Lesson | null;
  onPulse: () => void;
  onSelectModule: (m: CourseModule | null) => void;
  onSelectLesson: (l: Lesson | null) => void;
  revealAvailable?: boolean;
  onStartReveal?: () => void;
  onNavigate?: (view: View) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userData,
  isPartnerOnline,
  bondScores,
  growthSummary,
  scoresLoading,
  courseModules,
  modulesLoading,
  selectedModule,
  selectedLesson,
  onPulse,
  onSelectModule,
  onSelectLesson,
  revealAvailable,
  onStartReveal,
  onNavigate
}) => {
  const [foundation, setFoundation] = useState<FoundationSummary | null>(null);
  const [showAura, setShowAura] = useState(false);
  const [proactiveWhisper, setProactiveWhisper] = useState<string | null>(null);
  const [pendingCollaborations, setPendingCollaborations] = useState<{ topic: string, type: 'quiz' | 'ritual' }[]>([]);
  const knowledgeScore = bondScores.find(s => s.category === 'Knowledge')?.score || 0;

  useEffect(() => {
    if (userData?.partnerCode) {
      cloudService.getLatestFoundationSummary(userData.partnerCode).then(setFoundation);
      
      const refreshStatus = async () => {
        const pending = await cloudService.getPendingCollaborations(userData.partnerCode!, userData.id);
        setPendingCollaborations(pending);
      };

      const unsub = cloudService.subscribeToPulses(userData.partnerCode, (p) => {
        if (p.from !== userData.id) {
          setShowAura(true);
          setTimeout(() => setShowAura(false), 5000);
          refreshStatus();
        }
      });

      // Also subscribe to database changes for quiz answers
      const unsubSpace = cloudService.subscribeToPartnerSpace(userData.partnerCode, refreshStatus);

      // Periodic check for proactive whispers
      const fetchWhisper = async () => {
        const logs = await cloudService.getGrowthLogs(userData.partnerCode!);
        const result = await generateProactiveNudge(userData, bondScores, logs);
        if (result.data) setProactiveWhisper(result.data);
      };

      refreshStatus();
      if (bondScores.length > 0) fetchWhisper();

      return () => {
        unsub();
        unsubSpace();
      };
    }
  }, [userData, bondScores]);

  return (
    <div className="px-6 py-12 max-w-xl mx-auto relative min-h-screen">
        {/* Received Pulse Aura */}
        <AnimatePresence>
          {showAura && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[var(--accent-pink)] pointer-events-none z-[-1] blur-[100px]"
            />
          )}
        </AnimatePresence>

        <header className="mb-12 flex justify-between items-center text-[var(--text-primary)]">
            <div>
              <h1 className="text-clamp-6xl font-light mb-3">{userData?.userName ? `Hello, ${userData.userName}.` : 'Kindred.'}</h1>
              <div className="flex items-center gap-3">
                 <div className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? 'bg-[var(--accent-green)] animate-pulse' : 'opacity-20 bg-current'}`} />
                 <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Partner is {isPartnerOnline ? 'Active' : 'Away'}</p>
              </div>
            </div>
            <button 
              onClick={onPulse} 
              className={`w-14 h-14 rounded-full border border-current border-opacity-10 bg-current/5 flex items-center justify-center transition-all active:scale-90 text-xl ${showAura ? 'text-[var(--accent-pink)] border-[var(--accent-pink)] shadow-lg scale-110' : 'opacity-30 hover:opacity-100'}`}
            >
              ❤
            </button>
        </header>

        {/* Pending Resonance Alerts (Handshake Notifications) */}
        <AnimatePresence>
          {pendingCollaborations.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12 space-y-4"
            >
              <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30 px-2 block heading-font">Partner is Waiting</span>
              {pendingCollaborations.map((collab, i) => (
                <button 
                  key={i}
                  onClick={() => onNavigate?.(collab.type === 'quiz' ? View.Quiz : View.Rituals)}
                  className="w-full flex items-center justify-between p-6 bg-current/5 border border-[var(--accent-pink)]/20 rounded-[2rem] hover:bg-current/10 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-pink)]/10 flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-[var(--accent-pink)] rounded-full animate-ping" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">{collab.topic}</span>
                      <span className="text-[9px] italic opacity-40">Tap to complete shared resonance</span>
                    </div>
                  </div>
                  <span className="text-xl opacity-20">→</span>
                </button>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Oracle Proactive Whisper Bubble */}
        <AnimatePresence>
          {proactiveWhisper && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 p-8 bg-current/2 border-l-2 border-[var(--accent-pink)] rounded-r-[2rem] relative group"
            >
              <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30 mb-4 block heading-font">Oracle Whisper</span>
              <p className="text-lg italic font-light leading-relaxed opacity-80">
                {proactiveWhisper}
              </p>
              <button 
                onClick={() => setProactiveWhisper(null)} 
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-20 text-[10px] font-bold"
              >✕</button>
            </motion.section>
          )}
        </AnimatePresence>

        <ErrorBoundary name="Daily Prompt Service">
          <DailyPrompt />
        </ErrorBoundary>

        {/* Weekly Reveal Invitation */}
        <AnimatePresence>
          {revealAvailable && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-12 p-8 bg-gradient-to-br from-[var(--accent-pink)]/10 to-[var(--accent-green)]/10 border border-current border-opacity-5 rounded-[3rem] text-center shadow-xl relative overflow-hidden group cursor-pointer"
              onClick={onStartReveal}
            >
              <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity" />
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 mb-4 block heading-font">A New Frequency Awaits</span>
              <h2 className="text-3xl font-light mb-4 italic">The Weekly Reveal.</h2>
              <p className="text-sm opacity-60 font-light mb-8 max-w-[280px] mx-auto leading-relaxed">Gather your thoughts and enter the synthesis of your shared breath.</p>
              <Button onClick={(e) => { e.stopPropagation(); onStartReveal?.(); }} variant="secondary" size="md">Enter Synthesis</Button>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Knowledge Meter Section */}
        <section className="animate-fade-in-up">
          <KnowledgeMeter score={knowledgeScore} loading={scoresLoading} />
        </section>

        {/* Foundation Summary Display */}
        {foundation && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 p-10 bg-current/2 border border-current border-opacity-5 rounded-[3rem] text-center italic font-light relative overflow-hidden"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 mb-6 block heading-font">Our Shared Foundation</span>
            <div className="prose prose-stone dark:prose-invert text-lg leading-relaxed opacity-70">
              <Markdown>{foundation.content}</Markdown>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="text-4xl">⚓</span>
            </div>
          </motion.section>
        )}

        <BondMap scores={bondScores} showHistory={true} loading={scoresLoading} />
        
        <div className="mb-16 grid grid-cols-1 gap-6 pt-4 text-[var(--text-primary)]">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30 text-center mb-6">Evolutionary State</h3>
            <div className="space-y-3">
                {scoresLoading ? Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-current opacity-5 rounded-[2rem]" />
                )) : growthSummary.map(({ cat, delta, current }) => (
                    <div key={cat} className="flex justify-between items-center p-5 border border-current border-opacity-5 rounded-[2rem] bg-current/2 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-50">{cat}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-light opacity-80 italic">{current.toFixed(1)}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${delta >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-pink)]'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {userData?.partnerCode && (
          <ErrorBoundary name="Growth Log Service">
            <GrowthLog partnerCode={userData.partnerCode} />
          </ErrorBoundary>
        )}

        <div className="py-12">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-10">Shared Evolution</h2>
            <div className="space-y-8">
                {modulesLoading ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse bg-current opacity-5 rounded-[2.5rem]" />
                )) : courseModules.map((m, i) => (
                    <button key={m.id || i} onClick={() => onSelectModule(m)} className="w-full text-left py-10 px-8 border border-current border-opacity-5 rounded-[2.5rem] bg-current/2 hover:bg-current/5 transition-all">
                        <span className="text-[8px] font-bold uppercase tracking-widest mb-2 block opacity-30">Phase {i+1}</span>
                        <h3 className="text-2xl font-light mb-2">{m.title}</h3>
                        <p className="text-xs italic opacity-40 font-light truncate">{m.description}</p>
                    </button>
                ))}
            </div>
        </div>

        <AICoach />

        <AnimatePresence>
          {selectedModule && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed inset-0 z-[150] bg-[var(--bg-primary)] p-8 overflow-y-auto text-[var(--text-primary)]">
               <header className="mb-16 flex justify-between items-start pt-6">
                  <div><h2 className="text-clamp-5xl font-light">{selectedModule.title}</h2></div>
                  <button onClick={() => onSelectModule(null)} className="text-[10px] font-bold uppercase opacity-40 border-b border-current pb-1">Close</button>
               </header>
               <div className="space-y-5 max-w-lg mx-auto">
                  {modulesLoading ? (
                    <div className="flex flex-col items-center py-20 gap-8 animate-pulse">
                      <div className="w-12 h-12 border-2 border-current border-t-transparent rounded-full animate-spin opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Architecting Lessons...</p>
                    </div>
                  ) : selectedModule.content?.map((lesson) => (
                      <button key={lesson.id} onClick={() => onSelectLesson(lesson)} className="w-full text-left p-8 border border-current border-opacity-5 rounded-[2rem] bg-current/2 flex justify-between items-center group">
                         <div className="flex flex-col">
                           <span className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-1">{lesson.type}</span>
                           <h4 className="text-xl font-light">{lesson.title}</h4>
                         </div>
                         <span className="opacity-20 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                  ))}
               </div>
            </motion.div>
          )}

          {selectedLesson && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[160] bg-[var(--bg-primary)] p-8 overflow-y-auto pb-32 text-[var(--text-primary)]">
               <header className="mb-12 flex justify-between items-start pt-6 max-w-2xl mx-auto">
                  <div><h2 className="text-clamp-4xl font-light">{selectedLesson.title}</h2></div>
                  <button onClick={() => onSelectLesson(null)} className="text-[10px] font-bold uppercase opacity-40 border-b border-current pb-1">Close</button>
               </header>
               <div className="prose dark:prose-invert prose-xl max-w-2xl mx-auto italic font-light opacity-95"><Markdown>{selectedLesson.longContent}</Markdown></div>
               <div className="fixed bottom-10 left-0 right-0 px-8 flex justify-center z-[170]">
                  <Button onClick={() => onSelectLesson(null)} fullWidth size="xl">Internalize</Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};
