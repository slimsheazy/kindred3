import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const syncState = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Sensory Engine: Mouse & Tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta && e.gamma) {
        const x = ((e.gamma + 45) / 90) * 100;
        const y = ((e.beta + 45) / 90) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const onboarded = localStorage.getItem('kindred_has_onboarded') === 'true';
      const savedData = localStorage.getItem('kindred_user_data');
      
      if (session && savedData) {
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        initializeGeminiContext(parsed);
        setHasOnboarded(true);

        if (parsed.partnerCode) {
           cloudService.subscribeToPartnerSpace(parsed.partnerCode, syncState);
        }
      } else if (onboarded && savedData) {
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        setHasOnboarded(true);
      } else {
        setHasOnboarded(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('kindred_user_data');
        localStorage.removeItem('kindred_has_onboarded');
        setUserData(null);
        setHasOnboarded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncState]);

  // Apply Theme Class
  useEffect(() => {
    // If user explicitly chooses 'light', we apply the class. Default is Midnight.
    if (userData?.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [userData?.theme]);

  const handleOnboardingComplete = useCallback((data: UserData) => {
    setUserData(data);
    initializeGeminiContext(data);
    setHasOnboarded(true);
    localStorage.setItem('kindred_user_data', JSON.stringify(data));
    localStorage.setItem('kindred_has_onboarded', 'true');
    cloudService.signUp(data);
  }, []);

  const handleReset = useCallback(async () => {
    const confirmReset = window.confirm("Are you sure? This will sign you out of Kindred.");
    if (confirmReset) {
      await supabase.auth.signOut();
      localStorage.removeItem('kindred_user_data');
      localStorage.removeItem('kindred_has_onboarded');
      window.location.reload();
    }
  }, []);

  const viewContent = useMemo(() => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard key={refreshTrigger} userData={userData} onNavigate={setCurrentView} />;
      case View.Activities:
        return <ActivitiesView key={refreshTrigger} />;
      case View.Journal:
        return <Journal key={refreshTrigger} />;
      case View.Quiz:
        return <Quiz key={refreshTrigger} />;
      case View.Goals:
        return <Goals key={refreshTrigger} />;
      case View.EsotericLens:
        return <EsotericLens key={refreshTrigger} />;
      case View.Profile:
        return <Profile onReset={handleReset} onThemeChange={(t) => setUserData(prev => prev ? {...prev, theme: t} : null)} />;
      case View.Mediation:
        return <ConflictNavigator userData={userData} onClose={() => setCurrentView(View.Dashboard)} />;
      default:
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  }, [currentView, userData, handleReset, refreshTrigger]);

  if (hasOnboarded === null) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-8 h-8 border-2 border-white/10 border-t-[#A8FFB5] rounded-full animate-spin" />
    </div>
  );

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col max-w-lg mx-auto overflow-x-hidden transition-colors duration-700">
      <main className="flex-grow pb-32 pt-4 px-4 animate-fade-in">
        {viewContent}
      </main>
      {currentView !== View.Mediation && (
        <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      )}
    </div>
  );
};

export default App;