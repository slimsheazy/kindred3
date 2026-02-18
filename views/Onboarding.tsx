
import React, { useState, useMemo, useEffect } from 'react';
import { UserData } from '../types';
import { isSupabaseConfigured } from '../services/supabase';
import { cloudService } from '../services/cloudService';
import * as queries from '../lib/supabase/queries';
import { motion, AnimatePresence } from 'framer-motion';
import * as schemas from '../lib/schemas';

interface OnboardingProps { onComplete: (data: UserData) => void; }

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'profile' | 'assessment' | 'intentions' | 'recovering' | 'check_email'>('welcome');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserData>({
    id: '', userName: '', partnerName: '', yearsTogether: '', focusAreas: [],
    partnerCode: '', syncStatus: 'offline', theme: 'midnight'
  });
  const [assessment, setAssessment] = useState<Record<string, number>>({
    'c1': 5, 'c2': 5, 'i1': 5, 'i2': 5, 't1': 5, 't2': 5, 'n1': 5, 'n2': 5, 'v1': 5, 'v2': 5
  });

  useEffect(() => {
    if (isSupabaseConfigured) {
      queries.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setStep('recovering');
          cloudService.getProfile(session.user.id).then(p => p ? onComplete(p) : (setData(d => ({ ...d, id: session.user.id })), setStep('profile')));
        }
      });
    }
  }, [onComplete]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = schemas.EmailSchema.safeParse(email);
    if (!valid.success) { setError(valid.error.issues[0].message); return; }
    if (!isSupabaseConfigured) { setStep('profile'); return; }
    setLoading(true); setError(null);
    try {
      const { error: ae } = await queries.signInWithOtp(email);
      if (ae) throw ae;
      setStep('check_email');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const nextFromProfile = () => {
    const valid = schemas.OnboardingProfileSchema.safeParse(data);
    if (!valid.success) { setError(valid.error.issues[0].message); return; }
    setStep('assessment');
  };

  const finalize = async () => {
    const code = data.partnerCode || data.id;
    const finalScores = {
      'Communication': (assessment['c1'] + assessment['c2']) / 2,
      'Intimacy': (assessment['i1'] + assessment['i2']) / 2,
      'Trust': (assessment['t1'] + assessment['t2']) / 2,
      'Conflict': (assessment['n1'] + assessment['n2']) / 2,
      'Shared Vision': (assessment['v1'] + assessment['v2']) / 2,
    };
    await cloudService.initializeBondScores(code, finalScores);
    await cloudService.signUp({ ...data, syncStatus: 'synced' });
    onComplete({ ...data, syncStatus: 'synced' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md animate-fade-in-up">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div key="w" className="text-center">
              <h1 className="text-clamp-7xl font-light mb-8">Kindred.</h1>
              <div className="space-y-4">
                <button onClick={() => setStep('auth')} className="w-full border border-current py-6 rounded-full font-bold text-xs uppercase tracking-[0.4em] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all shadow-xl">Initiate Sync</button>
                <button onClick={() => setStep('profile')} className="w-full py-4 text-xs font-bold uppercase tracking-widest opacity-60">Continue Offline</button>
              </div>
            </motion.div>
          )}
          {step === 'auth' && (
            <form onSubmit={handleAuth} className="space-y-12">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-current text-3xl font-light py-6 text-center" placeholder="your@email.com" />
              {error && <p className="text-xs text-[var(--accent-pink)] text-center font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em]">{loading ? 'Sending...' : 'Send Magic Link'}</button>
              <button type="button" onClick={() => setStep('welcome')} className="w-full text-xs font-bold uppercase tracking-widest opacity-30 mt-4">Back</button>
            </form>
          )}
          {step === 'check_email' && (
            <motion.div key="ce" className="text-center space-y-8">
              <h2 className="text-clamp-5xl font-light">Check your email.</h2>
              <p className="text-xl opacity-60 font-light leading-relaxed">We sent a magic link to <span className="font-bold">{email}</span>. Click it to initiate your shared space.</p>
              <button onClick={() => setStep('auth')} className="text-xs font-bold uppercase tracking-widest opacity-30">Wrong email? Change it</button>
            </motion.div>
          )}
          {step === 'recovering' && (
            <motion.div key="r" className="text-center">
              <div className="w-16 h-16 border-2 border-current border-t-transparent rounded-full animate-spin mb-12 mx-auto opacity-20" />
              <h2 className="text-clamp-5xl font-light">Rehydrating.</h2>
            </motion.div>
          )}
          {step === 'profile' && (
            <div className="space-y-12">
              <input type="text" value={data.userName} onChange={(e) => setData({ ...data, userName: e.target.value })} className="w-full bg-transparent border-b border-current text-4xl font-light py-6" placeholder="Your Name" />
              <input type="text" value={data.partnerName} onChange={(e) => setData({ ...data, partnerName: e.target.value })} className="w-full bg-transparent border-b border-current text-4xl font-light py-6" placeholder="Partner Name" />
              <button onClick={nextFromProfile} className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em]">Continue</button>
            </div>
          )}
          {step === 'assessment' && (
            <div className="space-y-8">
              <p className="text-xl text-center opacity-60 font-light mb-8">Quickly assess your current bond levels...</p>
              <button onClick={() => setStep('intentions')} className="w-full bg-[var(--accent-green)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em]">Next</button>
            </div>
          )}
          {step === 'intentions' && (
            <div className="space-y-14">
              <button onClick={finalize} className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em]">Initiate Space</button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
