import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DailyPrompt from '../components/DailyPrompt';
import AICoach from '../components/AICoach';
import GrowthLog from '../components/GrowthLog';
import { UserData, CourseModule, BondScore, View, Lesson, Activity } from '../types';
import { generateLearningPath } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  userData: UserData | null;
  onNavigate?: (view: View) => void;
}

const BondMap: React.FC<{ 
    scores: BondScore[], 
    originScores?: BondScore[],
    showHistory: boolean 
}> = ({ scores, originScores, showHistory }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    
    const size = 260;
    const center = size / 2;
    const radius = size * 0.35;

    const getPoints = useCallback((dataScores: BondScore[], isOrigin = false) => {
        return categories.map((cat, i) => {
            let val = 3.5;
            // Improved search logic to find the specific category record
            const matchingRecords = dataScores.filter(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim());
            
            if (isOrigin) {
                const origin = matchingRecords.find(s => s.timestamp === 1);
                val = origin ? origin.score : (matchingRecords[0]?.score || 3.5);
            } else {
                const latest = [...matchingRecords].sort((a, b) => b.timestamp - a.timestamp)[0];
                val = latest ? latest.score : 3.5;
            }
            
            const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
            const r = (val / 10) * radius;
            return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
        }).map(p => `${p.x},${p.y}`).join(' ');
    }, [radius, center, categories]);

    const currentPoints = useMemo(() => getPoints(scores), [scores, getPoints]);
    const originPoints = useMemo(() => getPoints(scores, true), [scores, getPoints]);
    
    return (
        <div className="py-12 border-y border-current border-opacity-5 flex flex-col items-center">
            <div className="flex justify-between w-full px-4 mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-current border-opacity-20" />
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">Origin</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 heading-font">Kindred Equilibrium</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent-green)]">Presence</span>
                </div>
            </div>
            
            <div className="relative">
                <svg width={size} height={size} className="overflow-visible">
                    {categories.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                        return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.05" />;
                    })}
                    <AnimatePresence>
                        {showHistory && (
                            <motion.polygon 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 0.25 }} 
                                exit={{ opacity: 0 }} 
                                points={originPoints} 
                                fill="currentColor" 
                                stroke="currentColor" 
                                strokeWidth="1" 
                                strokeDasharray="3 3" 
                            />
                        )}
                    </AnimatePresence>
                    <motion.polygon 
                        animate={{ points: currentPoints }} 
                        transition={{ duration: 2.5, ease: [0.2, 0.8, 0.2, 1] }} 
                        points={currentPoints} 
                        fill="var(--accent-green)" 
                        fillOpacity="0.08" 
                        stroke="var(--accent-green)" 
                        strokeWidth="1.5" 
                    />
                    {categories.map((cat, i) => {
                        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                        const labelX = center + (radius + 45) * Math.cos(angle);
                        const labelY = center + (radius + 45) * Math.sin(angle);
                        return <text key={i} x={labelX} y={labelY} fontSize="9" fontWeight="700" textAnchor="middle" fill="currentColor" className="opacity-30 uppercase tracking-[0.1em] heading-font">{cat}</text>;
                    })}
                </svg>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [bondScores, setBondScores] = useState<BondScore[]>([]);
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(true);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [partnerArchitecting, setPartnerArchitecting] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<any | null>(null);
  const [showPulseAnimation, setShowPulseAnimation] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const triggerPulseEffect = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([100, 30, 100]);
    setShowPulseAnimation(true);
    setTimeout(() => setShowPulseAnimation(false), 2000);
  }, []);

  const initializeDashboard = useCallback(async () => {
    const code = userData?.partnerCode || userData?.id || 'default';
    const scores = await cloudService.getBondScores(code);
    setBondScores(scores);

    const savedPath = await cloudService.getLearningPath(code);
    
    if (savedPath.length === 0) {
      // Check if partner is already building it
      const lock = await cloudService.getPathGenerationStatus(code);
      if (lock && lock.userId !== userData?.id) {
        setPartnerArchitecting(true);
        setIsLoadingPath(true);
      } else {
        setIsLoadingPath(true);
        setPartnerArchitecting(false);
        // Set local/remote lock
        if (userData?.id) await cloudService.setPathGenerationLock(code, true, userData.id);
        
        const currentPath = await generateLearningPath();
        setCourseModules(currentPath);
        await cloudService.saveLearningPath(code, currentPath);
        
        if (userData?.id) await cloudService.setPathGenerationLock(code, false, userData.id);
        setIsLoadingPath(false);
      }
    } else {
      setCourseModules(savedPath);
      setIsLoadingPath(false);
      setPartnerArchitecting(false);
    }
    
    setCompletedLessonIds(cloudService.getCompletedLessons());
  }, [userData]);

  useEffect(() => {
    initializeDashboard();
    
    let unsubscribePresence = () => {};
    if (userData?.partnerCode) {
      unsubscribePresence = cloudService.subscribeToPresence(userData.partnerCode, userData.id, userData.userName, userData.vibe || 'Neutral', (presences) => {
          const partner = presences.find(p => p.id !== userData.id);
          setIsPartnerOnline(!!partner);
          setPartnerPresence(partner || null);
      });
    }

    let unsubscribePulses = () => {};
    if (userData?.partnerCode) {
      unsubscribePulses = cloudService.subscribeToPulses(userData.partnerCode, (payload) => {
        if (payload.from !== userData.id) triggerPulseEffect();
      });
    }

    // Refresh dashboard on sync events
    const unsubscribeSync = cloudService.subscribeToPartnerSpace(userData?.partnerCode || 'default', () => {
      initializeDashboard();
    });

    return () => { 
      unsubscribePresence(); 
      unsubscribePulses(); 
      unsubscribeSync();
    };
  }, [userData, triggerPulseEffect, initializeDashboard]);

  const growthSummary = useMemo(() => {
      const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
      return categories.map(cat => {
          const catArr = bondScores.filter(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim()).sort((a, b) => b.timestamp - a.timestamp);
          const current = catArr[0]?.score || 3.5;
          const origin = bondScores.find(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim() && s.timestamp === 1)?.score || 3.5;
          const delta = current - origin;
          return { cat, delta, current };
      });
  }, [bondScores]);

  const enrichedModules = useMemo(() => {
    return courseModules.map((m) => {
      const lessons = m.content || [];
      const totalCount = lessons.length;
      const completedCount = lessons.filter((l) => completedLessonIds.includes(l.id)).length;
      const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      return { ...m, totalCount, completedCount, progress };
    });
  }, [courseModules, completedLessonIds]);

  const sendPulse = async () => {
    if (!userData?.partnerCode) return;
    if ('vibrate' in navigator) navigator.vibrate(50);
    setShowPulseAnimation(true);
    setTimeout(() => setShowPulseAnimation(false), 1500);
    await cloudService.sendPulse(userData.partnerCode, userData.id);
  };

  const completeLesson = async (lessonId: string) => {
    await cloudService.markLessonComplete(lessonId);
    setCompletedLessonIds(prev => [...prev, lessonId]);
    setSelectedLesson(null);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto relative transition-colors duration-700 min-h-screen">
        <div className={`fixed inset-0 pointer-events-none z-[100] transition-opacity duration-1000 ${showPulseAnimation ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 border-[12px] border-[var(--accent-green)] border-opacity-10 animate-[heartbeat_2s_infinite]" />
        </div>

        <header className="mb-12 flex justify-between items-start text-[var(--text-primary)]">
            <div className="relative">
              <h1 className="text-clamp-6xl font-light mb-4">{userData?.userName ? `Hello, ${userData.userName}.` : 'Kindred.'}</h1>
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-[var(--accent-green)] animate-ping' : 'opacity-10 bg-current'}`} />
                 <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">
                   {userData?.partnerName} is {isPartnerOnline ? (partnerPresence?.vibe || 'Active') : 'Away'}
                 </p>
              </div>
            </div>
            <button onClick={sendPulse} className="group w-12 h-12 rounded-full border border-current border-opacity-10 transition-all active:scale-90 bg-current bg-opacity-5 flex items-center justify-center">
                <div className={`text-xl ${showPulseAnimation ? 'text-[var(--accent-pink)]' : 'opacity-20'}`}>❤</div>
            </button>
        </header>

        <DailyPrompt />
        
        <BondMap scores={bondScores} showHistory={showHistoryOverlay} />
        
        <div className="mb-16 grid grid-cols-1 gap-4 pt-4 text-[var(--text-primary)]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 text-center mb-6 heading-font">The Evolution Path</h3>
            <div className="space-y-4">
                {growthSummary.map(({ cat, delta, current }) => (
                    <div key={cat} className="flex justify-between items-center p-6 border border-current border-opacity-5 rounded-3xl bg-current bg-opacity-5 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-40 heading-font">{cat}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-light opacity-60 italic pr-2 border-r border-current border-opacity-10">{current.toFixed(1)}</span>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${delta >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-pink)]'}`}>
                                {delta >= 0 ? '+' : ''}{delta.toFixed(1)} {delta >= 0 ? 'Expansion' : 'Contraction'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowHistoryOverlay(!showHistoryOverlay)} className="w-full text-xs font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity py-4 heading-font">
                {showHistoryOverlay ? 'Hide Origin Baseline' : 'Overlay Origin Baseline'}
            </button>
        </div>

        {userData?.partnerCode && <GrowthLog partnerCode={userData.partnerCode} />}

        <div className="py-16 text-[var(--text-primary)]">
            <div className="flex justify-between items-center mb-12">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-30 heading-font">Shared Evolution</h2>
                {isLoadingPath && (
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--accent-green)] animate-pulse">
                         {partnerArchitecting ? `${userData?.partnerName} is architecting your path...` : 'Building your shared horizon...'}
                      </span>
                   </div>
                )}
            </div>
            <div className="space-y-8">
                {enrichedModules.length > 0 ? enrichedModules.map((m, i) => (
                    <button 
                      key={m.id || i} 
                      disabled={m.status === 'locked'} 
                      onClick={() => setSelectedModule(m)}
                      className={`w-full text-left py-12 px-8 border border-current border-opacity-5 rounded-[2.5rem] relative transition-all ${m.status === 'locked' ? 'opacity-20 grayscale' : 'hover:bg-current hover:bg-opacity-5 active:scale-[0.98]'}`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest mb-2 block opacity-30">{i >= 3 ? `Evolution Phase ${i-2}` : `Phase ${i+1}`}</span>
                                <h3 className="text-clamp-4xl font-light">{m.title}</h3>
                            </div>
                            {m.status === 'completed' && <span className="text-sm text-[var(--accent-green)] font-bold uppercase">✓</span>}
                        </div>
                        {m.rationale && (
                            <div className="mb-6 p-4 bg-current bg-opacity-5 rounded-2xl border-l-2 border-[var(--accent-green)] border-opacity-30">
                                <p className="text-[11px] uppercase tracking-widest opacity-30 font-bold mb-1">Oracle Attribution</p>
                                <p className="text-xs italic opacity-40 leading-relaxed">"{m.rationale}"</p>
                            </div>
                        )}
                        <div className="flex justify-between items-end">
                            <span className="text-base italic opacity-30 font-light">{m.description.slice(0, 80)}...</span>
                            <span className="text-xs font-bold uppercase opacity-30">{m.completedCount}/{m.totalCount}</span>
                        </div>
                        <div className="absolute bottom-0 left-0 h-[3px] opacity-10 bg-current w-full rounded-b-[2.5rem] overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} className="h-full bg-[var(--accent-green)]" transition={{ duration: 2 }} />
                        </div>
                    </button>
                )) : (
                    !isLoadingPath && (
                       <div className="text-center py-10 border border-dashed border-current border-opacity-10 rounded-[2.5rem] opacity-30">
                          <p className="text-xs font-bold uppercase tracking-widest italic">The path is silent. Initiate a shared focus in Space.</p>
                       </div>
                    )
                )}
            </div>
        </div>

        <AICoach />

        {selectedModule && (
          <div className="fixed inset-0 z-[150] bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-y-auto animate-fade-in p-8">
             <header className="mb-12 flex justify-between items-start pt-4">
                <div>
                   <span className="text-xs font-bold uppercase tracking-[0.4em] opacity-20 mb-2 block heading-font">Exploring Phase</span>
                   <h2 className="text-clamp-5xl font-light">{selectedModule.title}</h2>
                </div>
                <button onClick={() => setSelectedModule(null)} className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 border-b border-current pb-1 heading-font">Close</button>
             </header>

             <div className="space-y-6">
                {selectedModule.content?.map((lesson, idx) => {
                  const isPartnerHere = partnerPresence?.currentLessonId === lesson.id;
                  return (
                    <button key={lesson.id} onClick={() => setSelectedLesson(lesson)} className={`w-full text-left p-10 border border-current border-opacity-5 rounded-[2.5rem] bg-current bg-opacity-5 transition-all flex justify-between items-center group relative ${isPartnerHere ? 'border-[var(--accent-green)] border-opacity-40 ring-1 ring-[var(--accent-green)] ring-opacity-10' : ''}`}>
                       <div className="flex flex-col">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-30">Lesson {idx + 1}</span>
                            {isPartnerHere && <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" /><span className="text-[10px] font-bold text-[var(--accent-green)] uppercase tracking-widest">{userData?.partnerName} is here</span></div>}
                          </div>
                          <h4 className="text-3xl font-light">{lesson.title}</h4>
                       </div>
                       {completedLessonIds.includes(lesson.id) ? <span className="text-xs text-[var(--accent-green)] font-bold uppercase">Done</span> : <span className="text-sm opacity-30 font-bold group-hover:opacity-100 transition-opacity">→</span>}
                    </button>
                  );
                })}
             </div>
          </div>
        )}

        {selectedLesson && (
          <div className="fixed inset-0 z-[160] bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-y-auto animate-fade-in p-8 pb-32">
             <header className="mb-12 flex justify-between items-start pt-4">
                <div>
                   <div className="flex items-center gap-4 mb-2">
                     <span className="text-xs font-bold uppercase tracking-[0.4em] opacity-30 heading-font">{selectedLesson.type}</span>
                     {partnerPresence?.currentLessonId === selectedLesson.id && <div className="px-4 py-2 bg-[var(--accent-green)] bg-opacity-5 rounded-full border border-[var(--accent-green)] border-opacity-20 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" /><span className="text-[10px] font-bold text-[var(--accent-green)] uppercase tracking-widest">{userData?.partnerName} is reading with you</span></div>}
                   </div>
                   <h2 className="text-clamp-5xl font-light">{selectedLesson.title}</h2>
                </div>
                <button onClick={() => setSelectedLesson(null)} className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 border-b border-current pb-1 heading-font">Close</button>
             </header>
             <div className="prose prose-stone dark:prose-invert prose-2xl max-w-none lesson-content mb-24 font-light leading-relaxed italic opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Markdown>{selectedLesson.longContent}</Markdown>
             </div>
             <div className="fixed bottom-12 left-0 right-0 px-8 flex justify-center">
                <button onClick={() => completeLesson(selectedLesson.id)} className="w-full max-w-sm py-6 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95 transition-all heading-font">Mark as Complete</button>
             </div>
          </div>
        )}
        <style>{`
            @keyframes heartbeat {
                0% { transform: scale(1); opacity: 0.1; }
                50% { transform: scale(1.02); opacity: 0.15; }
                100% { transform: scale(1); opacity: 0.1; }
            }
        `}</style>
    </div>
  );
};

export default Dashboard;