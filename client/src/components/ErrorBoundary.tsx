import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="bg-white rounded-xl shadow border border-red-100 p-8 max-w-lg w-full">
            <h1 className="text-lg font-bold text-red-700 mb-2">Application Error</h1>
            <p className="text-sm text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page.
            </p>
            <pre className="bg-red-50 text-red-800 text-xs rounded p-3 overflow-auto mb-4 whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
            <button
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
