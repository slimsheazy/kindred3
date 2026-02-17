import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import ActivitiesView from './views/Activities';
import Journal from './views/Journal';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Quiz from './views/Quiz';
import Onboarding from './views/Onboarding';
import EsotericLens from './views/EsotericLens';
import ConflictNavigator from './components/ConflictNavigator';
import { initializeGeminiContext } from './services/geminiService';
import { cloudService } from './services/cloudService';
import { NotificationService } from './services/notificationService';
import { supabase, isSupabaseConfigured } from './services/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showMediation, setShowMediation] = useState(false);
  const lastSyncRef = useRef<number>(Date.now());

  const syncState = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    
    if (userData && (document.visibilityState === 'hidden' || (window.navigator as any).standalone)) {
      const now = Date.now();
      if (now - lastSyncRef.current > 10000) {
        NotificationService.showNotification('Kindred Update', {
          body: `Activity detected in your shared space with ${userData.partnerName}.`,
          tag: 'sync-update'
        });
        lastSyncRef.current = now;
      }
    }
  }, [userData]);

  // Load user data on mount with Cloud Recovery
  useEffect(() => {
    const initApp = async () => {
      // 1. Check local storage first
      const saved = localStorage.getItem('kindred_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
        setHasOnboarded(true);
        initializeGeminiContext(parsed);
        return;
      }

      // 2. Fallback: Check for Supabase session (Recovery from Magic Link)
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await cloudService.getProfile(session.user.id);
          if (profile) {
            localStorage.setItem('kindred_user_data', JSON.stringify(profile));
            setUserData(profile);
            setHasOnboarded(true);
            initializeGeminiContext(profile);
            return;
          }
        }
      }

      setHasOnboarded(false);
    };

    initApp();
  }, [refreshTrigger]);

  // Theme synchronization with index.html body classes
  useEffect(() => {
    if (userData?.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [userData?.theme]);

  // Sensory Engine: Mouse Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Subscribe to partner space updates
  useEffect(() => {
    if (userData?.partnerCode) {
      return cloudService.subscribeToPartnerSpace(userData.partnerCode, syncState);
    }
  }, [userData?.partnerCode, syncState]);

  const handleOnboardingComplete = (data: UserData) => {
    localStorage.setItem('kindred_user_data', JSON.stringify(data));
    setUserData(data);
    setHasOnboarded(true);
    initializeGeminiContext(data);
  };

  const handleReset = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('kindred_user_data');
    setHasOnboarded(false);
    setUserData(null);
    document.body.classList.remove('light-mode');
  };

  const renderView = () => {
    if (showMediation) return <ConflictNavigator userData={userData} onClose={() => setShowMediation(false)} />;
    
    switch (currentView) {
      case View.Dashboard: return <Dashboard userData={userData} onNavigate={setCurrentView} />;
      case View.Journal: return <Journal />;
      case View.Activities: return <ActivitiesView />;
      case View.Goals: return <Goals />;
      case View.Profile: return <Profile onReset={handleReset} onThemeChange={(t) => setUserData(prev => prev ? {...prev, theme: t} : null)} />;
      case View.Quiz: return <Quiz />;
      case View.EsotericLens: return <EsotericLens />;
      default: return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  };

  if (hasOnboarded === null) return null;
  if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen transition-colors duration-1000 relative">
      <main className="pb-32">
        {renderView()}
      </main>
      
      {currentView === View.Dashboard && !showMediation && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]">
              <button 
                  onClick={() => setShowMediation(true)}
                  className="px-8 py-3 bg-[var(--accent-pink)] text-[var(--bg-primary)] rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all heading-font"
              >
                  Initiate Mediation
              </button>
          </div>
      )}
      
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};

export default App;