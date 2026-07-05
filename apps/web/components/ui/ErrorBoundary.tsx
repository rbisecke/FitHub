"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-[var(--red)] bg-[var(--surface)] p-4 font-mono text-sm text-[var(--red)]">
            <p>✗ something went wrong</p>
            {this.state.error?.message && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {this.state.error.message}
              </p>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
