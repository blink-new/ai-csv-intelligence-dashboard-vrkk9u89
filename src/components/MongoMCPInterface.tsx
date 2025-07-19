import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Database, 
  Plus, 
  Play, 
  History, 
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Settings,
  Trash2
} from 'lucide-react';
import { MongoMCPClient, MCPConnection, MCPQuery } from '../services/mongoMCPClient';
import { ChartStorageService } from '../services/chartStorageService';
import toast from 'react-hot-toast';

interface MongoMCPInterfaceProps {
  onDataVisualized?: (chartData: any) => void;
}

export const MongoMCPInterface: React.FC<MongoMCPInterfaceProps> = ({
  onDataVisualized
}) => {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<MCPConnection | null>(null);
  const [queryHistory, setQueryHistory] = useState<MCPQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  
  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    connectionString: '',
    database: ''
  });

  // Query state
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [queryError, setQueryError] = useState<string>('');

  useEffect(() => {
    initializeMCP();
    loadConnections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeMCP = async () => {
    try {
      await MongoMCPClient.initializeTables();
      await ChartStorageService.initializeTables();
    } catch (error) {
      console.error('Error initializing MCP:', error);
      toast.error('Failed to initialize MongoDB MCP');
    }
  };

  const loadConnections = async () => {
    setLoading(true);
    try {
      const connectionsList = await MongoMCPClient.listConnections();
      setConnections(connectionsList);
      
      if (connectionsList.length > 0 && !selectedConnection) {
        setSelectedConnection(connectionsList[0]);
        await loadQueryHistory(connectionsList[0].id);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const loadQueryHistory = async (connectionId?: string) => {
    try {
      const history = await MongoMCPClient.getQueryHistory(connectionId);
      setQueryHistory(history);
    } catch (error) {
      console.error('Error loading query history:', error);
    }
  };

  const handleCreateConnection = async () => {
    if (!connectionForm.name.trim() || !connectionForm.connectionString.trim() || !connectionForm.database.trim()) {
      toast.error('Please fill in all connection fields');
      return;
    }

    setLoading(true);
    try {
      const connectionId = await MongoMCPClient.createConnection(
        connectionForm.name,
        connectionForm.connectionString,
        connectionForm.database
      );

      toast.success('Connection created successfully');
      setConnectionForm({ name: '', connectionString: '', database: '' });
      setShowConnectionDialog(false);
      await loadConnections();
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error('Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setLoading(true);
    try {
      const isConnected = await MongoMCPClient.testConnection(connectionId);
      
      if (isConnected) {
        toast.success('Connection test successful');
        await loadConnections();
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

  const handleExecuteQuery = async () => {
    if (!selectedConnection) {
      toast.error('Please select a connection');
      return;
    }

    if (!currentQuery.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setLoading(true);
    setQueryError('');
    setQueryResults([]);

    try {
      const queryResult = await MongoMCPClient.executeQuery(
        selectedConnection.id,
        currentQuery
      );

      if (queryResult.error) {
        setQueryError(queryResult.error);
        toast.error('Query execution failed');
      } else {
        setQueryResults(queryResult.result || []);
        toast.success(`Query executed successfully. Found ${queryResult.result?.length || 0} results.`);
        
        // Auto-generate chart if results are suitable
        if (queryResult.result && queryResult.result.length > 0) {
          await handleGenerateChart(queryResult.result, currentQuery);
        }
      }

      await loadQueryHistory(selectedConnection.id);
    } catch (error) {
      console.error('Error executing query:', error);
      setQueryError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChart = async (data: any[], naturalLanguageQuery: string) => {
    try {
      const chartConfig = await MongoMCPClient.generateChartFromQueryResults(
        data,
        naturalLanguageQuery
      );

      if (onDataVisualized) {
        onDataVisualized({
          type: chartConfig.chartType,
          data: chartConfig.data,
          config: chartConfig.config,
          title: chartConfig.config.title,
          description: chartConfig.config.description
        });
      }

      toast.success('Chart generated from query results');
    } catch (error) {
      console.error('Error generating chart:', error);
      // Don't show error toast for chart generation as it's optional
    }
  };

  const handleSelectConnection = async (connection: MCPConnection) => {
    setSelectedConnection(connection);
    await loadQueryHistory(connection.id);
    
    // Load collections if not already loaded
    if (!connection.collections) {
      try {
        const collections = await MongoMCPClient.getCollections(connection.id);
        connection.collections = collections;
        setConnections(prev => prev.map(c => c.id === connection.id ? connection : c));
      } catch (error) {
        console.error('Error loading collections:', error);
      }
    }
  };

  const handleUseQuery = (query: MCPQuery) => {
    setCurrentQuery(query.query);
    if (query.result) {
      setQueryResults(query.result);
    }
    if (query.error) {
      setQueryError(query.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">MongoDB MCP Interface</h2>
          <p className="text-gray-600">Connect to MongoDB and query data with natural language</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadConnections} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add MongoDB Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Connection Name *
                  </label>
                  <Input
                    value={connectionForm.name}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MongoDB Connection"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Connection String *
                  </label>
                  <Input
                    type="password"
                    value={connectionForm.connectionString}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, connectionString: e.target.value }))}
                    placeholder="mongodb+srv://username:password@cluster.mongodb.net/"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Database Name *
                  </label>
                  <Input
                    value={connectionForm.database}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="my_database"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateConnection} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Connection'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="query" className="space-y-4">
        <TabsList>
          <TabsTrigger value="query">Query Interface</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="history">Query History</TabsTrigger>
        </TabsList>

        {/* Query Interface Tab */}
        <TabsContent value="query" className="space-y-4">
          {selectedConnection ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Query Input */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Natural Language Query
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={currentQuery}
                      onChange={(e) => setCurrentQuery(e.target.value)}
                      placeholder="Ask questions about your data in natural language...
Examples:
- Find all users created in the last month
- Show me the top 10 products by sales
- Count orders by status
- Get average revenue by category"
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Connected to: <span className="font-medium">{selectedConnection.name}</span>
                      </div>
                      <Button onClick={handleExecuteQuery} disabled={loading || !currentQuery.trim()}>
                        <Play className="h-4 w-4 mr-2" />
                        {loading ? 'Executing...' : 'Execute Query'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Query Results */}
                {(queryResults.length > 0 || queryError) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Query Results
                        {queryResults.length > 0 && (
                          <Badge variant="secondary">{queryResults.length} results</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {queryError ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-700 mb-2">
                            <XCircle className="h-4 w-4" />
                            <span className="font-medium">Query Error</span>
                          </div>
                          <p className="text-red-600 text-sm">{queryError}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Query executed successfully. Found {queryResults.length} results.
                              </span>
                            </div>
                          </div>
                          
                          {queryResults.length > 0 && (
                            <div className="max-h-96 overflow-auto">
                              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                                {JSON.stringify(queryResults.slice(0, 10), null, 2)}
                              </pre>
                              {queryResults.length > 10 && (
                                <p className="text-sm text-gray-500 mt-2">
                                  Showing first 10 results of {queryResults.length} total
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Connection Info & Collections */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Connection Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-sm text-gray-600">{selectedConnection.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Database</p>
                      <p className="text-sm text-gray-600">{selectedConnection.database}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <div className="flex items-center gap-2">
                        {selectedConnection.isConnected ? (
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestConnection(selectedConnection.id)}
                      disabled={loading}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </CardContent>
                </Card>

                {selectedConnection.collections && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Collections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedConnection.collections.map((collection, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{collection.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {collection.documentCount} docs
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Database className="mx-auto h-8 w-8 mb-2" />
                  <p>No connection selected</p>
                  <p className="text-sm">Create a connection to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Database className="mx-auto h-8 w-8 mb-2" />
                  <p>No connections found</p>
                  <p className="text-sm">Create your first MongoDB connection</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <Card 
                  key={connection.id} 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    selectedConnection?.id === connection.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleSelectConnection(connection)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{connection.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        {connection.isConnected ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Database: {connection.database}</p>
                      {connection.collections && (
                        <p className="text-sm text-gray-600">
                          Collections: {connection.collections.length}
                        </p>
                      )}
                    </div>
                    
                    {connection.lastConnected && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last connected: {connection.lastConnected.toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(connection.id);
                        }}
                        disabled={loading}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedConnection?.id === connection.id ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectConnection(connection);
                        }}
                        className="flex-1"
                      >
                        {selectedConnection?.id === connection.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Query History Tab */}
        <TabsContent value="history" className="space-y-4">
          {queryHistory.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <History className="mx-auto h-8 w-8 mb-2" />
                  <p>No query history found</p>
                  <p className="text-sm">Execute queries to see history</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {queryHistory.map((query) => (
                <Card key={query.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {query.query}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {query.executedAt.toLocaleString()}
                          </span>
                          <span>{query.executionTime}ms</span>
                          {query.result && (
                            <span>{query.result.length} results</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {query.error ? (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseQuery(query)}
                        >
                          Use Query
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {query.error && (
                    <CardContent className="pt-0">
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-600">{query.error}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};