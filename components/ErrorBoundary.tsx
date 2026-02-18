
import React, { Component, ErrorInfo, ReactNode } from 'react';

// Fix: Define Props interface without reserved 'key' prop to avoid conflicts with React internals.
interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary: A protective layer for the Kindred experience.
 */
// Fix: Use standard Component extension and explicit typing for state and props to resolve 'Property props does not exist' errors.
class ErrorBoundary extends Component<Props, State> {
  // Fix: Explicitly declare state on the class to ensure it's recognized by the compiler as a property of the component.
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fix: Access props from the class instance using this.props, which is inherited from Component.
    const { name } = this.props;
    console.group(`[Kindred Resilience Engine: ${name || 'System'}]`);
    console.error("Disturbance detected:", error);
    console.error("Trace:", errorInfo.componentStack);
    console.groupEnd();
  }

  private handleRecovery = () => {
    // Fix: Access props from the class instance using this.props in the arrow function.
    const { name } = this.props;
    if (name === 'Global Root') {
      window.location.reload();
    } else {
      // Fix: Use this.setState inherited from Component to reset the boundary state.
      this.setState({ hasError: false, error: undefined });
    }
  };

  public render() {
    // Fix: Destructure state and props from 'this' to correctly access inherited members.
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

    // Fix: Correctly return children prop from the render method.
    return children || null;
  }
}

export default ErrorBoundary;
