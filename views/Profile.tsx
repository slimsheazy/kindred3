
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { initializeGeminiContext } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { isSupabaseConfigured, updateSupabaseConfig, clearSupabaseConfig } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileProps {
  onReset: () => void;
  onThemeChange?: (theme: 'light' | 'midnight') => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset, onThemeChange }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isConfiguringCloud, setIsConfiguringCloud] = useState(false);
  
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [syncTimestamp, setSyncTimestamp] = useState<number>(Date.now());
  const [foundPartner, setFoundPartner] = useState<{ id: string, userName: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Cloud Config State
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('kindred_supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('kindred_supabase_key') || '');

  const vibes = [
    { label: 'Neutral', emoji: '⚪' },
    { label: 'Thinking of You', emoji: '💭' },
    { label: 'Deep Work', emoji: '🕯' },
    { label: 'Missing You', emoji: '🌊' },
    { label: 'Reflecting', emoji: '✨' },
    { label: 'Open to talk', emoji: '🌿' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
    }
    
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

  // Fix: Explicitly type newTheme to avoid string inference error when updating UserData
  const toggleTheme = () => {
    if (!userData) return;
    const newTheme: 'light' | 'midnight' = userData.theme === 'midnight' ? 'light' : 'midnight';
    const updated: UserData = { ...userData, theme: newTheme };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    if (onThemeChange) onThemeChange(newTheme);
    showMessage(`Resonance shifted to ${newTheme === 'midnight' ? 'Midnight' : 'Light'}`);
  };

  const copyCode = () => {
    if (userData?.id) {
      navigator.clipboard.writeText(userData.id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showMessage("Invite code copied to clipboard.");
    }
  };

  const setVibe = async (vibeLabel: string) => {
    if (!userData) return;
    await cloudService.updateVibe(userData.id, vibeLabel);
    const updated: UserData = { ...userData, vibe: vibeLabel };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    showMessage(`Vibe set to ${vibeLabel}`);
  };

  const handleCodeChange = async (val: string) => {
    setPartnerCodeInput(val);
    if (val.length > 5) {
        setIsSearching(true);
        const p = await cloudService.getPartnerByCode(val);
        setFoundPartner(p);
        setIsSearching(false);
    } else {
        setFoundPartner(null);
    }
  };

  const linkPartner = async () => {
    if (foundPartner && userData) {
        await cloudService.linkPartner(userData.id, foundPartner.id);
        const isMutual = await cloudService.checkMutualLink(userData.id, foundPartner.id);
        
        const updated: UserData = { ...userData, partnerCode: foundPartner.id };
        setUserData(updated);
        localStorage.setItem('kindred_user_data', JSON.stringify(updated));
        
        if (isMutual) {
            localStorage.setItem('kindred_fusion_pending', 'true');
        }

        initializeGeminiContext(updated);
        setIsLinking(false);
        showMessage("Handshake initiated.");
        window.location.reload();
    }
  };

  const handleSaveCloudConfig = () => {
    if (dbUrl.trim() && dbKey.trim()) {
      updateSupabaseConfig(dbUrl.trim(), dbKey.trim());
    }
  };

  const handleDisconnectCloud = () => {
    if (window.confirm("Switch back to local-only mode?")) {
      clearSupabaseConfig();
    }
  };

  const handleLogout = () => {
    if (window.confirm("Disconnecting will clear the local session. Proceed?")) {
        onReset();
    }
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in relative transition-colors duration-700">
       <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Space.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Global Synchronization</p>
      </header>
      
      <div className="flex flex-col items-center mb-16">
        <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-[#D44D85]/10 to-[#3D8C50]/10 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm mb-8 relative group">
            <span className="text-5xl font-light tracking-tighter">{getInitials()}</span>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-current ${isSupabaseConfigured ? 'bg-[#3D8C50] animate-pulse' : 'bg-black/10'}`} title={isSupabaseConfigured ? "Cloud Active" : "Local Only"} />
        </div>
        
        <h2 className="text-clamp-4xl font-light">
            {userData ? `${userData.userName} & ${userData.partnerName}` : 'Your Connection'}
        </h2>
        
        <div className="mt-10 flex flex-col items-center gap-8 w-full">
            <div className="text-center">
              <span className="text-xs font-bold opacity-30 uppercase tracking-[0.3em] block mb-3 heading-font">Synchronized Under</span>
              <span className="text-base font-mono font-bold tracking-widest bg-black/5 dark:bg-white/5 px-8 py-4 rounded-full border border-black/5 dark:border-white/5 shadow-inner">
                  {userData?.partnerCode || 'Individual Space'}
              </span>
            </div>

            <div className="flex gap-6">
              <button 
                  onClick={() => setIsLinking(true)}
                  className="text-xs font-bold text-[#3D8C50] dark:text-[#A8FFB5] uppercase tracking-[0.2em] border-b border-current pb-2 heading-font"
              >
                Merge with Partner
              </button>
              <button 
                  onClick={toggleTheme}
                  className="text-xs font-bold opacity-40 uppercase tracking-[0.2em] border-b border-current pb-2 heading-font"
              >
                {userData?.theme === 'midnight' ? 'Shift to Light' : 'Shift to Midnight'}
              </button>
            </div>
        </div>
      </div>

      <div className="mb-16">
          <span className="text-xs font-bold uppercase tracking-widest opacity-30 mb-8 block heading-font text-center">Set Your Vibe</span>
          <div className="grid grid-cols-3 gap-4">
              {vibes.map(v => (
                  <button 
                    key={v.label}
                    onClick={() => setVibe(v.label)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all ${userData?.vibe === v.label ? 'border-[#3D8C50] dark:border-[#A8FFB5] bg-current/10' : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'}`}
                  >
                      <span className="text-2xl">{v.emoji}</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest opacity-60 text-center leading-tight">{v.label}</span>
                  </button>
              ))}
          </div>
      </div>

      <div className="mb-24 space-y-8 p-12 bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[3.5rem] shadow-inner">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 block heading-font">Your Invite Code</span>
            <button onClick={copyCode} className="w-full flex justify-between items-center py-5 px-8 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5">
                <span className="font-mono text-sm font-bold tracking-wider">{userData?.id}</span>
                <span className="text-xs font-bold uppercase opacity-40">{copySuccess ? 'Copied' : 'Copy'}</span>
            </button>
            <p className="text-sm opacity-30 mt-6 leading-relaxed">Give this code to your partner. When they enter it in their "Merge" settings, your spaces will synchronize in real-time.</p>
          </div>
      </div>

      <AnimatePresence>
        {activeMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 bg-[#121212] dark:bg-[#FDFCF0] text-[#FDFCF0] dark:text-[#121212] px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest z-[200] shadow-2xl text-center heading-font"
          >
              {activeMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 pt-16 border-t border-black/10 dark:border-white/10">
          <button 
              onClick={handleLogout}
              className="w-full border border-black/20 dark:border-white/20 font-bold py-7 rounded-full hover:bg-current hover:text-black dark:hover:text-[#121212] transition-all text-xs tracking-[0.2em] uppercase heading-font shadow-sm"
          >
              Disconnect Local Session
          </button>
          <div className="flex justify-center items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-[#3D8C50] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[11px] opacity-30 font-bold uppercase tracking-widest heading-font">
                {isSupabaseConfigured ? `Engine Active — Heartbeat ${new Date(syncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local Engine Only'}
            </span>
          </div>
      </div>
    </div>
  );
};

export default Profile;
