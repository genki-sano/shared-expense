"use client";

import { Component, Suspense, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

export function StatusScreen({ message }: { message: string }) {
  return (
    <main className="shell">
      <div className="app">
        <p className="statusMessage" role="status">
          {message}
        </p>
      </div>
    </main>
  );
}

class ErrorBoundary extends Component<
  {
    children: ReactNode;
    onReset: () => void;
    formatError: (error: Error) => string;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main className="shell">
          <div className="app">
            <p className="errorMessage">
              {this.props.formatError(this.state.error)}
            </p>
            <button
              className="secondaryButton"
              onClick={() => {
                this.props.onReset();
                this.setState({ error: null });
              }}
            >
              再試行
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}

export function QueryBoundary({
  children,
  loading,
  formatError = (error) => error.message,
}: {
  children: ReactNode;
  loading: string;
  formatError?: (error: Error) => string;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} formatError={formatError}>
          <Suspense fallback={<StatusScreen message={loading} />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
