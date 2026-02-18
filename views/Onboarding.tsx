
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { isSupabaseConfigured } from '../services/supabase';
import { cloudService } from '../services/cloudService';
import * as queries from '../lib/supabase/queries';
import { motion, AnimatePresence } from 'framer-motion';
import * as schemas from '../lib/schemas';
import { sensoryService } from '../services/sensoryService';

interface OnboardingProps { onComplete: (data: UserData) => void; }

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'join_code' | 'profile' | 'assessment' | 'intentions' | 'recovering' | 'check_email'>('welcome');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [foundPartner, setFoundPartner] = useState<{ id: string, userName: string } | null>(null);
  
  const [data, setData] = useState<UserData>({
    id: '', userName: '', partnerName: '', yearsTogether: '', focusAreas: [],
    partnerCode: '', syncStatus: 'offline', theme: 'midnight'
  });
  
  const [assessment, setAssessment] = useState<Record<string, number>>({
    'c1': 5, 'c2': 5, // Communication
    'i1': 5, 'i2': 5, // Intimacy
    't1': 5, 't2': 5, // Trust
    'n1': 5, 'n2': 5, // Conflict
    'v1': 5, 'v2': 5  // Shared Vision
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

  const validateJoinCode = async () => {
    if (!partnerCodeInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const partner = await cloudService.getPartnerByCode(partnerCodeInput.trim());
      if (partner) {
        setFoundPartner(partner);
        setData(prev => ({ 
          ...prev, 
          partnerCode: partner.id, 
          partnerName: partner.userName 
        }));
        sensoryService.success();
        setStep('profile');
      } else {
        setError("Invite code not recognized.");
        sensoryService.shiver();
      }
    } catch (err) {
      setError("Sync failed.");
    } finally {
      setLoading(false);
    }
  };

  const nextFromProfile = () => {
    const valid = schemas.OnboardingProfileSchema.safeParse(data);
    if (!valid.success) { 
      setError(valid.error.issues[0].message); 
      sensoryService.shiver();
      return; 
    }
    setError(null);
    sensoryService.tap();
    setStep('assessment');
  };

  const finalize = async () => {
    setLoading(true);
    const code = data.partnerCode || data.id || Math.random().toString(36).substring(7);
    const finalScores = {
      'Communication': (assessment['c1'] + assessment['c2']) / 2,
      'Intimacy': (assessment['i1'] + assessment['i2']) / 2,
      'Trust': (assessment['t1'] + assessment['t2']) / 2,
      'Conflict': (assessment['n1'] + assessment['n2']) / 2,
      'Shared Vision': (assessment['v1'] + assessment['v2']) / 2,
    };
    
    const finalData = { ...data, id: data.id || `user_${Date.now()}`, partnerCode: code, syncStatus: 'synced' as const };
    
    try {
      if (!foundPartner) {
        // Only initialize scores if we are the creator
        await cloudService.initializeBondScores(code, finalScores);
      }
      await cloudService.signUp(finalData);
      sensoryService.success();
      onComplete(finalData);
    } catch (err) {
      setError("Failed to initialize space.");
    } finally {
      setLoading(false);
    }
  };

  const updateAssessment = (key: string, val: number) => {
    setAssessment(prev => ({ ...prev, [key]: val }));
    sensoryService.tap();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-primary)] overflow-y-auto text-[var(--text-primary)]">
      <div className="w-full max-w-md animate-fade-in-up py-12">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div key="w" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-clamp-7xl font-light mb-8">Kindred.</h1>
              <p className="text-xl opacity-60 italic mb-12">Architecting deeper connections.</p>
              <div className="space-y-4">
                <button onClick={() => { sensoryService.tap(); setStep('auth'); }} className="w-full border border-current py-6 rounded-full font-bold text-xs uppercase tracking-[0.4em] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all shadow-xl">Initiate Sync</button>
                <button onClick={() => { sensoryService.tap(); setStep('join_code'); }} className="w-full border border-current border-opacity-20 py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] opacity-80 hover:opacity-100 transition-all">Join Existing Space</button>
                <button onClick={() => { sensoryService.tap(); setStep('profile'); }} className="w-full py-4 text-xs font-bold uppercase tracking-widest opacity-60">Continue Offline</button>
              </div>
            </motion.div>
          )}
          
          {step === 'join_code' && (
            <motion.div key="jc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12 text-center">
              <div className="space-y-4">
                <h2 className="text-clamp-5xl font-light">Mirror.</h2>
                <p className="text-lg italic opacity-60 font-light">Enter the invite code from your partner's Space settings.</p>
              </div>
              <div className="space-y-6">
                <input 
                  type="text" 
                  value={partnerCodeInput} 
                  onChange={(e) => setPartnerCodeInput(e.target.value)} 
                  className="w-full bg-transparent border-b border-current text-3xl font-mono py-6 text-center focus:outline-none" 
                  placeholder="Code..." 
                />
                {error && <p className="text-xs text-[var(--accent-pink)] font-bold uppercase tracking-widest">{error}</p>}
                <button 
                  onClick={validateJoinCode}
                  disabled={loading || !partnerCodeInput.trim()}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] disabled:opacity-20 shadow-2xl"
                >
                  {loading ? 'Finding Space...' : 'Sync Space'}
                </button>
              </div>
              <button type="button" onClick={() => setStep('welcome')} className="text-xs font-bold uppercase tracking-widest opacity-30">Cancel</button>
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

          {step === 'profile' && (
            <div className="space-y-12">
              <h2 className="text-clamp-5xl font-light text-center">{foundPartner ? 'Presence.' : 'Identities.'}</h2>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest opacity-30">Your Presence</label>
                  <input type="text" value={data.userName} onChange={(e) => setData({ ...data, userName: e.target.value })} className="w-full bg-transparent border-b border-current text-4xl font-light py-4" placeholder="Your Name" />
                </div>
                {!foundPartner && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest opacity-30">Mirror Presence</label>
                    <input type="text" value={data.partnerName} onChange={(e) => setData({ ...data, partnerName: e.target.value })} className="w-full bg-transparent border-b border-current text-4xl font-light py-4" placeholder="Partner Name" />
                  </div>
                )}
                {foundPartner && (
                  <div className="p-6 bg-current/5 rounded-3xl border border-current border-opacity-5">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30 block mb-2">Syncing With</span>
                    <p className="text-2xl font-light italic">{foundPartner.userName}</p>
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-[var(--accent-pink)] text-center font-bold">{error}</p>}
              <button onClick={nextFromProfile} className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-xl">Calibrate Bond</button>
            </div>
          )}

          {step === 'assessment' && (
            <div className="space-y-10">
              <div className="text-center">
                <h2 className="text-clamp-4xl font-light mb-2">Equilibrium.</h2>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Assess your current shared state</p>
              </div>
              
              <div className="space-y-8">
                {[
                  { id: 'c', label: 'Communication Frequency' },
                  { id: 'i', label: 'Emotional Intimacy' },
                  { id: 't', label: 'Foundational Trust' },
                  { id: 'n', label: 'Conflict Resilience' },
                  { id: 'v', label: 'Vision Alignment' }
                ].map((cat) => (
                  <div key={cat.id} className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block">{cat.label}</label>
                    <input 
                      type="range" min="1" max="10" step="0.5" 
                      value={assessment[`${cat.id}1`]} 
                      onChange={(e) => updateAssessment(`${cat.id}1`, parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              <button onClick={() => { sensoryService.tap(); setStep('intentions'); }} className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-xl">Continue</button>
            </div>
          )}

          {step === 'intentions' && (
            <div className="space-y-12 text-center">
              <h2 className="text-clamp-5xl font-light">Threshold.</h2>
              <p className="text-xl italic opacity-60 leading-relaxed">
                You are about to initiate a shared space with {data.partnerName}. Are you ready to begin the architecture of your bond?
              </p>
              <button onClick={finalize} disabled={loading} className="w-full bg-[var(--accent-green)] text-[var(--bg-primary)] py-6 rounded-full font-bold text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95">
                {loading ? 'Initiating...' : 'Initiate Unified Space'}
              </button>
              <button onClick={() => setStep('assessment')} className="text-xs font-bold uppercase tracking-widest opacity-30">Back to calibration</button>
            </div>
          )}

          {step === 'check_email' && (
            <motion.div key="ce" className="text-center space-y-8">
              <h2 className="text-clamp-5xl font-light">Magic Link.</h2>
              <p className="text-xl opacity-60 font-light leading-relaxed">Check <span className="font-bold">{email}</span> to verify your presence.</p>
            </motion.div>
          )}

          {step === 'recovering' && (
            <motion.div key="r" className="text-center">
              <div className="w-16 h-16 border-2 border-current border-t-transparent rounded-full animate-spin mb-12 mx-auto opacity-20" />
              <h2 className="text-clamp-5xl font-light">Synchronizing...</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
