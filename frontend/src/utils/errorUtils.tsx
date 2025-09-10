/**
 * Error handling utilities for React components.
 */

import React, { ReactNode, ErrorInfo } from 'react';
import { frontendMonitoring } from '../monitoring';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Higher-order component for adding error boundary to any component
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook for manually reporting errors within components
 */
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    frontendMonitoring.reportError({
      message: error.message,
      stack: error.stack,
      type: 'Manual Error Report',
      ...context
    });
  }, []);

  return { reportError };
}