
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "rounded-full font-bold uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-20 heading-font";
  
  const variants = {
    primary: "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xl hover:opacity-90",
    secondary: "bg-[var(--accent-green)] text-[var(--bg-primary)] shadow-lg hover:opacity-90",
    outline: "border border-current opacity-60 hover:opacity-100",
    ghost: "opacity-40 hover:opacity-100"
  };

  const sizes = {
    sm: "px-6 py-2 text-[9px]",
    md: "px-8 py-4 text-[10px]",
    lg: "px-10 py-5 text-xs",
    xl: "px-12 py-6 text-xs tracking-[0.3em]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
