import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ORBIX:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center p-6 text-center">
          <div className="p-4 rounded-full bg-danger/10 text-danger border border-danger/20 mb-4">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold mb-2">Unexpected Platform Anomaly</h1>
          <p className="text-xs text-text-muted max-w-md mb-6 leading-relaxed">
            {this.state.error?.message ||
              'A runtime exception occurred. The system boundary isolated the error.'}
          </p>
          <Button onClick={this.handleReset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Reload Interface</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
