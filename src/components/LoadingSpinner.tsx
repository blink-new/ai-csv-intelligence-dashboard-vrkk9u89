import React from 'react';
import { Loader2, Brain, BarChart3, Database } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  type?: 'default' | 'ai' | 'data' | 'chart';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message,
  type = 'default'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const getIcon = () => {
    switch (type) {
      case 'ai':
        return <Brain className={`${sizeClasses[size]} animate-pulse text-purple-500`} />;
      case 'data':
        return <Database className={`${sizeClasses[size]} animate-pulse text-blue-500`} />;
      case 'chart':
        return <BarChart3 className={`${sizeClasses[size]} animate-pulse text-green-500`} />;
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-500`} />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'ai':
        return 'from-purple-500 to-blue-500';
      case 'data':
        return 'from-blue-500 to-cyan-500';
      case 'chart':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative">
        {/* Animated background circle */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${getGradient()} opacity-20 animate-ping`} />
        
        {/* Icon container */}
        <div className="relative bg-white rounded-full p-3 shadow-lg border border-gray-100">
          {getIcon()}
        </div>
      </div>
      
      {message && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{message}</p>
          <div className="flex items-center justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
};

interface FullPageLoadingProps {
  message?: string;
  type?: 'default' | 'ai' | 'data' | 'chart';
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({ 
  message = 'Loading...', 
  type = 'default' 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" message={message} type={type} />
      </div>
    </div>
  );
};