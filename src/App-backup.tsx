import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { DataProvider } from './contexts/DataProvider';
import { useDataContext } from './hooks/useDataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { 
  Database, 
  MessageSquare, 
  BarChart3, 
  Upload, 
  Brain, 
  Link,
  Lightbulb,
  Settings,
  Download,
  Zap,
  Server,
  Trash2
} from 'lucide-react';
import { CSVUploader } from './components/CSVUploader';
import { EnhancedChatInterface } from './components/EnhancedChatInterface';
import { EnhancedDataVisualization } from './components/EnhancedDataVisualization';
import { RelationshipViewer } from './components/RelationshipViewer';
import { DataTable } from './components/DataTable';
import { DatabaseConnection } from './components/DatabaseConnection';
import { SampleDataLoader } from './components/SampleDataLoader';
import { CSVFile, DataInsight } from './types/csv';
import { EnhancedAIService } from './services/enhancedAIService';
import { CSVParser } from './services/csvParser';

const AppContent: React.FC = () => {
  const { 
    files, 
    joinedData, 
    databaseData, 
    insights, 
    addFiles, 
    removeFile, 
    clearAllFiles,
    setJoinedData,
    setDatabaseData,
    addInsights,
    isAnalyzing
  } = useDataContext();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [visualizationConfig, setVisualizationConfig] = useState<any>(null);

  // Generate joined dataset when files change
  useEffect(() => {
    if (files.length > 1) {
      const relationships = files.flatMap(f => f.relationships || []);
      if (relationships.length > 0) {
        const joined = CSVParser.joinDatasets(files, relationships);
        setJoinedData(joined);
      }
    } else {
      setJoinedData([]);
    }
  }, [files, setJoinedData]);

  const handleFilesUploaded = (newFiles: CSVFile[]) => {
    addFiles(newFiles);
    if (newFiles.length > 0) {
      setActiveTab('dashboard');
    }
  };

  const handleInsightGenerated = (newInsights: DataInsight[]) => {
    addInsights(newInsights);
  };

  const handleDatabaseDataLoaded = (data: Record<string, any>[], source: string) => {
    setDatabaseData(data);
    setActiveTab('visualize'); // Switch to visualization tab
  };

  const handleVisualizationRequested = (config: any) => {
    setVisualizationConfig(config);
    setActiveTab('visualize');
  };

  const totalRows = files.reduce((sum, file) => sum + file.rowCount, 0);
  const totalRelationships = files.flatMap(f => f.relationships || []).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  AI CSV Intelligence Dashboard
                </h1>
              </div>
              {files.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {files.length} files
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {totalRows} rows
                  </Badge>
                  {totalRelationships > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      {totalRelationships} relationships
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Relations
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="visualize" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualize
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Upload Your CSV Files
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload multiple CSV files and our AI will automatically detect relationships, 
                analyze patterns, and provide intelligent insights through natural language chat.
              </p>
            </div>
            
            {/* Show sample data loader if no files uploaded */}
            {files.length === 0 && (
              <SampleDataLoader 
                onDataLoaded={handleFilesUploaded}
                isLoading={isAnalyzing}
              />
            )}
            
            <CSVUploader 
              onFilesUploaded={handleFilesUploaded} 
              uploadedFiles={files} 
              onFileRemove={removeFile}
            />
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <DatabaseConnection onDataLoaded={handleDatabaseDataLoaded} />
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overview Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Files Loaded</p>
                        <p className="text-2xl font-bold text-blue-600">{files.length}</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Rows</p>
                        <p className="text-2xl font-bold text-green-600">{totalRows.toLocaleString()}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Relationships</p>
                        <p className="text-2xl font-bold text-purple-600">{totalRelationships}</p>
                      </div>
                      <Link className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Database Rows</p>
                        <p className="text-2xl font-bold text-orange-600">{databaseData.length.toLocaleString()}</p>
                      </div>
                      <Server className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* File Details */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Dataset Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {files.map((file) => (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{file.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {file.rowCount} rows
                              </Badge>
                              <Badge variant="outline">
                                {file.columns.length} columns
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Columns:</strong> {file.columns.join(', ')}
                          </div>
                          {file.relationships && file.relationships.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700">Relationships:</div>
                              {file.relationships.map((rel, index) => {
                                const targetFile = files.find(f => f.id === rel.targetFile);
                                return (
                                  <div key={index} className="text-sm text-gray-600 ml-2">
                                    → {targetFile?.name} ({rel.sourceColumn} ↔ {rel.targetColumn})
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        AI Insights
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {/* TODO: Add refresh functionality */}}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Refresh'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Lightbulb className="mx-auto h-12 w-12 mb-4" />
                          <p>No insights generated yet</p>
                          <p className="text-sm">Upload files to get AI insights</p>
                        </div>
                      ) : (
                        insights.slice(0, 5).map((insight) => (
                          <div key={insight.id} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {insight.type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            </div>
                            <h4 className="font-medium text-sm text-gray-900">
                              {insight.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {insight.description}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('chat')}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start AI Chat
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('visualize')}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Create Visualization
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('relationships')}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        View Relationships
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships">
            <RelationshipViewer 
              files={files}
              onJoinData={(relationships) => {
                const joined = CSVParser.joinDatasets(files, relationships);
                setJoinedData(joined);
              }}
            />
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <DataTable files={files} joinedData={joinedData} />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <EnhancedChatInterface 
              files={files} 
              joinedData={joinedData}
              databaseData={databaseData}
              onInsightGenerated={handleInsightGenerated}
              onVisualizationRequested={handleVisualizationRequested}
            />
          </TabsContent>

          {/* Visualize Tab */}
          <TabsContent value="visualize">
            <EnhancedDataVisualization 
              files={files} 
              joinedData={joinedData}
              databaseData={databaseData}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;