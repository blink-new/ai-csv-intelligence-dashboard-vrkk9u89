import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Brain, 
  Upload, 
  BarChart3, 
  MessageSquare, 
  Zap, 
  Database,
  TrendingUp,
  Sparkles,
  ArrowRight,
  FileText,
  Link,
  Eye
} from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLoadSample: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onGetStarted, 
  onLoadSample 
}) => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced AI automatically detects patterns, relationships, and generates insights from your data',
      color: 'text-purple-600'
    },
    {
      icon: BarChart3,
      title: 'Smart Visualizations',
      description: 'Create interactive charts through natural language - just ask for what you want to see',
      color: 'text-blue-600'
    },
    {
      icon: MessageSquare,
      title: 'Conversational Interface',
      description: 'Chat with your data using plain English. Ask questions and get instant visual answers',
      color: 'text-green-600'
    },
    {
      icon: Link,
      title: 'Relationship Detection',
      description: 'Automatically finds connections between multiple CSV files for comprehensive analysis',
      color: 'text-orange-600'
    }
  ];

  const capabilities = [
    'Upload multiple CSV files simultaneously',
    'Automatic data type detection and cleaning',
    'Cross-dataset relationship mapping',
    'Natural language query processing',
    'Real-time chart generation in chat',
    'Advanced statistical analysis',
    'Export and save visualizations',
    'Database connectivity support'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Brain className="h-16 w-16 text-blue-600" />
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered CSV
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}Intelligence
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Transform your CSV data into actionable insights with advanced AI analysis, 
              automatic relationship detection, and conversational data exploration.
              <span className="block mt-2 text-blue-600 font-semibold">No coding required!</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Your Data
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button 
                onClick={onLoadSample}
                variant="outline" 
                size="lg"
                className="border-2 border-gray-300 hover:border-blue-500 px-8 py-3 text-lg font-semibold transition-all duration-200"
              >
                <Eye className="h-5 w-5 mr-2" />
                Try Sample Data
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                <FileText className="h-3 w-3 mr-1" />
                Multi-file Support
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="h-3 w-3 mr-1" />
                Real-time Analysis
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Advanced AI
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Database className="h-3 w-3 mr-1" />
                Database Ready
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features for Data Intelligence
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to unlock insights from your CSV data with cutting-edge AI technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-gray-50">
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              What You Can Do
            </h3>
            <div className="space-y-4">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  </div>
                  <p className="text-gray-700 leading-relaxed">{capability}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <MessageSquare className="h-5 w-5" />
                  AI Chat Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">U</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">
                        "Create a bar chart showing sales by region"
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 shadow-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Brain className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 mb-2">
                        I've analyzed your sales data and created a bar chart showing performance by region. The chart reveals that the West region leads with 34% of total sales.
                      </p>
                      <div className="bg-white rounded p-2 text-center">
                        <BarChart3 className="h-8 w-8 mx-auto text-blue-500 mb-1" />
                        <p className="text-xs text-gray-500">Interactive Chart Generated</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Unlock Your Data's Potential?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already discovering powerful insights with AI-powered data analysis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={onGetStarted}
              size="lg" 
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Upload className="h-5 w-5 mr-2" />
              Get Started Now
            </Button>
            <Button 
              onClick={onLoadSample}
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg font-semibold transition-all duration-200"
            >
              <Eye className="h-5 w-5 mr-2" />
              Explore Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};