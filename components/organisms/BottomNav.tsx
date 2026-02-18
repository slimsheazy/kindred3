
import React from 'react';
import { View } from '../../types';
import { NavItem } from '../molecules/NavItem';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home' },
    { view: View.Activities, label: 'Actions' },
    { view: View.Workbook, label: 'Workbook' },
    { view: View.Quiz, label: 'Echoes' },
    { view: View.Rituals, label: 'Rituals' },
    { view: View.Profile, label: 'Space' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="flex justify-around items-center w-full max-w-2xl bg-black/5 dark:bg-white/5 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-full px-4 h-14 shadow-2xl">
        {navItems.map((item) => (
          <NavItem 
            key={item.view} 
            label={item.label} 
            isActive={currentView === item.view} 
            onClick={() => setCurrentView(item.view)} 
          />
        ))}
      </nav>
    </div>
  );
};
