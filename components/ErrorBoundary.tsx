
import React, { ErrorInfo, ReactNode, Component } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
  // Explicitly add key to satisfy strict prop checks in some environments
  key?: string | number | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary: A protective layer for the Kindred experience.
 * Reverted to standard React.Component pattern to resolve property overwrite conflicts.
 * Explicitly declaring state and using named import for Component to ensure robust inheritance.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name } = this.props;
    console.group(`[Kindred Resilience Engine: ${name || 'System'}]`);
    console.error("Disturbance detected:", error);
    console.error("Trace:", errorInfo.componentStack);
    console.groupEnd();
  }

  private handleRecovery = () => {
    const { name } = this.props;
    if (name === 'Global Root') {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: undefined });
    }
  };

  public override render(): ReactNode {
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

    // Explicitly return null if no children to satisfy ReactNode requirements
    return children || null;
  }
}

export default ErrorBoundary;
