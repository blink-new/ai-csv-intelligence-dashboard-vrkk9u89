import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Save, 
  FolderOpen, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  BarChart3,
  Database,
  Clock,
  FileText,
  Plus,
  RefreshCw
} from 'lucide-react';
import { EnhancedDatasetManager, SavedDataset, SavedChart } from '../services/enhancedDatasetManager';
import { CSVFile, DataInsight } from '../types/csv';
import toast from 'react-hot-toast';

interface EnhancedDatasetManagerProps {
  currentFiles: CSVFile[];
  currentJoinedData: Record<string, any>[];
  currentInsights: DataInsight[];
  onLoadDataset: (dataset: SavedDataset) => void;
  onSaveSuccess: () => void;
}

export const EnhancedDatasetManager: React.FC<EnhancedDatasetManagerProps> = ({
  currentFiles,
  currentJoinedData,
  currentInsights,
  onLoadDataset,
  onSaveSuccess
}) => {
  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<SavedDataset | null>(null);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  
  // Save form state
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: ''
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    datasetId: '',
    fileId: '',
    changeDescription: ''
  });

  useEffect(() => {
    loadDatasets();
    initializeTables();
  }, []);

  const initializeTables = async () => {
    try {
      await EnhancedDatasetManager.initializeDefaultFormulas();
    } catch (error) {
      console.error('Error initializing tables:', error);
      toast.error('Failed to initialize dataset management');
    }
  };

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const datasets = await EnhancedDatasetManager.listDatasets();
      setSavedDatasets(datasets);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadChartsForDataset = async (datasetId: string) => {
    try {
      const charts = await EnhancedDatasetManager.loadCharts(datasetId);
      setSavedCharts(charts);
    } catch (error) {
      console.error('Error loading charts:', error);
      toast.error('Failed to load charts');
    }
  };

  const handleSaveDataset = async () => {
    if (!saveForm.name.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    if (currentFiles.length === 0) {
      toast.error('No files to save');
      return;
    }

    setLoading(true);
    try {
      const datasetId = await EnhancedDatasetManager.saveDataset({
        name: saveForm.name,
        description: saveForm.description,
        files: currentFiles,
        joinedData: currentJoinedData,
        insights: currentInsights,
        charts: []
      });

      toast.success('Dataset saved successfully');
      setSaveForm({ name: '', description: '' });
      setShowSaveDialog(false);
      loadDatasets();
      onSaveSuccess();
    } catch (error) {
      console.error('Error saving dataset:', error);
      toast.error('Failed to save dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDataset = async (dataset: SavedDataset) => {
    setLoading(true);
    try {
      const fullDataset = await EnhancedDatasetManager.loadDataset(dataset.id);
      if (fullDataset) {
        onLoadDataset(fullDataset);
        setSelectedDataset(fullDataset);
        await loadChartsForDataset(fullDataset.id);
        toast.success(`Loaded dataset: ${fullDataset.name}`);
      }
    } catch (error) {
      console.error('Error loading dataset:', error);
      toast.error('Failed to load dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await EnhancedDatasetManager.deleteDataset(datasetId);
      toast.success('Dataset deleted successfully');
      loadDatasets();
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null);
        setSavedCharts([]);
      }
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error('Failed to delete dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCSVData = async () => {
    if (!updateForm.datasetId || !updateForm.fileId || !updateForm.changeDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const targetFile = currentFiles.find(f => f.id === updateForm.fileId);
    if (!targetFile) {
      toast.error('File not found');
      return;
    }

    setLoading(true);
    try {
      // For now, just update the dataset with new file data
      const dataset = await EnhancedDatasetManager.loadDataset(updateForm.datasetId);
      if (dataset) {
        const fileIndex = dataset.files.findIndex(f => f.id === updateForm.fileId);
        if (fileIndex !== -1) {
          dataset.files[fileIndex] = targetFile;
          await EnhancedDatasetManager.updateDataset(updateForm.datasetId, { files: dataset.files });
        }
      }

      toast.success('CSV data updated successfully');
      setUpdateForm({ datasetId: '', fileId: '', changeDescription: '' });
      setShowUpdateDialog(false);
      loadDatasets();
    } catch (error) {
      console.error('Error updating CSV data:', error);
      toast.error('Failed to update CSV data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDataset = async (datasetId: string, includeJoined: boolean = false) => {
    setLoading(true);
    try {
      const csvContent = await EnhancedDatasetManager.exportDatasetAsCSV(datasetId, includeJoined);
      
      if (!csvContent) {
        toast.error('No data to export');
        return;
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${datasetId}_${includeJoined ? 'joined' : 'original'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Dataset exported successfully');
    } catch (error) {
      console.error('Error exporting dataset:', error);
      toast.error('Failed to export dataset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dataset Manager</h2>
          <p className="text-gray-600">Save, load, and manage your CSV datasets and visualizations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadDatasets} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button disabled={currentFiles.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save Current Dataset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Dataset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Dataset Name *
                  </label>
                  <Input
                    value={saveForm.name}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter dataset name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={saveForm.description}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">This dataset will include:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {currentFiles.length} CSV files</li>
                    <li>• {currentJoinedData.length} joined data rows</li>
                    <li>• {currentInsights.length} AI insights</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveDataset} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Dataset'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="datasets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="datasets">Saved Datasets</TabsTrigger>
          <TabsTrigger value="charts">Saved Charts</TabsTrigger>
          <TabsTrigger value="updates">Data Updates</TabsTrigger>
        </TabsList>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-4">
          {savedDatasets.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Database className="mx-auto h-8 w-8 mb-2" />
                  <p>No saved datasets found</p>
                  <p className="text-sm">Save your current work to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDatasets.map((dataset) => (
                <Card key={dataset.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dataset.name}</CardTitle>
                        {dataset.description && (
                          <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDataset(dataset.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        {dataset.files.length} files
                      </Badge>
                      <Badge variant="secondary">
                        <Database className="h-3 w-3 mr-1" />
                        {dataset.files.reduce((sum, f) => sum + f.rowCount, 0)} rows
                      </Badge>
                      <Badge variant="secondary">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {dataset.charts.length} charts
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(dataset.updatedAt).toLocaleDateString()}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoadDataset(dataset)}
                        disabled={loading}
                        className="flex-1"
                      >
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Load
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportDataset(dataset.id, false)}
                        disabled={loading}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportDataset(dataset.id, true)}
                        disabled={loading}
                        title="Export with joined data"
                      >
                        <Download className="h-4 w-4" />
                        +
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          {selectedDataset ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Charts for: {selectedDataset.name}</h3>
                <p className="text-sm text-gray-600">{savedCharts.length} saved charts</p>
              </div>
              
              {savedCharts.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <div className="text-center text-gray-500">
                      <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                      <p>No saved charts found</p>
                      <p className="text-sm">Create and save charts from the visualization tab</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedCharts.map((chart) => (
                    <Card key={chart.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {chart.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Badge variant="outline">{chart.type} chart</Badge>
                          <p className="text-sm text-gray-600">
                            X: {chart.config.xAxis}
                            {chart.config.yAxis && ` | Y: ${chart.config.yAxis}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {chart.data.length} data points
                          </p>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(chart.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                  <p>Select a dataset to view its charts</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Data Updates</h3>
              <p className="text-sm text-gray-600">Update CSV data in saved datasets</p>
            </div>
            <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
              <DialogTrigger asChild>
                <Button disabled={currentFiles.length === 0 || savedDatasets.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  Update Dataset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update CSV Data</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Target Dataset
                    </label>
                    <Select value={updateForm.datasetId} onValueChange={(value) => 
                      setUpdateForm(prev => ({ ...prev, datasetId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dataset to update" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedDatasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      File to Update
                    </label>
                    <Select value={updateForm.fileId} onValueChange={(value) => 
                      setUpdateForm(prev => ({ ...prev, fileId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select file to update" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentFiles.map((file) => (
                          <SelectItem key={file.id} value={file.id}>
                            {file.name} ({file.rowCount} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Change Description *
                    </label>
                    <Textarea
                      value={updateForm.changeDescription}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, changeDescription: e.target.value }))}
                      placeholder="Describe what changed in this update"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateCSVData} disabled={loading}>
                      {loading ? 'Updating...' : 'Update Data'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-gray-500">
                <Edit3 className="mx-auto h-8 w-8 mb-2" />
                <p>Data update history will appear here</p>
                <p className="text-sm">Update datasets to track changes over time</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};