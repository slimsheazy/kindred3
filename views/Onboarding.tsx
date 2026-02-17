import React, { useState, useMemo, useEffect } from 'react';
import { UserData } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { cloudService } from '../services/cloudService';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

const CalibrationMap: React.FC<{ assessment: Record<string, number> }> = ({ assessment }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    
    const categoryScores = useMemo(() => {
        return {
            'Communication': (assessment['c1'] + assessment['c2']) / 2,
            'Intimacy': (assessment['i1'] + assessment['i2']) / 2,
            'Trust': (assessment['t1'] + assessment['t2']) / 2,
            'Conflict': (assessment['n1'] + assessment['n2']) / 2,
            'Shared Vision': (assessment['v1'] + assessment['v2']) / 2,
        };
    }, [assessment]);

    const size = 280;
    const center = size / 2;
    const radius = size * 0.35;

    const points = categories.map((cat, i) => {
        const val = categoryScores[cat as keyof typeof categoryScores] || 5;
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (val / 10) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    });

    const baselinePoints = categories.map((_, i) => {
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (7 / 10) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');
    const baselinePath = baselinePoints.map(p => `${p.x},${p.y}`).join(' ');

    const getResonanceLabel = (score: number) => {
        if (score < 4) return { label: 'Nascent', color: 'opacity-40' };
        if (score < 7) return { label: 'Stable', color: 'text-[var(--accent-green)] opacity-60' };
        return { label: 'Radiant', color: 'text-[var(--accent-green)] font-bold' };
    };

    return (
        <div className="flex flex-col items-center justify-center py-6 mb-8 animate-fade-in relative">
            <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-current border-opacity-20" />
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-20 heading-font">Baseline</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--accent-green)] heading-font">Calibration</span>
                </div>
            </div>

            <svg width={size} height={size} className="overflow-visible mb-8">
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                    <circle key={i} cx={center} cy={center} r={radius * scale} fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.05" />
                ))}
                {categories.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" />;
                })}
                
                <polygon points={baselinePath} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.1" />
                <motion.polygon initial={false} animate={{ points: polygonPath }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} fill="var(--accent-green)" fillOpacity="0.08" stroke="var(--accent-green)" strokeWidth="1.5" />
                
                {points.map((p, i) => (
                    <motion.circle key={i} initial={false} animate={{ cx: p.x, cy: p.y }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} r="4" fill="var(--accent-green)" />
                ))}

                {categories.map((cat, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    const labelX = center + (radius + 40) * Math.cos(angle);
                    const labelY = center + (radius + 40) * Math.sin(angle);
                    return <text key={i} x={labelX} y={labelY} fontSize="8" fontWeight="700" textAnchor="middle" fill="currentColor" className="opacity-20 uppercase tracking-widest heading-font">{cat}</text>;
                })}
            </svg>

            <div className="w-full space-y-3 px-2 border-t border-current border-opacity-5 pt-8">
                {categories.map(cat => {
                    const score = categoryScores[cat as keyof typeof categoryScores];
                    const resonance = getResonanceLabel(score);
                    return (
                        <div key={cat} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest heading-font">
                            <span className="opacity-30">{cat}</span>
                            <div className="flex items-center gap-4">
                                <span className="opacity-20 font-mono">{score.toFixed(1)}</span>
                                <span className={resonance.color}>{resonance.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'profile' | 'space_id' | 'assessment' | 'intentions'>('welcome');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<UserData>({
    id: '',
    userName: '',
    partnerName: '',
    yearsTogether: '',
    focusAreas: [],
    partnerCode: '',
    syncStatus: 'offline',
    theme: 'midnight'
  });

  const [assessment, setAssessment] = useState<Record<string, number>>({
    'c1': 5, 'c2': 5, 'i1': 5, 'i2': 5, 't1': 5, 't2': 5, 'n1': 5, 'n2': 5, 'v1': 5, 'v2': 5
  });

  useEffect(() => {
    const uniqueId = 'KND-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setData(prev => ({ ...prev, id: uniqueId }));

    // Listen for the magic link return
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // If the user already has a profile, we should skip onboarding
          const existingProfile = await cloudService.getProfile(session.user.id);
          if (existingProfile) {
            onComplete(existingProfile);
          } else {
            setData(prev => ({ ...prev, id: session.user.id }));
            setStep('profile');
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [onComplete]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setStep('profile');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      setIsEmailSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    const finalData = { ...data, syncStatus: 'synced' as const };
    const code = finalData.partnerCode || finalData.id;
    
    const finalScores = {
        'Communication': (assessment['c1'] + assessment['c2']) / 2,
        'Intimacy': (assessment['i1'] + assessment['i2']) / 2,
        'Trust': (assessment['t1'] + assessment['t2']) / 2,
        'Conflict': (assessment['n1'] + assessment['n2']) / 2,
        'Shared Vision': (assessment['v1'] + assessment['v2']) / 2,
    };

    await cloudService.initializeBondScores(code, finalScores);
    await cloudService.signUp(finalData);
    
    onComplete(finalData);
  };

  const assessmentGroups = [
    { title: 'Communication', questions: [
        { id: 'c1', q: 'How often do you personally feel we share meaningful dialogue?', low: 'Rarely', high: 'Daily' }, 
        { id: 'c2', q: 'How easy is it for you to express unedited needs without fear?', low: 'Heavy', high: 'Fluid' }
    ] },
    { title: 'Intimacy', questions: [
        { id: 'i1', q: 'Your personal comfort in our physical resonance and touch.', low: 'Distant', high: 'Resonant' }, 
        { id: 'i2', q: 'Your sense of emotional safety in being completely vulnerable.', low: 'Guarded', high: 'Open' }
    ] },
    { title: 'Trust', questions: [
        { id: 't1', q: 'How much do you rely on the integrity of small daily promises?', low: 'Fragile', high: 'Total' }, 
        { id: 't2', q: 'Your personal certainty in our shared long-term security.', low: 'Unsure', high: 'Rooted' }
    ] },
    { title: 'Conflict', questions: [
        { id: 'n1', q: 'How much kindness do you experience during our disagreements?', low: 'Little', high: 'Deep' }, 
        { id: 'n2', q: 'Your perception of the speed of repair after friction.', low: 'Slow', high: 'Swift' }
    ] },
    { title: 'Shared Vision', questions: [
        { id: 'v1', q: 'Your sense of alignment in our life pace and day-to-day rhythm.', low: 'Clashing', high: 'Harmonic' }, 
        { id: 'v2', q: 'How clear is the future we are building together to you?', low: 'Blurred', high: 'Defined' }
    ] }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-[var(--text-primary)] relative bg-[var(--bg-primary)]">
      <div className="w-full max-w-md animate-fade-in-up">
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-clamp-7xl font-light tracking-tight leading-tight mb-8">Kindred.</h1>
            <p className="text-2xl opacity-60 font-light mb-14 leading-relaxed italic px-4">Architecting shared depth through intentional space and AI insight.</p>
            <div className="space-y-4">
              <button onClick={() => setStep('auth')} className="w-full border border-current opacity-60 hover:opacity-100 py-6 rounded-full font-bold text-xs uppercase tracking-[0.4em] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all heading-font shadow-xl">Cloud Sync Login</button>
              <button onClick={() => setStep('profile')} className="w-full py-4 text-xs font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-all heading-font">Continue Offline</button>
            </div>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-clamp-5xl font-light">Resonance.</h2>
              <p className="text-base opacity-40 italic mt-3">Synchronize across the cloud</p>
            </div>

            {isEmailSent ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-12 h-12 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto mb-8" />
                <h3 className="text-2xl font-light mb-4">Verification Sent.</h3>
                <p className="text-base opacity-50 italic px-8">Check your email for the Kindred entry link. We are listening for your return.</p>
                <button onClick={() => setIsEmailSent(false)} className="mt-12 text-xs font-bold uppercase tracking-widest opacity-30 border-b border-current pb-1">Use a different email</button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-12">
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-transparent border-b border-current opacity-60 focus:opacity-100 text-3xl font-light py-6 focus:border-[var(--accent-green)] transition-all text-center" 
                  placeholder="your@email.com" 
                  required
                />
                {error && <p className="text-xs text-[var(--accent-pink)] text-center uppercase tracking-widest font-bold">{error}</p>}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-current text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-30"
                >
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            )}
            <button onClick={() => setStep('welcome')} className="w-full text-xs font-bold opacity-20 uppercase tracking-widest heading-font">← Back</button>
          </div>
        )}

        {step === 'profile' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">The Basics.</h2>
                <p className="text-base opacity-40 italic mt-3">Who is building this world?</p>
             </div>
             <div className="space-y-12">
               <input type="text" value={data.userName} onChange={(e) => setData({...data, userName: e.target.value})} className="w-full bg-transparent border-b border-current opacity-40 focus:opacity-100 text-4xl font-light py-6 focus:border-[var(--accent-green)] transition-all" placeholder="Your Name" />
               <input type="text" value={data.partnerName} onChange={(e) => setData({...data, partnerName: e.target.value})} className="w-full bg-transparent border-b border-current opacity-40 focus:opacity-100 text-4xl font-light py-6 focus:border-[var(--accent-green)] transition-all" placeholder="Partner Name" />
             </div>
             <button onClick={() => setStep('space_id')} disabled={!data.userName || !data.partnerName} className="w-full bg-current text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 transition-all shadow-xl">Continue</button>
           </div>
        )}
        {step === 'space_id' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">Space ID.</h2>
                <p className="text-base opacity-40 italic mt-3">Create or enter a shared code</p>
             </div>
             <div className="space-y-12">
               <input type="text" value={data.partnerCode} onChange={(e) => setData({...data, partnerCode: e.target.value.toUpperCase()})} className="w-full bg-transparent border-b border-current opacity-60 text-5xl font-mono text-center py-6 focus:border-[var(--accent-green)] transition-all uppercase tracking-tighter" placeholder="TWIN24" />
             </div>
             <button onClick={() => setStep('assessment')} disabled={!data.partnerCode} className="w-full bg-current text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 transition-all shadow-xl">Lock Identity</button>
           </div>
        )}
        {step === 'assessment' && (
           <div className="space-y-8">
             <div className="text-center px-4">
                <h2 className="text-clamp-5xl font-light mb-2">Calibration.</h2>
                <p className="text-base italic opacity-40">Provide your baseline perception.</p>
             </div>
             <CalibrationMap assessment={assessment} />
             <div className="space-y-16 max-h-[40vh] overflow-y-auto pr-6 no-scrollbar pb-10">
               {assessmentGroups.map((group) => (
                 <div key={group.title} className="space-y-12">
                    <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] sticky top-0 bg-[var(--bg-primary)] py-4 z-10">{group.title}</h3>
                    {group.questions.map((q) => (
                        <div key={q.id} className="space-y-8">
                            <p className="text-xl italic opacity-90 font-light leading-snug">{q.q}</p>
                            <div className="space-y-4">
                                <input type="range" min="1" max="10" step="0.5" value={assessment[q.id]} onChange={(e) => setAssessment({...assessment, [q.id]: parseFloat(e.target.value)})} className="w-full h-[2px] opacity-20 bg-current rounded-full appearance-none cursor-pointer accent-[var(--accent-green)]" />
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-30">
                                    <span>{q.low}</span>
                                    <span>{q.high}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               ))}
             </div>
             <div className="pt-6 border-t border-current opacity-10">
                <button onClick={() => setStep('intentions')} className="w-full bg-[var(--accent-green)] text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-xl">Finalize Calibration</button>
             </div>
           </div>
        )}
        {step === 'intentions' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">Focus Area.</h2>
                <p className="text-base italic opacity-40 mt-3">Where shall we direct the light?</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               {["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"].map(opt => (
                 <button key={opt} onClick={() => setData({...data, focusAreas: data.focusAreas.includes(opt) ? data.focusAreas.filter(f => f !== opt) : [...data.focusAreas, opt]})} className={`py-8 border rounded-[2.5rem] text-xs font-bold uppercase tracking-[0.2em] transition-all ${data.focusAreas.includes(opt) ? 'bg-[var(--accent-green)] text-white border-[var(--accent-green)]' : 'opacity-40 border-current hover:opacity-100'}`}>
                    {opt}
                 </button>
               ))}
             </div>
             <button onClick={handleComplete} disabled={data.focusAreas.length === 0} className="w-full bg-current text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 shadow-2xl">Initiate Space</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;