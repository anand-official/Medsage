import React from 'react';
import { reloadWindow } from '../utils/browser';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * ErrorBoundary — catches unhandled render/lifecycle errors inside QuestionPage
 * and shows a friendly fallback instead of a blank screen.
 *
 * Must be a class component (React requirement for error boundaries).
 */
class ErrorBoundary extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Read mode from ThemeContext so the fallback UI matches the user's chosen theme,
    // not the OS-level preference (which may differ).
    const isDark = (this.context?.mode ?? 'dark') === 'dark';

    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        fontFamily: 'inherit',
      }}>
        {/* Icon */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: isDark ? 'rgba(248,113,113,0.12)' : 'rgba(254,242,242,0.8)',
          border: `1px solid ${isDark ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          fontSize: 26,
        }}>
          ⚠️
        </div>

        {/* Heading */}
        <p style={{
          margin: '0 0 8px',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: isDark ? '#fca5a5' : '#dc2626',
          letterSpacing: '-0.02em',
        }}>
          Something went wrong
        </p>

        {/* Sub-text */}
        <p style={{
          margin: '0 0 28px',
          fontSize: '0.875rem',
          color: isDark ? '#64748b' : '#94a3b8',
          maxWidth: 380,
          lineHeight: 1.6,
        }}>
          A rendering error occurred in the chat interface. Your conversation history is safe — try refreshing the page.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            Try again
          </button>
          <button
            onClick={reloadWindow}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
