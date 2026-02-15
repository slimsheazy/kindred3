
import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 relative group`}
    >
      <span className={`text-[9px] font-bold uppercase tracking-[0.05em] heading-font transition-colors duration-500 ${isActive ? 'text-current' : 'opacity-40'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 bg-[#3D8C50] dark:bg-[#A8FFB5] rounded-full animate-fade-in shadow-[0_0_8px_rgba(61,140,80,0.5)]"></div>
      )}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home' },
    { view: View.Journal, label: 'Echoes' },
    { view: View.EsotericLens, label: 'Lens' },
    { view: View.Activities, label: 'Actions' },
    { view: View.Goals, label: 'Intent' },
    { view: View.Profile, label: 'Space' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="flex justify-around items-center w-full max-w-md bg-black/5 dark:bg-white/5 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-full px-2 h-14 shadow-2xl">
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

export default BottomNav;
