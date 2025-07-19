import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { 
  Database, 
  Plus, 
  Play, 
  History, 
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Settings,
  Trash2,
  Server,
  Send,
  User,
  Bot
} from 'lucide-react';
import { MCPClient, MCPServerConfig, MCPChatMessage } from '../services/mcpClient';
import toast from 'react-hot-toast';

interface MCPInterfaceProps {
  onDataVisualized?: (chartData: any) => void;
}

export const MCPInterface: React.FC<MCPInterfaceProps> = ({
  onDataVisualized
}) => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<MCPServerConfig | null>(null);
  const [chatHistory, setChatHistory] = useState<MCPChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Server form state
  const [serverForm, setServerForm] = useState({
    name: '',
    url: '',
    type: 'sql' as const,
    authType: 'none' as const,
    credentials: {
      token: '',
      username: '',
      password: '',
      apiKey: ''
    }
  });

  useEffect(() => {
    initializeMCP();
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (selectedServer) {
      loadChatHistory(selectedServer.id);
    }
  }, [selectedServer]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeMCP = async () => {
    try {
      await MCPClient.initializeTables();
    } catch (error) {
      console.error('Error initializing MCP:', error);
      toast.error('Failed to initialize MCP');
    }
  };

  const loadServers = useCallback(async () => {
    setLoading(true);
    try {
      const serversList = await MCPClient.listServers();
      setServers(serversList);
      
      if (serversList.length > 0 && !selectedServer) {
        setSelectedServer(serversList[0]);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [selectedServer]);

  const loadChatHistory = async (serverId: string) => {
    try {
      const history = await MCPClient.getChatHistory(serverId);
      setChatHistory(history.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleCreateServer = async () => {
    if (!serverForm.name.trim() || !serverForm.url.trim()) {
      toast.error('Please fill in server name and URL');
      return;
    }

    setLoading(true);
    try {
      const authentication = serverForm.authType !== 'none' ? {
        type: serverForm.authType,
        credentials: getCredentialsForAuthType(serverForm.authType, serverForm.credentials)
      } : undefined;

      const serverId = await MCPClient.addServer({
        name: serverForm.name,
        url: serverForm.url,
        type: serverForm.type,
        authentication
      });

      toast.success('MCP server added successfully');
      setServerForm({
        name: '',
        url: '',
        type: 'sql',
        authType: 'none',
        credentials: { token: '', username: '', password: '', apiKey: '' }
      });
      setShowServerDialog(false);
      await loadServers();
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error('Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  const getCredentialsForAuthType = (authType: string, credentials: any) => {
    switch (authType) {
      case 'bearer':
        return { token: credentials.token };
      case 'basic':
        return { username: credentials.username, password: credentials.password };
      case 'api_key':
        return { apiKey: credentials.apiKey };
      default:
        return {};
    }
  };

  const handleTestConnection = async (serverId: string) => {
    setLoading(true);
    try {
      const isConnected = await MCPClient.testConnection(serverId);
      
      if (isConnected) {
        toast.success('Connection test successful');
        await loadServers();
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedServer) {
      toast.error('Please select a server');
      return;
    }

    if (!currentMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsChatting(true);
    const userMessage = currentMessage;
    setCurrentMessage('');

    try {
      // Add user message to chat immediately
      const userChatMessage: MCPChatMessage = {
        id: `temp_user_${Date.now()}`,
        serverId: selectedServer.id,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, userChatMessage]);

      // Send to MCP server and get response
      const assistantMessage = await MCPClient.chatWithDatabase(selectedServer.id, userMessage);
      
      // Update chat history with real messages
      await loadChatHistory(selectedServer.id);

      // If there are results, offer to visualize them
      if (assistantMessage.metadata?.results && assistantMessage.metadata.results.length > 0 && onDataVisualized) {
        setTimeout(() => {
          const shouldVisualize = window.confirm('Would you like to create a visualization from these results?');
          if (shouldVisualize) {
            onDataVisualized({
              type: 'table',
              data: assistantMessage.metadata.results,
              title: `Results for: ${userMessage}`,
              description: assistantMessage.content
            });
          }
        }, 1000);
      }

      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsChatting(false);
    }
  };

  const handleSelectServer = async (server: MCPServerConfig) => {
    setSelectedServer(server);
    setChatHistory([]);
  };

  const handleRemoveServer = async (serverId: string) => {
    try {
      await MCPClient.removeServer(serverId);
      toast.success('Server removed');
      await loadServers();
      
      if (selectedServer?.id === serverId) {
        setSelectedServer(null);
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Error removing server:', error);
      toast.error('Failed to remove server');
    }
  };

  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'sql': return '🗄️';
      case 'mongodb': return '🍃';
      case 'api': return '🔌';
      default: return '⚙️';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">MCP Interface</h2>
          <p className="text-gray-600">Connect to MCP servers and chat with databases</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadServers} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showServerDialog} onOpenChange={setShowServerDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add MCP Server</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Server Name *
                  </label>
                  <Input
                    value={serverForm.name}
                    onChange={(e) => setServerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My SQL Server"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Server URL *
                  </label>
                  <Input
                    value={serverForm.url}
                    onChange={(e) => setServerForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="http://localhost:3001/mcp"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Server Type
                  </label>
                  <Select 
                    value={serverForm.type} 
                    onValueChange={(value: any) => setServerForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sql">🗄️ SQL Database</SelectItem>
                      <SelectItem value="mongodb">🍃 MongoDB</SelectItem>
                      <SelectItem value="api">🔌 API Server</SelectItem>
                      <SelectItem value="custom">⚙️ Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Authentication
                  </label>
                  <Select 
                    value={serverForm.authType} 
                    onValueChange={(value: any) => setServerForm(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Authentication fields */}
                {serverForm.authType === 'bearer' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Bearer Token
                    </label>
                    <Input
                      type="password"
                      value={serverForm.credentials.token}
                      onChange={(e) => setServerForm(prev => ({ 
                        ...prev, 
                        credentials: { ...prev.credentials, token: e.target.value }
                      }))}
                      placeholder="your-bearer-token"
                    />
                  </div>
                )}

                {serverForm.authType === 'basic' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Username
                      </label>
                      <Input
                        value={serverForm.credentials.username}
                        onChange={(e) => setServerForm(prev => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, username: e.target.value }
                        }))}
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={serverForm.credentials.password}
                        onChange={(e) => setServerForm(prev => ({ 
                          ...prev, 
                          credentials: { ...prev.credentials, password: e.target.value }
                        }))}
                        placeholder="password"
                      />
                    </div>
                  </>
                )}

                {serverForm.authType === 'api_key' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      API Key
                    </label>
                    <Input
                      type="password"
                      value={serverForm.credentials.apiKey}
                      onChange={(e) => setServerForm(prev => ({ 
                        ...prev, 
                        credentials: { ...prev.credentials, apiKey: e.target.value }
                      }))}
                      placeholder="your-api-key"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowServerDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateServer} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Server'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat Interface</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
        </TabsList>

        {/* Chat Interface Tab */}
        <TabsContent value="chat" className="space-y-4">
          {selectedServer ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Chat Area */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Chat with {selectedServer.name}
                      <Badge variant={selectedServer.isConnected ? 'default' : 'secondary'}>
                        {selectedServer.isConnected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Chat Messages */}
                    <ScrollArea className="h-96 w-full border rounded-lg p-4">
                      <div className="space-y-4">
                        {chatHistory.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                            <p>No messages yet</p>
                            <p className="text-sm">Start a conversation with your database</p>
                          </div>
                        ) : (
                          chatHistory.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}>
                              <div className={`flex gap-3 max-w-[80%] ${
                                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                              }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  message.role === 'user' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {message.role === 'user' ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Bot className="h-4 w-4" />
                                  )}
                                </div>
                                <div className={`rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <p className="text-sm">{message.content}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTimestamp(message.timestamp)}</span>
                                    {message.metadata?.executionTime && (
                                      <span>• {message.metadata.executionTime}ms</span>
                                    )}
                                  </div>
                                  
                                  {/* Show query if available */}
                                  {message.metadata?.query && (
                                    <div className="mt-2 p-2 bg-black/10 rounded text-xs font-mono">
                                      <div className="text-xs font-medium mb-1">SQL Query:</div>
                                      {message.metadata.query}
                                    </div>
                                  )}
                                  
                                  {/* Show error if available */}
                                  {message.metadata?.error && (
                                    <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs">
                                      <div className="font-medium mb-1">Error:</div>
                                      {message.metadata.error}
                                    </div>
                                  )}
                                  
                                  {/* Show result count if available */}
                                  {message.metadata?.results && (
                                    <div className="mt-2 text-xs">
                                      📊 {message.metadata.results.length} results
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {isChatting && (
                          <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                <span className="text-sm">Thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <Textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder="Ask questions about your data...&#10;Examples:&#10;- Show me all users&#10;- Count orders by status&#10;- What are the top selling products?"
                        rows={3}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={isChatting || !currentMessage.trim()}
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Server Info Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Server Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-sm text-gray-600">{selectedServer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">URL</p>
                      <p className="text-sm text-gray-600 break-all">{selectedServer.url}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Type</p>
                      <p className="text-sm text-gray-600 capitalize">{selectedServer.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <div className="flex items-center gap-2">
                        {selectedServer.isConnected ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Disconnected
                          </Badge>
                        )}
                      </div>
                    </div>
                    {selectedServer.lastConnected && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Last Connected</p>
                        <p className="text-sm text-gray-600">
                          {selectedServer.lastConnected.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestConnection(selectedServer.id)}
                      disabled={loading}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Server className="mx-auto h-8 w-8 mb-2" />
                  <p>No server selected</p>
                  <p className="text-sm">Add a server to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-4">
          {servers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Server className="mx-auto h-8 w-8 mb-2" />
                  <p>No servers found</p>
                  <p className="text-sm">Create your first MCP server connection</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <Card 
                  key={server.id} 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    selectedServer?.id === server.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleSelectServer(server)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>{getServerTypeIcon(server.type)}</span>
                        {server.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {server.isConnected ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 break-all">URL: {server.url}</p>
                      <p className="text-sm text-gray-600 capitalize">Type: {server.type}</p>
                      {server.authentication && (
                        <p className="text-sm text-gray-600 capitalize">
                          Auth: {server.authentication.type}
                        </p>
                      )}
                    </div>
                    
                    {server.lastConnected && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last connected: {server.lastConnected.toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(server.id);
                        }}
                        disabled={loading}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedServer?.id === server.id ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectServer(server);
                        }}
                        className="flex-1"
                      >
                        {selectedServer?.id === server.id ? 'Selected' : 'Select'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveServer(server.id);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};