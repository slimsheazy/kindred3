
import React, { useState, useEffect, createContext, useContext } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { UserData } from '../types';
import { syncService } from '../services/sync';
import { isSupabaseConfigured } from '../services/supabase';
import * as queries from '../lib/supabase/queries';
import ErrorBoundary from './ErrorBoundary';

interface UserContextType {
  userData: UserData | null;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  hasOnboarded: boolean | null;
  setHasOnboarded: React.Dispatch<React.SetStateAction<boolean | null>>;
  isValidating: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Interaction Logic: Mouse & Tilt Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      
      // Gamma (left/right tilt): -90 to 90. Map a "natural" range of -30..30 to 0..100%
      const x = Math.max(0, Math.min(100, (e.gamma + 30) * (100 / 60)));
      // Beta (front/back tilt): -180 to 180. Map -30..30 to 0..100%
      const y = Math.max(0, Math.min(100, (e.beta + 30) * (100 / 60)));
      
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Check if DeviceOrientation needs permission (iOS)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // In a real production app, we'd trigger this via a button click
      // but for this preview environment we'll just attempt it.
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true });
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  useEffect(() => {
    // Initial hydration and session sync
    const initApp = async () => {
      try {
        const rehydrated = await syncService.verifyAndSyncSession();
        if (rehydrated) {
          setUserData(rehydrated);
          setHasOnboarded(true);
        } else {
          const saved = localStorage.getItem('kindred_user_data');
          if (saved) {
            setUserData(JSON.parse(saved));
            setHasOnboarded(true);
          } else {
            setHasOnboarded(false);
          }
        }
      } catch (error) {
        console.error("Initialization error", error);
        setHasOnboarded(false);
      } finally {
        setIsValidating(false);
      }
    };

    initApp();

    // Setup Auth Listeners
    if (isSupabaseConfigured) {
      const authListener = queries.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await syncService.getProfile(session.user.id);
          if (profile) {
            setUserData(profile);
            setHasOnboarded(true);
            localStorage.setItem('kindred_user_data', JSON.stringify(profile));
          }
        } else if (event === 'SIGNED_OUT') {
          setUserData(null);
          setHasOnboarded(false);
          localStorage.removeItem('kindred_user_data');
          queryClient.clear();
        }
      });

      return () => {
        if (authListener?.data?.subscription) {
          authListener.data.subscription.unsubscribe();
        }
      };
    }
  }, []);

  // Theme Synchronizer
  useEffect(() => {
    if (userData?.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [userData?.theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ userData, setUserData, hasOnboarded, setHasOnboarded, isValidating }}>
        <ErrorBoundary name="App Infrastructure Shell">
          {children}
        </ErrorBoundary>
      </UserContext.Provider>
    </QueryClientProvider>
  );
};
