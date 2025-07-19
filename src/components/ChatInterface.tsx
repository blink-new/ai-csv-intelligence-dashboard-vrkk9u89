import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  BarChart3, 
  Database,
  MessageSquare,
  Loader2,
  Sparkles
} from 'lucide-react';
import { CSVFile, DataInsight, ChatMessage } from '../types/csv';
import { AIService } from '../services/aiService';
import toast from 'react-hot-toast';

interface ChatInterfaceProps {
  files: CSVFile[];
  joinedData?: Record<string, any>[];
  onInsightGenerated: (insights: DataInsight[]) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  files, 
  joinedData, 
  onInsightGenerated 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiService = new AIService();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message when files are first loaded
  useEffect(() => {
    if (files.length > 0 && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Hello! I've analyzed your ${files.length} CSV file${files.length > 1 ? 's' : ''} and I'm ready to help you explore your data. Here are some things you can ask me:

• "What patterns do you see in my data?"
• "How many rows and columns do I have?"
• "What relationships exist between my files?"
• "Show me insights about [specific column name]"
• "What trends can you identify?"

What would you like to know about your data?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [files, messages.length]);

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
      const { response, insights } = await aiService.processQuery(
        userMessage.content,
        files,
        joinedData
      );

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        insights: insights.length > 0 ? insights : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (insights.length > 0) {
        onInsightGenerated(insights);
        toast.success(`Generated ${insights.length} new insight${insights.length > 1 ? 's' : ''}!`);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try rephrasing your question or check if your data is properly loaded.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process your question');
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
    "What's the summary of my data?",
    "Show me data relationships",
    "What patterns do you see?",
    "Are there any anomalies?",
    "What columns have missing data?"
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
          <div key={insight.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <MessageSquare className="mx-auto h-12 w-12 mb-4" />
            <p>Upload CSV files to start chatting with your data</p>
            <p className="text-sm">I'll help you discover insights and answer questions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chat Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Data Assistant
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {files.length} file{files.length > 1 ? 's' : ''}
              </Badge>
              {joinedData && joinedData.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {joinedData.length} joined rows
                </Badge>
              )}
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
                      : 'bg-gray-100 text-gray-600'
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
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                    
                    <div className={`text-xs text-gray-500 mt-1 ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </div>

                    {message.insights && renderInsights(message.insights)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-3 rounded-lg bg-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing your data...</span>
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
                  Suggested questions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-xs h-7"
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
                placeholder="Ask me anything about your data..."
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

      {/* Chat Tips */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Pro Tips
          </h4>
          <ul className="space-y-1 text-sm text-green-800">
            <li>• Ask specific questions about columns, patterns, or relationships</li>
            <li>• Request visualizations: "Create a chart showing..."</li>
            <li>• Get summaries: "Summarize the trends in my data"</li>
            <li>• Find anomalies: "What unusual patterns do you see?"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};