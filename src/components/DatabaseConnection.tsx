import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { 
  Database, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  Code,
  Table,
  Loader2
} from 'lucide-react';
import { DatabaseService, DatabaseConnection as DBConnection, DatabaseQuery } from '../services/databaseService';
import { EnhancedAIService } from '../services/enhancedAIService';
import toast from 'react-hot-toast';

interface DatabaseConnectionProps {
  onDataLoaded: (data: Record<string, any>[], source: string) => void;
}

export const DatabaseConnection: React.FC<DatabaseConnectionProps> = ({ onDataLoaded }) => {
  const [connections, setConnections] = useState<DBConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [queryText, setQueryText] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<DatabaseQuery[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [tableSchema, setTableSchema] = useState<Record<string, string[]>>({});
  
  // New connection form
  const [newConnection, setNewConnection] = useState<Partial<DBConnection>>({
    type: 'postgresql',
    name: '',
    connectionString: ''
  });

  const databaseService = useMemo(() => new DatabaseService(), []);
  const aiService = useMemo(() => new EnhancedAIService(), []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const loadConnections = useCallback(() => {
    const conns = databaseService.getConnections();
    setConnections(conns);
    setQueryHistory(databaseService.getQueryHistory());
  }, [databaseService]);

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.connectionString || !newConnection.type) {
      toast.error('Please fill in all connection details');
      return;
    }

    setIsTestingConnection(true);
    try {
      const connection: DBConnection = {
        type: newConnection.type as any,
        name: newConnection.name,
        connectionString: newConnection.connectionString
      };

      await databaseService.addConnection(connection);
      toast.success('Database connection added successfully');
      
      setNewConnection({ type: 'postgresql', name: '', connectionString: '' });
      loadConnections();
    } catch (error) {
      toast.error(`Failed to add connection: ${error}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRemoveConnection = (name: string) => {
    databaseService.removeConnection(name);
    toast.success('Connection removed');
    loadConnections();
    
    if (selectedConnection === name) {
      setSelectedConnection('');
      setTableSchema({});
    }
  };

  const handleConnectionSelect = async (connectionName: string) => {
    setSelectedConnection(connectionName);
    
    try {
      const schema = await databaseService.getTableSchema(connectionName);
      setTableSchema(schema);
    } catch (error) {
      console.error('Error loading table schema:', error);
      toast.error('Failed to load table schema');
    }
  };

  const handleExecuteQuery = async () => {
    if (!selectedConnection || !queryText.trim()) {
      toast.error('Please select a connection and enter a query');
      return;
    }

    setIsExecuting(true);
    try {
      const results = await databaseService.executeQuery(selectedConnection, queryText);
      toast.success(`Query executed successfully. ${results.length} rows returned.`);
      
      // Load the data into the visualization
      onDataLoaded(results, `Database: ${selectedConnection}`);
      
      // Refresh query history
      setQueryHistory(databaseService.getQueryHistory());
    } catch (error) {
      toast.error(`Query failed: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleGenerateQuery = async () => {
    if (!selectedConnection) {
      toast.error('Please select a connection first');
      return;
    }

    const naturalLanguageQuery = prompt('Describe what you want to query (e.g., "Show all users with orders in the last month")');
    if (!naturalLanguageQuery) return;

    try {
      const sqlQuery = await aiService.generateSQLQuery(naturalLanguageQuery, tableSchema);
      setQueryText(sqlQuery);
      toast.success('SQL query generated successfully');
    } catch (error) {
      toast.error('Failed to generate SQL query');
      console.error(error);
    }
  };

  const handleLoadSampleData = async (tableName: string) => {
    try {
      const sampleData = await databaseService.generateMockData(tableName, 100);
      onDataLoaded(sampleData, `Sample: ${tableName}`);
      toast.success(`Loaded ${sampleData.length} sample records from ${tableName}`);
    } catch (error) {
      toast.error('Failed to load sample data');
    }
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'postgresql': return '🐘';
      case 'mysql': return '🐬';
      case 'mongodb': return '🍃';
      case 'sqlite': return '📁';
      default: return '🗄️';
    }
  };

  const connectionStringExamples = {
    postgresql: 'postgresql://username:password@localhost:5432/database',
    mysql: 'mysql://username:password@localhost:3306/database',
    mongodb: 'mongodb://username:password@localhost:27017/database',
    sqlite: '/path/to/database.db or :memory:'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connections
            </span>
            <Badge variant="secondary">
              {connections.length} connection{connections.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connections" className="space-y-4">
            <TabsList>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="query">Query</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-4">
              {/* Add New Connection */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Database Type</label>
                      <Select 
                        value={newConnection.type} 
                        onValueChange={(value) => setNewConnection(prev => ({ ...prev, type: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select database type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="postgresql">🐘 PostgreSQL</SelectItem>
                          <SelectItem value="mysql">🐬 MySQL</SelectItem>
                          <SelectItem value="mongodb">🍃 MongoDB</SelectItem>
                          <SelectItem value="sqlite">📁 SQLite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Connection Name</label>
                      <Input
                        value={newConnection.name}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Database"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Connection String</label>
                    <Input
                      value={newConnection.connectionString}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, connectionString: e.target.value }))}
                      placeholder={connectionStringExamples[newConnection.type as keyof typeof connectionStringExamples]}
                      type="password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: {connectionStringExamples[newConnection.type as keyof typeof connectionStringExamples]}
                    </p>
                  </div>

                  <Button 
                    onClick={handleAddConnection} 
                    disabled={isTestingConnection}
                    className="w-full"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Connection
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Connections */}
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Database className="mx-auto h-12 w-12 mb-4" />
                    <p>No database connections configured</p>
                    <p className="text-sm">Add a connection above to get started</p>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <Card key={conn.name} className="hover:bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getConnectionTypeIcon(conn.type)}</span>
                            <div>
                              <h3 className="font-medium">{conn.name}</h3>
                              <p className="text-sm text-gray-500 capitalize">{conn.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={selectedConnection === conn.name ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleConnectionSelect(conn.name)}
                            >
                              {selectedConnection === conn.name ? 'Selected' : 'Select'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveConnection(conn.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="query" className="space-y-4">
              {!selectedConnection ? (
                <div className="text-center text-gray-500 py-8">
                  <Database className="mx-auto h-12 w-12 mb-4" />
                  <p>Select a database connection to start querying</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Query: {selectedConnection}</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleGenerateQuery}>
                        <Code className="h-4 w-4 mr-2" />
                        AI Generate
                      </Button>
                      <Button 
                        onClick={handleExecuteQuery} 
                        disabled={isExecuting || !queryText.trim()}
                        size="sm"
                      >
                        {isExecuting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Execute
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Enter your SQL query here..."
                    className="min-h-32 font-mono"
                  />

                  <div className="text-sm text-gray-600">
                    <p><strong>Tip:</strong> Use the AI Generate button to create queries from natural language descriptions.</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="schema" className="space-y-4">
              {!selectedConnection ? (
                <div className="text-center text-gray-500 py-8">
                  <Table className="mx-auto h-12 w-12 mb-4" />
                  <p>Select a database connection to view schema</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium">Schema: {selectedConnection}</h3>
                  
                  {Object.keys(tableSchema).length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No schema information available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(tableSchema).map(([tableName, columns]) => (
                        <Card key={tableName}>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Table className="h-4 w-4" />
                                {tableName}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadSampleData(tableName)}
                              >
                                Load Sample
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              {columns.map((column) => (
                                <div key={column} className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                  {column}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Query History</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    databaseService.clearQueryHistory();
                    setQueryHistory([]);
                    toast.success('Query history cleared');
                  }}
                >
                  Clear History
                </Button>
              </div>

              <ScrollArea className="h-64">
                {queryHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="mx-auto h-12 w-12 mb-4" />
                    <p>No query history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {queryHistory.map((query) => (
                      <Card key={query.id} className="hover:bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {query.error ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-sm text-gray-500">
                                {query.executedAt.toLocaleString()}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setQueryText(query.query)}
                            >
                              Use Query
                            </Button>
                          </div>
                          
                          <div className="font-mono text-sm bg-gray-100 p-2 rounded mb-2">
                            {query.query}
                          </div>
                          
                          {query.error ? (
                            <div className="text-sm text-red-600">
                              Error: {query.error}
                            </div>
                          ) : (
                            <div className="text-sm text-green-600">
                              Success: {query.results?.length || 0} rows returned
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};