import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  BarChart3, 
  Database,
  MessageSquare,
  Loader2,
  Sparkles,
  Settings,
  Zap,
  TrendingUp,
  Eye,
  Code,
  Save,
  BookOpen
} from 'lucide-react';
import { CSVFile, DataInsight, ChatMessage } from '../types/csv';
import { EnhancedAIService } from '../services/enhancedAIService';
import { LangChainAIService } from '../services/langchainAIService';
import { EnhancedLangChainService } from '../services/enhancedLangchainService';
import { AIProvider } from '../services/enhancedAIService';
import { InlineChatVisualization } from './InlineChatVisualization';
import { ChartStorageService, SavedChart } from '../services/chartStorageService';
import toast from 'react-hot-toast';

interface EnhancedChatInterfaceProps {
  files: CSVFile[];
  joinedData?: Record<string, any>[];
  databaseData?: Record<string, any>[];
  onInsightGenerated: (insights: DataInsight[]) => void;
  onVisualizationRequested: (config: any) => void;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({ 
  files, 
  joinedData, 
  databaseData,
  onInsightGenerated,
  onVisualizationRequested
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('blink');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(['blink']);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [showSavedCharts, setShowSavedCharts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiService = useMemo(() => new EnhancedAIService(), []);
  const langchainService = useMemo(() => new LangChainAIService(), []);
  const enhancedLangchainService = useMemo(() => new EnhancedLangChainService(), []);
  const chartStorage = ChartStorageService.getInstance();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize AI service and get available providers
  useEffect(() => {
    const providers = aiService.getAvailableProviders();
    setAvailableProviders(providers);
    
    if (providers.length > 0) {
      const defaultProvider = providers.includes('openai') ? 'openai' : providers[0];
      setSelectedProvider(defaultProvider);
      aiService.setProvider(defaultProvider);
    }
  }, [aiService]);

  // Load saved charts
  useEffect(() => {
    const loadSavedCharts = async () => {
      try {
        const charts = await chartStorage.getUserCharts();
        setSavedCharts(charts);
      } catch (error) {
        console.error('Error loading saved charts:', error);
      }
    };
    loadSavedCharts();
  }, [chartStorage]);

  // Add welcome message when files are first loaded
  useEffect(() => {
    if ((files.length > 0 || joinedData || databaseData) && messages.length === 0) {
      const dataInfo = [];
      if (files.length > 0) dataInfo.push(`${files.length} CSV file${files.length > 1 ? 's' : ''}`);
      if (joinedData) dataInfo.push(`joined dataset (${joinedData.length} rows)`);
      if (databaseData) dataInfo.push(`database data (${databaseData.length} rows)`);

      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Hello! I'm your AI data analyst. I've loaded your ${dataInfo.join(', ')} and I'm ready to help you explore your data.

**What I can do:**
• Create charts and visualizations directly in this chat
• Analyze patterns and provide insights
• Answer questions about your data
• Generate statistical analysis

**Try asking:**
• "Create a bar chart showing top categories"
• "What patterns do you see in my data?"
• "Show me a trend analysis"
• "Generate insights about my dataset"

All charts will appear right here in our conversation. What would you like to explore first?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [files, joinedData, databaseData, messages.length, selectedProvider]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    aiService.setProvider(provider);
    toast.success(`Switched to ${provider.toUpperCase()} AI model`);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use the enhanced LangChain service for advanced function calling and chart generation
      const { response, insights, visualizationSuggestions, inlineCharts } = await enhancedLangchainService.processQueryWithAdvancedFunctionCalling(
        userMessage.content,
        files,
        joinedData,
        databaseData
      );

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        insights: insights.length > 0 ? insights : undefined,
        inlineCharts: inlineCharts && inlineCharts.length > 0 ? inlineCharts : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show success message for generated charts
      if (inlineCharts && inlineCharts.length > 0) {
        console.log('Generated inline charts:', inlineCharts);
        toast.success(`Generated ${inlineCharts.length} visualization${inlineCharts.length > 1 ? 's' : ''}!`);
      } else {
        console.log('No inline charts generated in response');
      }

      if (insights.length > 0) {
        onInsightGenerated(insights);
        toast.success(`Generated ${insights.length} new insight${insights.length > 1 ? 's' : ''}!`);
      }

      // Handle visualization suggestions - keep in chat, don't redirect
      if (visualizationSuggestions.length > 0) {
        console.log('Visualization suggestions generated:', visualizationSuggestions);
        // Don't redirect to visualize tab - keep everything in chat
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request with the Enhanced LangChain AI service (${selectedProvider.toUpperCase()}). This might be due to:

• Network connectivity issues
• Temporary service unavailability
• Complex data processing requirements

Please try:
1. Rephrasing your question in simpler terms
2. Asking for a specific type of chart (bar, line, pie, scatter)
3. Trying again in a moment
4. Starting with basic data exploration

I'm still learning from your data and will try to provide helpful fallback responses. Error details: ${error}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error(`Failed to process request with ${selectedProvider.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Create a bar chart showing top categories",
    "Show me a trend line chart over time",
    "Generate a pie chart distribution", 
    "What patterns do you see in my data?",
    "Create a scatter plot analysis",
    "Find correlations in my dataset",
    "Show me statistical insights",
    "Create a histogram of values"
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderInsights = (insights: DataInsight[]) => {
    if (!insights || insights.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Lightbulb className="h-4 w-4" />
          Generated Insights:
        </div>
        {insights.map((insight) => (
          <div key={insight.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-xs">
                {insight.type}
              </Badge>
              <span className="text-xs text-gray-500">
                {Math.round(insight.confidence * 100)}% confidence
              </span>
            </div>
            <h4 className="font-medium text-sm text-blue-900 mb-1">
              {insight.title}
            </h4>
            <p className="text-sm text-blue-800">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (files.length === 0 && !joinedData && !databaseData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <MessageSquare className="mx-auto h-12 w-12 mb-4" />
            <p>Upload CSV files or connect to a database to start chatting</p>
            <p className="text-sm">I'll help you discover insights and answer questions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chat Header with AI Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Enhanced AI Data Assistant
            </span>
            <div className="flex items-center gap-4">
              {/* AI Provider Selection */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">AI Model:</span>
                <Select value={selectedProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {provider === 'openai' ? '🤖 OpenAI' : '🧠 Gemini'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Data Source Badges */}
              <div className="flex items-center gap-2">
                {files.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {files.length} CSV
                  </Badge>
                )}
                {joinedData && joinedData.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {joinedData.length} joined
                  </Badge>
                )}
                {databaseData && databaseData.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {databaseData.length} DB
                  </Badge>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="h-96">
        <CardContent className="p-0 h-full flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className={`flex-1 max-w-3xl ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900 border'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                    
                    <div className={`text-xs text-gray-500 mt-1 flex items-center gap-2 ${
                      message.role === 'user' ? 'justify-end' : ''
                    }`}>
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.role === 'assistant' && (
                        <Badge variant="outline" className="text-xs">
                          {selectedProvider.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {message.insights && renderInsights(message.insights)}
                    
                    {/* Render inline charts if present */}
                    {message.inlineCharts && message.inlineCharts.map((chartConfig, index) => (
                      <InlineChatVisualization
                        key={`chart-${message.id}-${index}`}
                        type={chartConfig.type}
                        data={chartConfig.data}
                        xColumn={chartConfig.xColumn}
                        yColumn={chartConfig.yColumn}
                        title={chartConfig.title}
                        description={chartConfig.description}
                        onSave={(config) => {
                          chartStorage.saveChart({
                            title: config.title,
                            description: config.description,
                            type: config.type,
                            data: config.data,
                            xColumn: config.xColumn,
                            yColumn: config.yColumn
                          });
                          toast.success('Chart saved successfully!');
                        }}
                        onExpand={(config) => {
                          // Keep charts in chat - don't redirect to visualize tab
                          console.log('Chart expanded in chat:', config);
                          toast.success('Chart expanded! All visualizations stay in chat.');
                        }}
                      />
                    ))}
                    
                    {/* Render single inline chart if present (legacy support) */}
                    {message.chartConfig && (
                      <InlineChatVisualization
                        type={message.chartConfig.type}
                        data={message.chartConfig.data}
                        xColumn={message.chartConfig.xColumn}
                        yColumn={message.chartConfig.yColumn}
                        title={message.chartConfig.title}
                        description={message.chartConfig.description}
                        onSave={(config) => {
                          chartStorage.saveChart({
                            title: config.title,
                            description: config.description,
                            type: config.type,
                            data: config.data,
                            xColumn: config.xColumn,
                            yColumn: config.yColumn
                          });
                          toast.success('Chart saved successfully!');
                        }}
                        onExpand={(config) => {
                          // Keep charts in chat - don't redirect to visualize tab
                          console.log('Chart expanded in chat:', config);
                          toast.success('Chart expanded! All visualizations stay in chat.');
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-3 rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 border">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing with {selectedProvider.toUpperCase()}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4 space-y-3">
            {/* Suggested Questions */}
            {messages.length <= 1 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Try asking:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-xs h-7 px-3"
                      disabled={isLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask me to create advanced charts or analyze your data (Enhanced LangChain + ${selectedProvider.toUpperCase()})...`}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};