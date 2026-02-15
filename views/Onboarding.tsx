
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
    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex flex-col items-center justify-center py-10 mb-8 animate-fade-in relative">
            <svg width={size} height={size} className="overflow-visible">
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                    <circle key={i} cx={center} cy={center} r={radius * scale} fill="none" stroke="#121212" strokeWidth="0.5" strokeOpacity="0.05" />
                ))}
                {categories.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#121212" strokeWidth="0.5" strokeOpacity="0.1" />;
                })}
                <motion.polygon initial={false} animate={{ points: polygonPath }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} fill="#3D8C50" fillOpacity="0.08" stroke="#3D8C50" strokeWidth="1.5" />
                {points.map((p, i) => <motion.circle key={i} initial={false} animate={{ cx: p.x, cy: p.y }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} r="4" fill="#3D8C50" />)}
            </svg>
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-[#3D8C50]/40 mt-8 heading-font">Your Baseline Architecture</span>
        </div>
    );
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'link_sent' | 'profile' | 'space_id' | 'assessment' | 'intentions'>('welcome');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<UserData>({
    id: '',
    userName: '',
    partnerName: '',
    yearsTogether: '',
    focusAreas: [],
    partnerCode: '',
    syncStatus: 'offline'
  });

  const [assessment, setAssessment] = useState<Record<string, number>>({
    'c1': 5, 'c2': 5, 'i1': 5, 'i2': 5, 't1': 5, 't2': 5, 'n1': 5, 'n2': 5, 'v1': 5, 'v2': 5
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setData(prev => ({ ...prev, id: session.user.id }));
        setStep('profile');
      }
    };
    checkSession();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Cloud engine unavailable. Proceeding in local mode.");
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
      setStep('link_sent');
    } catch (err: any) {
      setError(err.message || "Failed to dispatch magic link.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    const finalData = { ...data, syncStatus: 'synced' as const };
    const code = finalData.partnerCode || finalData.id || 'TWINSPACE';
    
    // Save initial bond scores (baseline)
    const finalScores = {
        'Communication': (assessment['c1'] + assessment['c2']) / 2,
        'Intimacy': (assessment['i1'] + assessment['i2']) / 2,
        'Trust': (assessment['t1'] + assessment['t2']) / 2,
        'Conflict': (assessment['n1'] + assessment['n2']) / 2,
        'Shared Vision': (assessment['v1'] + assessment['v2']) / 2,
    };

    // Ensure we start with a slight offset so initial view isn't a perfect circle
    for (const [cat, score] of Object.entries(finalScores)) {
        await cloudService.updateBondScore(code, cat, score);
    }
    
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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-[#121212] relative bg-[#FDFCF0]">
      <div className="w-full max-w-md animate-fade-in-up">
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-clamp-7xl font-light tracking-tight leading-tight mb-8">Kindred.</h1>
            <p className="text-2xl text-[#121212]/60 font-light mb-14 leading-relaxed italic px-4">Architecting shared depth through intentional space and AI insight.</p>
            <button onClick={() => setStep('auth')} className="w-full border border-black/20 py-6 rounded-full font-bold text-xs uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all heading-font shadow-xl">Initiate Space</button>
          </div>
        )}
        {step === 'auth' && (
          <div className="space-y-12">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">The Threshold.</h2>
                <p className="text-base text-black/40 italic mt-3">Enter your email to receive a magic link.</p>
             </div>
             <form onSubmit={handleAuth} className="space-y-10">
                {error && <p className="text-[#D44D85] text-xs font-bold uppercase text-center tracking-widest leading-relaxed px-4">{error}</p>}
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-black/10 py-6 outline-none text-2xl font-light focus:border-[#3D8C50] transition-all" required />
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95">
                  {loading ? 'Dispatching...' : 'Send Magic Link'}
                </button>
             </form>
             <p className="text-xs text-center text-black/20 px-8 leading-relaxed">No password required. We identify your soul through resonance.</p>
          </div>
        )}
        {step === 'link_sent' && (
          <div className="text-center animate-fade-in">
            <h2 className="text-clamp-5xl font-light mb-8">Link Dispatched.</h2>
            <p className="text-2xl text-[#121212]/60 font-light mb-12 leading-relaxed italic">Check your email. Once you click the link, your session will materialize here.</p>
            <div className="w-12 h-12 border-2 border-black/5 border-t-[#3D8C50] rounded-full animate-spin mx-auto mb-12" />
            <button onClick={() => setStep('auth')} className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 hover:text-black transition-colors">Mistyped your email?</button>
          </div>
        )}
        {step === 'profile' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">The Basics.</h2>
                <p className="text-base text-black/40 italic mt-3">Who is building this world?</p>
             </div>
             <div className="space-y-12">
               <input type="text" value={data.userName} onChange={(e) => setData({...data, userName: e.target.value})} className="w-full bg-transparent border-b border-black/10 text-4xl font-light py-6 focus:border-[#3D8C50] transition-all" placeholder="Your Name" />
               <input type="text" value={data.partnerName} onChange={(e) => setData({...data, partnerName: e.target.value})} className="w-full bg-transparent border-b border-black/10 text-4xl font-light py-6 focus:border-[#3D8C50] transition-all" placeholder="Partner Name" />
             </div>
             <button onClick={() => setStep('space_id')} disabled={!data.userName || !data.partnerName} className="w-full bg-black text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 transition-all shadow-xl">Continue</button>
           </div>
        )}
        {step === 'space_id' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">Space ID.</h2>
                <p className="text-base text-black/40 italic mt-3">Create or enter a shared code (e.g. TWIN24)</p>
             </div>
             <div className="space-y-12">
               <input type="text" value={data.partnerCode} onChange={(e) => setData({...data, partnerCode: e.target.value.toUpperCase()})} className="w-full bg-transparent border-b border-black/10 text-5xl font-mono text-center py-6 focus:border-[#3D8C50] transition-all uppercase tracking-tighter" placeholder="TWIN24" />
             </div>
             <p className="text-xs text-center text-black/30 px-6 italic">If your partner already created a space, enter their code here to synchronize.</p>
             <button onClick={() => setStep('assessment')} disabled={!data.partnerCode} className="w-full bg-black text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 transition-all shadow-xl">Lock Identity</button>
           </div>
        )}
        {step === 'assessment' && (
           <div className="space-y-8">
             <div className="text-center px-4">
                <h2 className="text-clamp-5xl font-light mb-2">Calibration.</h2>
                <p className="text-base italic text-black/40">Provide your individual perception of the current bond.</p>
             </div>
             <CalibrationMap assessment={assessment} />
             <div className="space-y-16 max-h-[45vh] overflow-y-auto pr-6 no-scrollbar pb-10">
               {assessmentGroups.map((group) => (
                 <div key={group.title} className="space-y-12">
                    <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-[#3D8C50] sticky top-0 bg-[#FDFCF0] py-4 z-10">{group.title}</h3>
                    {group.questions.map((q) => (
                        <div key={q.id} className="space-y-8">
                            <p className="text-xl italic text-black/90 font-light leading-snug">{q.q}</p>
                            <div className="space-y-4">
                                <input type="range" min="1" max="10" step="0.5" value={assessment[q.id]} onChange={(e) => setAssessment({...assessment, [q.id]: parseFloat(e.target.value)})} className="w-full h-[2px] bg-black/10 rounded-full appearance-none cursor-pointer accent-[#3D8C50]" />
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-black/30">
                                    <span>{q.low}</span>
                                    <span>{q.high}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               ))}
             </div>
             <div className="pt-6 border-t border-black/5">
                <button onClick={() => setStep('intentions')} className="w-full bg-[#3D8C50] text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-xl">Finalize Baseline</button>
             </div>
           </div>
        )}
        {step === 'intentions' && (
           <div className="space-y-14">
             <div className="text-center">
                <h2 className="text-clamp-5xl font-light">Focus Area.</h2>
                <p className="text-base italic text-black/40 mt-3">Where shall we direct the light?</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               {["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"].map(opt => (
                 <button key={opt} onClick={() => setData({...data, focusAreas: data.focusAreas.includes(opt) ? data.focusAreas.filter(f => f !== opt) : [...data.focusAreas, opt]})} className={`py-8 border rounded-[2.5rem] text-xs font-bold uppercase tracking-[0.2em] transition-all ${data.focusAreas.includes(opt) ? 'bg-[#3D8C50] text-white border-[#3D8C50]' : 'text-black/40 border-black/10 hover:border-black/20'}`}>
                    {opt}
                 </button>
               ))}
             </div>
             <button onClick={handleComplete} disabled={data.focusAreas.length === 0} className="w-full bg-black text-white py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 shadow-2xl">Initiate Kindred</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
