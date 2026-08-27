import React, { Component, ErrorInfo, ReactNode } from 'react';
import { formatErrorMessage, isNetworkError } from './utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetwork = this.state.error ? isNetworkError(this.state.error) : false;
      const message = this.state.error ? formatErrorMessage(this.state.error) : 'Bir hata oluştu';

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2">
              {isNetwork ? 'Bağlant\u0131 Hatas\u0131' : 'Bir Sorun Oluştu'}
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
