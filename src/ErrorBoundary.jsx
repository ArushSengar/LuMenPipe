// src/ErrorBoundary.jsx — on-screen error boundary for demo hardening (spec §10, prompt P10)

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem auto',
          maxWidth: '600px',
          background: '#121829',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          color: '#f1f5f9',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Application Error</h2>
          <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
            An unexpected error occurred in the UI. Details:
          </p>
          <pre style={{
            background: '#0a0f1d',
            padding: '1rem',
            borderRadius: '6px',
            overflowX: 'auto',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            {this.state.error ? this.state.error.toString() : 'Unknown error'}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.65rem 1.5rem',
              background: '#00f0ff',
              color: '#0a0f1d',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
