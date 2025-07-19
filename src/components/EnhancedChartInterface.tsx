import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  BarChart3, 
  Zap, 
  Save, 
  Wand2, 
  Eye, 
  Settings,
  Lightbulb,
  Plus,
  Loader2
} from 'lucide-react';
import { EnhancedDatasetManager, ChartFormula } from '../services/enhancedDatasetManager';
import { ChartStorageService } from '../services/chartStorageService';
import toast from 'react-hot-toast';

interface EnhancedChartInterfaceProps {
  data: Record<string, any>[];
  datasetId?: string;
  onChartGenerated: (chartConfig: any, processedData: any[]) => void;
}

export const EnhancedChartInterface: React.FC<EnhancedChartInterfaceProps> = ({
  data,
  datasetId,
  onChartGenerated
}) => {
  const [chartFormulas, setChartFormulas] = useState<ChartFormula[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [naturalLanguageRequest, setNaturalLanguageRequest] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showNewFormulaDialog, setShowNewFormulaDialog] = useState(false);
  
  // New formula form
  const [newFormula, setNewFormula] = useState({
    name: '',
    description: '',
    chartType: 'bar' as 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'histogram',
    template: '',
    aggregation: 'sum' as 'sum' | 'avg' | 'count' | 'min' | 'max'
  });

  // Available columns from data
  const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const numericColumns = availableColumns.filter(col => {
    const values = data.slice(0, 10).map(row => row[col]);
    return values.some(v => typeof v === 'number' || !isNaN(Number(v)));
  });

  useEffect(() => {
    loadChartFormulas();
  }, []);

  const loadChartFormulas = async () => {
    try {
      const formulas = await EnhancedDatasetManager.listChartFormulas();
      setChartFormulas(formulas);
    } catch (error) {
      console.error('Error loading chart formulas:', error);
      toast.error('Failed to load chart formulas');
    }
  };

  const handleGenerateWithFormula = async () => {
    if (!selectedFormula || !columnMapping.xAxis) {
      toast.error('Please select a formula and map columns');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedDatasetManager.applyChartFormula(
        selectedFormula,
        data,
        columnMapping
      );

      onChartGenerated(result.chartConfig, result.processedData);
      
      // Save the chart if we have a dataset ID
      if (datasetId) {
        await EnhancedDatasetManager.saveChart(
          datasetId,
          {
            name: result.chartConfig.title || 'Generated Chart',
            type: result.chartConfig.type,
            config: {
              dataSource: 'dataset',
              xAxis: result.chartConfig.xAxis,
              yAxis: result.chartConfig.yAxis,
              aggregation: result.chartConfig.aggregation
            },
            data: result.processedData,
            aiPrompt: naturalLanguageRequest
          },
          selectedFormula
        );
      }

      toast.success('Chart generated successfully');
    } catch (error) {
      console.error('Error generating chart with formula:', error);
      toast.error('Failed to generate chart');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!naturalLanguageRequest.trim()) {
      toast.error('Please describe what chart you want to create');
      return;
    }

    setLoading(true);
    try {
      const chartService = ChartStorageService.getInstance();
      const result = await chartService.generateChart({
        datasetId: datasetId || 'temp',
        naturalLanguageRequest,
        data,
        columnHints: columnMapping
      });

      onChartGenerated(result.chartConfig, result.processedData);
      toast.success('AI chart generated successfully');
    } catch (error) {
      console.error('Error generating AI chart:', error);
      toast.error('Failed to generate AI chart');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormula = async () => {
    if (!newFormula.name || !newFormula.description || !newFormula.template) {
      toast.error('Please fill in all formula fields');
      return;
    }

    setLoading(true);
    try {
      await EnhancedDatasetManager.saveChartFormula({
        name: newFormula.name,
        description: newFormula.description,
        chartType: newFormula.chartType,
        template: newFormula.template,
        requiredColumns: {
          xAxis: { type: 'string', required: true },
          yAxis: { type: 'number', required: newFormula.chartType !== 'pie' }
        },
        aggregation: newFormula.aggregation
      });

      toast.success('Chart formula created successfully');
      setNewFormula({
        name: '',
        description: '',
        chartType: 'bar',
        template: '',
        aggregation: 'sum'
      });
      setShowNewFormulaDialog(false);
      await loadChartFormulas();
    } catch (error) {
      console.error('Error creating chart formula:', error);
      toast.error('Failed to create chart formula');
    } finally {
      setLoading(false);
    }
  };

  const selectedFormulaData = chartFormulas.find(f => f.id === selectedFormula);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Enhanced Chart Generator
          </h3>
          <p className="text-sm text-gray-600">
            Use AI or predefined formulas to create charts from your data
          </p>
        </div>
        <Dialog open={showNewFormulaDialog} onOpenChange={setShowNewFormulaDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Formula
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chart Formula</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Formula Name
                </label>
                <Input
                  value={newFormula.name}
                  onChange={(e) => setNewFormula(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Sales Performance Chart"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Description
                </label>
                <Textarea
                  value={newFormula.description}
                  onChange={(e) => setNewFormula(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Shows sales performance across different categories"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Chart Type
                  </label>
                  <Select 
                    value={newFormula.chartType} 
                    onValueChange={(value: any) => setNewFormula(prev => ({ ...prev, chartType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="scatter">Scatter Plot</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="histogram">Histogram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Aggregation
                  </label>
                  <Select 
                    value={newFormula.aggregation} 
                    onValueChange={(value: any) => setNewFormula(prev => ({ ...prev, aggregation: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  AI Template
                </label>
                <Textarea
                  value={newFormula.template}
                  onChange={(e) => setNewFormula(prev => ({ ...prev, template: e.target.value }))}
                  placeholder="Create a {chartType} chart showing {yAxis} by {xAxis}. Group data by {xAxis} and {aggregation} the {yAxis} values."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewFormulaDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFormula} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Create Formula
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formula-Based Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Use Chart Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Formula
              </label>
              <Select value={selectedFormula} onValueChange={setSelectedFormula}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a chart formula" />
                </SelectTrigger>
                <SelectContent>
                  {chartFormulas.map((formula) => (
                    <SelectItem key={formula.id} value={formula.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formula.chartType}
                        </Badge>
                        {formula.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFormulaData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  {selectedFormulaData.name}
                </p>
                <p className="text-sm text-blue-700">
                  {selectedFormulaData.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  X-Axis Column
                </label>
                <Select 
                  value={columnMapping.xAxis || ''} 
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, xAxis: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Y-Axis Column
                </label>
                <Select 
                  value={columnMapping.yAxis || ''} 
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, yAxis: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateWithFormula}
              disabled={loading || !selectedFormula || !columnMapping.xAxis}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generate with Formula
            </Button>
          </CardContent>
        </Card>

        {/* AI-Based Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Chart Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Describe Your Chart
              </label>
              <Textarea
                value={naturalLanguageRequest}
                onChange={(e) => setNaturalLanguageRequest(e.target.value)}
                placeholder="Create a bar chart showing sales by product category..."
                rows={4}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Examples:</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>• "Bar chart showing revenue by month"</div>
                <div>• "Pie chart of customer distribution by region"</div>
                <div>• "Line chart of sales trends over time"</div>
                <div>• "Scatter plot of price vs quantity"</div>
              </div>
            </div>

            <Button 
              onClick={handleGenerateWithAI}
              disabled={loading || !naturalLanguageRequest.trim()}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate with AI
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Data Preview
            </span>
            <Badge variant="secondary">
              {data.length} rows, {availableColumns.length} columns
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {availableColumns.slice(0, 6).map((col) => (
                    <th key={col} className="text-left p-2 font-medium text-gray-700">
                      {col}
                      {numericColumns.includes(col) && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          numeric
                        </Badge>
                      )}
                    </th>
                  ))}
                  {availableColumns.length > 6 && (
                    <th className="text-left p-2 font-medium text-gray-700">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {availableColumns.slice(0, 6).map((col) => (
                      <td key={col} className="p-2 text-gray-600">
                        {String(row[col]).length > 20 
                          ? String(row[col]).substring(0, 20) + '...' 
                          : String(row[col])
                        }
                      </td>
                    ))}
                    {availableColumns.length > 6 && (
                      <td className="p-2 text-gray-400">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 5 && (
              <div className="text-center py-2 text-sm text-gray-500">
                Showing first 5 of {data.length} rows
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};