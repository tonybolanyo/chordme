/**
 * Error Boundary component for React error handling and monitoring.
 * Captures JavaScript errors anywhere in the component tree.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { frontendMonitoring } from '../monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring system
    frontendMonitoring.reportError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      type: 'React Error Boundary'
    });

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = () => {
    // Create GitHub issue or send to support
    const issueBody = encodeURIComponent(`
**Error Report**

- **Error ID:** ${this.state.errorId}
- **Message:** ${this.state.error?.message}
- **URL:** ${window.location.href}
- **Timestamp:** ${new Date().toISOString()}
- **User Agent:** ${navigator.userAgent}

**Stack Trace:**
\`\`\`
${this.state.error?.stack}
\`\`\`

**Component Stack:**
\`\`\`
${this.state.errorInfo?.componentStack}
\`\`\`
    `);

    const issueUrl = `https://github.com/tonybolanyo/chordme/issues/new?title=Frontend%20Error%20Report&body=${issueBody}`;
    window.open(issueUrl, '_blank');
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary" data-error-boundary role="alert">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            
            <h1 className="error-boundary__title">
              Oops! Something went wrong
            </h1>
            
            <p className="error-boundary__message">
              We're sorry, but something unexpected happened. The error has been reported to our team.
            </p>

            {this.state.errorId && (
              <p className="error-boundary__error-id">
                <strong>Error ID:</strong> {this.state.errorId}
              </p>
            )}

            <div className="error-boundary__actions">
              <button 
                onClick={this.handleReload}
                className="error-boundary__button error-boundary__button--primary"
              >
                Reload Page
              </button>
              
              <button 
                onClick={this.handleGoHome}
                className="error-boundary__button error-boundary__button--secondary"
              >
                Go Home
              </button>
              
              <button 
                onClick={this.handleReportIssue}
                className="error-boundary__button error-boundary__button--link"
              >
                Report Issue
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-boundary__error-stack">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="error-boundary__component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;