// @ts-nocheck
// ErrorBoundary requires class components; ts-nocheck used due to
// useDefineForClassFields conflict with React.Component inheritance
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-washa-bg text-washa-text flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-washa-surface border border-washa-border rounded-3xl p-10 text-center space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-serif text-washa-gold">حدث خطأ غير متوقع</h2>
                <p className="text-washa-text-sec text-sm leading-relaxed">
                  نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
                </p>
              </div>

              {this.state.error && (
                <div className="bg-washa-bg/80 rounded-lg p-3 text-xs text-washa-text-faint font-mono text-left overflow-auto max-h-24 border border-washa-border/50">
                  {this.state.error.message}
                </div>
              )}

              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center justify-center gap-2 bg-washa-gold text-washa-bg hover:bg-washa-gold-light transition-colors px-6 py-3 rounded-md font-medium text-sm"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
