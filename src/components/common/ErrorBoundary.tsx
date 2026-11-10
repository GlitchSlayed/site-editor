import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background, #0f0f10)',
            color: 'var(--foreground, #ededed)',
            fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: 580,
              width: '100%',
              background: 'var(--surface, #18181b)',
              border: '1px solid var(--border, #27272a)',
              borderRadius: 12,
              padding: 28,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 650, margin: 0, letterSpacing: '-0.02em' }}>
                  Something broke in Purpose
                </h1>
                <p style={{ fontSize: 12, color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0' }}>
                  The editor encountered an unexpected error and stopped safely.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border, #27272a)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#f87171',
                  overflowX: 'auto',
                  marginBottom: 18,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            {this.state.errorInfo?.componentStack && (
              <details style={{ marginBottom: 20, fontSize: 11, color: 'var(--text-muted, #a1a1aa)' }}>
                <summary style={{ cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
                  View component stack trace
                </summary>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: 10,
                    borderRadius: 6,
                    overflowX: 'auto',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    margin: 0,
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border, #27272a)',
                  background: 'transparent',
                  color: 'var(--text-muted, #a1a1aa)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                title="Clears saved localStorage settings and reloads"
              >
                <Trash2 size={13} /> Reset Preferences
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#ff5b36',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> Reload Editor
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
