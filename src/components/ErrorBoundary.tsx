import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  FileText,
  MessageSquare,
  Home
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full space-y-6">
            {/* Main Error Card */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-900">
                  <div className="p-2 bg-red-500 rounded-lg text-white">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Something went wrong</h2>
                    <p className="text-sm font-normal text-red-700">
                      The AI CSV Intelligence Dashboard encountered an unexpected error
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-900">Error Details</span>
                  </div>
                  <p className="text-sm text-red-800 font-mono bg-red-50 p-2 rounded">
                    {this.state.error?.message || 'Unknown error occurred'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={this.handleReset}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <MessageSquare className="h-5 w-5" />
                  Troubleshooting Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Check your data format</p>
                      <p className="text-gray-600">Ensure your CSV files are properly formatted with headers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Try smaller datasets</p>
                      <p className="text-gray-600">Large files might cause memory issues - try with smaller samples first</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Clear browser cache</p>
                      <p className="text-gray-600">Sometimes clearing your browser cache can resolve issues</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Use sample data</p>
                      <p className="text-gray-600">Try our sample datasets to test if the issue is with your data</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details (Development Mode) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Card className="bg-gray-50 border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-5 w-5" />
                    Technical Details
                    <Badge variant="outline" className="ml-2">Development Mode</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                      Stack Trace (Click to expand)
                    </summary>
                    <pre className="bg-gray-100 p-3 rounded text-gray-800 overflow-auto max-h-64">
                      {this.state.error?.stack}
                    </pre>
                    <pre className="bg-gray-100 p-3 rounded text-gray-800 overflow-auto max-h-64 mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}