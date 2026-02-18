
import React, { Component, ErrorInfo, ReactNode } from 'react';

// Fix: ErrorBoundaryProps should not include 'key' as it's an internal React prop and doesn't appear in this.props.
interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary: A protective layer for the Kindred experience.
 * This class handles runtime errors in the component tree and offers recovery options.
 */
// Fix: Using React.Component explicitly helps resolve issues where named imports might not correctly provide instance types for state and props.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Properly initialize state in the constructor and ensure super(props) is called to establish the component instance.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Fix: componentDidCatch now correctly recognizes 'this.props' inherited from React.Component.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name } = this.props;
    console.group(`[Kindred Resilience Engine: ${name || 'System'}]`);
    console.error("Disturbance detected:", error);
    console.error("Trace:", errorInfo.componentStack);
    console.groupEnd();
  }

  // Fix: Arrow function property handleRecovery correctly accesses this.props and this.setState from the React.Component base class.
  private handleRecovery = () => {
    const { name } = this.props;
    if (name === 'Global Root') {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: undefined });
    }
  };

  // Fix: render method correctly destructures state and props from 'this' which are provided by the React.Component inheritance.
  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { fallback, name, children } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const isGlobal = name === 'Global Root';

      return (
        <div className={`flex flex-col items-center justify-center p-8 text-center animate-fade-in ${isGlobal ? 'fixed inset-0 z-[1000] bg-[var(--bg-primary)]' : 'min-h-[300px] py-20 bg-current/5 rounded-[3rem] border border-current border-opacity-5'}`}>
          <div className="relative mb-8">
            <div className="w-16 h-16 rounded-full border border-current border-opacity-10 flex items-center justify-center mx-auto">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-pink)] opacity-20 animate-pulse" />
            </div>
          </div>

          <div className="max-w-sm space-y-4">
            <h2 className="text-clamp-4xl font-light text-[var(--text-primary)]">Resonance Interrupted.</h2>
            <p className="text-sm italic font-light opacity-60 leading-relaxed px-4">
              The architecture of this vision has momentarily blurred. We are holding the space while the Oracle recalibrates.
            </p>
            
            <div className="pt-8 space-y-4 flex flex-col items-center">
              <button 
                onClick={this.handleRecovery}
                className="w-full max-w-xs py-5 bg-current text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl active:scale-95 transition-all heading-font"
              >
                {isGlobal ? 'Realign Connection' : 'Restore Fragment'}
              </button>
              
              {!isGlobal && (
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[9px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity border-b border-current pb-0.5 heading-font"
                >
                  System Reset
                </button>
              )}
            </div>

            <details className="mt-8 opacity-5 text-left cursor-help text-[8px] max-w-xs overflow-hidden">
                <summary className="font-bold tracking-widest list-none text-center">Technical Artifacts</summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono break-all p-2">
                    {error?.message}
                </pre>
            </details>
          </div>
        </div>
      );
    }

    return children || null;
  }
}

export default ErrorBoundary;
