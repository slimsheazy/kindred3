
import React, { useState, Suspense, lazy } from 'react';
import { View, UserData } from './types';
import { BottomNav } from './components/organisms/BottomNav';
import { AppProviders, useUser } from './components/AppProviders';
import { sensoryService } from './services/sensoryService';
import ErrorBoundary from './components/ErrorBoundary';

// LAZY LOAD VIEWS
const Dashboard = lazy(() => import('./views/Dashboard'));
const ActivitiesView = lazy(() => import('./views/Activities'));
const Goals = lazy(() => import('./views/Goals'));
const Profile = lazy(() => import('./views/Profile'));
const Quiz = lazy(() => import('./views/Quiz'));
const Rituals = lazy(() => import('./views/Rituals'));
const SalsaDeck = lazy(() => import('./views/SalsaDeck'));
const EmotionWheel = lazy(() => import('./views/EmotionWheel'));
const Workbook = lazy(() => import('./views/Workbook'));
const Onboarding = lazy(() => import('./views/Onboarding'));

const SafetyShield: React.FC = () => {
  const [isShielded, setIsShielded] = useState(false);
  
  const toggleShield = () => {
    sensoryService.tap();
    setIsShielded(!isShielded);
  };

  const emergencyExit = () => {
    window.location.href = "https://www.google.com/news";
  };

  return (
    <>
      <button 
        onClick={toggleShield}
        className="fixed top-6 right-6 z-[1000] w-10 h-10 rounded-full border border-current border-opacity-10 bg-[var(--bg-primary)] flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity"
        title="Privacy Shield"
      >
        <span className="text-xs">{isShielded ? '◈' : '◇'}</span>
      </button>

      {isShielded && (
        <div className="fixed inset-0 z-[999] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <h2 className="text-clamp-4xl font-light mb-8">Discretion Active.</h2>
          <div className="space-y-6 w-full max-w-xs">
            <button 
              onClick={toggleShield}
              className="w-full py-5 border border-current rounded-full text-[10px] font-bold uppercase tracking-widest"
            >
              Resume Presence
            </button>
            <button 
              onClick={emergencyExit}
              className="w-full py-5 bg-[var(--accent-pink)] text-black rounded-full text-[10px] font-bold uppercase tracking-widest"
            >
              Emergency Exit
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const { userData, setUserData, hasOnboarded, setHasOnboarded, isValidating } = useUser();

  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data);
    setHasOnboarded(true);
    sensoryService.success();
  };

  const LoadingScreen = ({ message = "Realigning." }) => (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 border-2 border-current border-t-transparent rounded-full animate-spin mb-12 opacity-20" />
      <h2 className="text-clamp-5xl font-light text-[var(--text-primary)] tracking-tighter">{message}</h2>
    </div>
  );

  if (isValidating) return <LoadingScreen />;

  if (!hasOnboarded) {
    return (
      <Suspense fallback={<LoadingScreen message="Preparing your journey." />}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case View.Dashboard: return <Dashboard userData={userData} onNavigate={setCurrentView} />;
      case View.Activities: return <ActivitiesView onNavigate={setCurrentView} />;
      case View.Goals: return <Goals />;
      case View.Quiz: return <Quiz />;
      case View.Rituals: return <Rituals />;
      case View.SalsaDeck: return <SalsaDeck onBack={() => setCurrentView(View.Activities)} />;
      case View.EmotionWheel: return <EmotionWheel onBack={() => setCurrentView(View.Activities)} />;
      case View.Workbook: return <Workbook />;
      case View.Profile: return (
        <Profile 
          onReset={() => setHasOnboarded(false)} 
          onThemeChange={(t) => setUserData(p => p ? {...p, theme: t} : null)} 
        />
      );
      default: return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen relative bg-[var(--bg-primary)]" role="main">
      <SafetyShield />
      <main className="pb-32 overflow-x-hidden">
        <ErrorBoundary name={`View: ${currentView}`} key={currentView}>
          <Suspense fallback={<LoadingScreen message="Syncing..." />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </main>
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};

export const App: React.FC = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);
