
import React from 'react';

interface NavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    className="flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 relative group flex-1"
  >
    <span className={`text-[9px] font-bold uppercase tracking-[0.05em] heading-font transition-colors duration-500 ${isActive ? 'text-current' : 'opacity-70 hover:opacity-100'}`}>
      {label}
    </span>
    {isActive && (
      <div className="absolute -bottom-1 w-1 h-1 bg-[var(--accent-green)] rounded-full animate-fade-in shadow-[0_0_8px_rgba(var(--accent-green-rgb),0.5)]" />
    )}
  </button>
);
