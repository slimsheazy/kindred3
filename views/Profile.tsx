import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { cloudService } from '../services/cloudService';
import { isSupabaseConfigured } from '../services/supabase';
import { NotificationService } from '../services/notificationService';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
import * as queries from '../lib/supabase/queries';
import { useUser } from '../components/AppProviders';
import { sensoryService } from '../services/sensoryService';

// Fix: Cast motion to any to resolve environment-specific type errors with motion component props
const motion = motionBase as any;

interface ProfileProps {
  onReset: () => void;
  onThemeChange?: (theme: 'light' | 'midnight') => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset, onThemeChange }) => {
  const { userData, setUserData, motionPermission, requestMotionAccess } = useUser();
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(NotificationService.getPermissionStatus());
  
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [syncTimestamp, setSyncTimestamp] = useState<number>(Date.now());
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The 'Space ID' is the partnerCode, which partitions all shared data (goals, scores, journals).
  const spaceId = userData?.partnerCode || userData?.id;

  const vibes = [
    { label: 'Neutral', emoji: '⚪' },
    { label: 'Thinking of You', emoji: '💭' },
    { label: 'Deep Work', emoji: '🕯' },
    { label: 'Missing You', emoji: '🌊' },
    { label: 'Reflecting', emoji: '✨' },
    { label: 'Open to talk', emoji: '🌿' }
  ];

  useEffect(() => {
    const interval = setInterval(() => setSyncTimestamp(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = () => {
      if (!userData) return 'K';
      return `${userData.userName[0] || 'U'}${userData.partnerName[0] || 'P'}`.toUpperCase();
  };

  const showMessage = (msg: string) => {
    setActiveMessage(msg);
    setTimeout(() => setActiveMessage(null), 3000);
  };

  const toggleTheme = () => {
    if (!userData) return;
    const newTheme: 'light' | 'midnight' = userData.theme === 'light' ? 'midnight' : 'light';
    const updated: UserData = { ...userData, theme: newTheme };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    if (onThemeChange) onThemeChange(newTheme);
    showMessage(`Resonance shifted to ${newTheme === 'midnight' ? 'Midnight' : 'Light'}`);
  };

  const copyCode = () => {
    if (spaceId) {
      navigator.clipboard.writeText(spaceId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showMessage("Space Identity copied to clipboard.");
    }
  };

  const shareInvite = async () => {
    if (!userData || !spaceId) return;
    const shareData = {
      title: 'Join my Space on Kindred',
      text: `Connect with me on Kindred. Use this Space Identity to sync our connection: ${spaceId}`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyCode();
      }
    } catch (err) {
      console.error('Error sharing', err);
    }
  };

  const handleMerge = async () => {
    if (!partnerCodeInput.trim() || !userData) return;
    setIsSearching(true);
    setError(null);
    try {
      const partner = await cloudService.getPartnerByCode(partnerCodeInput.trim());
      if (partner) {
        sensoryService.success();
        // Linking establishes the shared partnerCode in the DB
        await cloudService.linkPartner(userData.id, partner.id);
        const updated: UserData = { 
          ...userData, 
          partnerCode: partner.id, 
          partnerName: partner.userName 
        };
        setUserData(updated);
        localStorage.setItem('kindred_user_data', JSON.stringify(updated));
        setIsLinking(false);
        showMessage(`Merged with ${partner.userName}'s Space.`);
      } else {
        setError("Space not found. Ensure the code is correct.");
        sensoryService.shiver();
      }
    } catch (err) {
      setError("Linking failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const enableNotifications = async () => {
    const permission = await NotificationService.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showMessage("Notifications enabled.");
    } else {
      showMessage("Permission denied.");
    }
  };

  const handleMotionRequest = async () => {
    await requestMotionAccess();
    showMessage("Motion sensors calibrated.");
  };

  const setVibe = async (vibeLabel: string) => {
    if (!userData) return;
    await cloudService.updateVibe(userData.id, vibeLabel);
    const updated: UserData = { ...userData, vibe: vibeLabel };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    showMessage(`Vibe set to ${vibeLabel}`);
  };

  const handleLogout = async () => {
    if (window.confirm("Disconnecting will clear the session. Proceed?")) {
        if (isSupabaseConfigured) {
          await queries.signOut();
        }
        onReset();
    }
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in relative transition-colors duration-700 text-[var(--text-primary)]">
       <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Space.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Global Synchronization</p>
      </header>
      
      <div className="flex flex-col items-center mb-16">
        <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-[#FF85B3]/10 to-[#A8FFB5]/10 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm mb-8 relative group">
            <span className="text-5xl font-light tracking-tighter">{getInitials()}</span>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-current ${isSupabaseConfigured ? 'bg-[#A8FFB5] animate-pulse' : 'bg-black/10'}`} title={isSupabaseConfigured ? "Cloud Active" : "Local Only"} />
        </div>
        
        <h2 className="text-clamp-4xl font-light">
            {userData ? `${userData.userName} & ${userData.partnerName}` : 'Your Connection'}
        </h2>
        
        <div className="mt-10 flex flex-col items-center gap-8 w-full">
            <div className="text-center w-full max-w-sm">
              <span className="text-xs font-bold opacity-30 uppercase tracking-[0.3em] block mb-3 heading-font">Space Identity</span>
              <button 
                onClick={copyCode}
                className="w-full flex flex-col items-center gap-2 p-6 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-inner group hover:bg-black/10 transition-all"
              >
                  <span className="text-lg font-mono font-bold tracking-widest block">
                      {spaceId}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 group-hover:opacity-60 transition-opacity">
                    {copySuccess ? 'Copied' : 'Tap to Copy Invite Code'}
                  </span>
              </button>
              <p className="text-[10px] opacity-20 mt-4 leading-relaxed uppercase tracking-wider font-bold">Share this code with your partner to synchronize your worlds.</p>
            </div>

            <div className="flex gap-6">
              {(!userData?.partnerCode || userData.partnerCode === userData.id) && (
                <button 
                    onClick={() => setIsLinking(true)}
                    className="text-xs font-bold text-[#A8FFB5] uppercase tracking-[0.2em] border-b border-current box-border pb-2 heading-font"
                >
                  Merge Existing Space
                </button>
              )}
              <button 
                  onClick={toggleTheme}
                  className="text-xs font-bold opacity-40 uppercase tracking-[0.2em] border-b border-current box-border pb-2 heading-font"
              >
                {userData?.theme === 'light' ? 'Shift to Midnight' : 'Shift to Light'}
              </button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isLinking && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-16 p-10 bg-current/2 border border-current border-opacity-5 rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <h3 className="text-2xl font-light mb-6">Enter Partner's Code</h3>
            <div className="flex flex-col gap-6">
              <input 
                type="text" 
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                placeholder="Paste Space ID here..."
                className="w-full bg-transparent border-b border-current border-opacity-20 py-4 text-xl font-mono focus:outline-none focus:border-opacity-100 transition-all"
              />
              {error && <p className="text-xs text-[var(--accent-pink)] font-bold uppercase tracking-widest">{error}</p>}
              <div className="flex gap-4">
                <button 
                  onClick={handleMerge}
                  disabled={isSearching || !partnerCodeInput.trim()}
                  className="flex-grow py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-20"
                >
                  {isSearching ? 'Syncing...' : 'Synchronize'}
                </button>
                <button 
                  onClick={() => setIsLinking(false)}
                  className="px-8 py-5 border border-current border-opacity-10 rounded-2xl text-[10px] font-bold uppercase tracking-widest opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-16">
          <span className="text-xs font-bold uppercase tracking-widest opacity-30 mb-8 block heading-font text-center">Set Your Vibe</span>
          <div className="grid grid-cols-3 gap-4">
              {vibes.map(v => (
                  <button 
                    key={v.label}
                    onClick={() => setVibe(v.label)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all ${userData?.vibe === v.label ? 'border-[#A8FFB5] bg-current/10' : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'}`}
                  >
                      <span className="text-2xl">{v.emoji}</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest opacity-60 text-center leading-tight">{v.label}</span>
                  </button>
              ))}
          </div>
      </div>

      <div className="mb-16 space-y-8 p-12 bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[3.5rem] shadow-inner">
          <div className="space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 block heading-font">Global Sharing</span>
              <button 
                onClick={shareInvite} 
                className="w-full py-6 px-8 bg-[var(--accent-green)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-widest shadow-xl transition-all heading-font active:scale-95"
              >
                Share Invitation
              </button>
            </div>

            <div className="pt-8 border-t border-current border-opacity-5">
              <span className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 block heading-font">Environment Logic</span>
              <div className="space-y-4">
                <button 
                  onClick={enableNotifications}
                  className="w-full py-5 px-8 border border-current border-opacity-10 rounded-2xl flex justify-between items-center hover:bg-current hover:bg-opacity-5 transition-all"
                >
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Push Notifications</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${notificationPermission === 'granted' ? 'text-[var(--accent-green)]' : 'opacity-20'}`}>
                    {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                  </span>
                </button>
                
                {motionPermission !== 'granted' && motionPermission !== 'unsupported' && (
                  <button 
                    onClick={handleMotionRequest}
                    className="w-full py-5 px-8 border border-current border-opacity-10 rounded-2xl flex justify-between items-center hover:bg-current hover:bg-opacity-5 transition-all animate-pulse"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60 text-left pr-4">Enable Flashlight Tilt (iOS)</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-20">Activate</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] opacity-20 mt-4 leading-relaxed uppercase tracking-wider font-bold text-center">Tilt and notification settings refine your presence.</p>
            </div>
          </div>
      </div>

      <AnimatePresence>
        {activeMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 bg-[#FDFCF0] text-[#121212] px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest z-[200] shadow-2xl text-center heading-font"
          >
              {activeMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 pt-16 border-t border-black/10 dark:border-white/10">
          <button 
              onClick={handleLogout}
              className="w-full border border-black/20 dark:border-white/20 font-bold py-7 rounded-full hover:bg-current hover:text-[var(--bg-primary)] transition-all text-xs tracking-[0.2em] uppercase heading-font shadow-sm"
          >
              Disconnect Session
          </button>
          <div className="flex justify-center items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-[#A8FFB5] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[11px] opacity-30 font-bold uppercase tracking-widest heading-font">
                {isSupabaseConfigured ? `Engine Active — Heartbeat ${new Date(syncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local Engine Only'}
            </span>
          </div>
      </div>
    </div>
  );
};

export default Profile;