
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
  motionPermission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  requestMotionAccess: () => Promise<void>;
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
  const [motionPermission, setMotionPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    // Map tilt to 0-100 range.
    // Gamma is side-to-side (-90 to 90)
    // Beta is front-to-back (-180 to 180)
    const x = Math.max(0, Math.min(100, (e.gamma + 45) * (100 / 90)));
    const y = Math.max(0, Math.min(100, (e.beta - 15) * (100 / 90)));
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  const requestMotionAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setMotionPermission('granted');
          window.addEventListener('deviceorientation', handleOrientation, { passive: true });
        } else {
          setMotionPermission('denied');
        }
      } catch (error) {
        console.error('Motion permission request failed', error);
        setMotionPermission('denied');
      }
    } else {
      // Non-iOS or older iOS
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      setMotionPermission('granted');
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Check if permission logic exists (iOS)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setMotionPermission('prompt');
    } else if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      setMotionPermission('granted');
    } else {
      setMotionPermission('unsupported');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleMouseMove, handleOrientation]);

  useEffect(() => {
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

  useEffect(() => {
    if (userData?.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [userData?.theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ 
        userData, 
        setUserData, 
        hasOnboarded, 
        setHasOnboarded, 
        isValidating, 
        motionPermission,
        requestMotionAccess
      }}>
        <ErrorBoundary name="App Infrastructure Shell">
          {children}
        </ErrorBoundary>
      </UserContext.Provider>
    </QueryClientProvider>
  );
};
