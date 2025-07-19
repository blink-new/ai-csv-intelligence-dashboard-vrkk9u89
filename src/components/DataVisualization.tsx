import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Zap, Download, Settings } from 'lucide-react';
import { CSVFile } from '../types/csv';

interface DataVisualizationProps {
  files: CSVFile[];
  joinedData?: Record<string, any>[];
}

const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706',
  '#4f46e5', '#be185d', '#0891b2', '#65a30d', '#c2410c'
];

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, joinedData }) => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');

  // Get available data sources
  const dataSources = useMemo(() => {
    const sources = files.map(file => ({
      id: file.id,
      name: file.name,
      data: file.data,
      columns: file.columns
    }));

    if (joinedData && joinedData.length > 0) {
      sources.unshift({
        id: 'joined',
        name: 'Joined Dataset',
        data: joinedData,
        columns: Object.keys(joinedData[0] || {})
      });
    }

    return sources;
  }, [files, joinedData]);

  // Get current data source
  const currentSource = useMemo(() => {
    return dataSources.find(source => source.id === selectedFile) || dataSources[0];
  }, [dataSources, selectedFile]);

  // Get numeric and categorical columns
  const { numericColumns, categoricalColumns, allColumns } = useMemo(() => {
    if (!currentSource) return { numericColumns: [], categoricalColumns: [], allColumns: [] };

    const data = currentSource.data;
    const columns = currentSource.columns;
    
    const numeric: string[] = [];
    const categorical: string[] = [];

    columns.forEach(col => {
      const sampleValues = data.slice(0, 100).map(row => row[col]).filter(v => v != null);
      const isNumeric = sampleValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
      
      if (isNumeric) {
        numeric.push(col);
      } else {
        categorical.push(col);
      }
    });

    return {
      numericColumns: numeric,
      categoricalColumns: categorical,
      allColumns: columns
    };
  }, [currentSource]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!currentSource || !xAxis) return [];

    const data = currentSource.data;
    
    if (chartType === 'pie') {
      // For pie charts, group by xAxis and count occurrences
      const grouped = data.reduce((acc, row) => {
        const key = String(row[xAxis] || 'Unknown');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }

    if (chartType === 'scatter' && yAxis) {
      return data.map((row, index) => ({
        x: Number(row[xAxis]) || 0,
        y: Number(row[yAxis]) || 0,
        name: `Point ${index + 1}`
      }));
    }

    if (chartType === 'bar' || chartType === 'line') {
      if (categoricalColumns.includes(xAxis) && yAxis && numericColumns.includes(yAxis)) {
        // Group categorical data and aggregate numeric values
        const grouped = data.reduce((acc, row) => {
          const key = String(row[xAxis] || 'Unknown');
          const value = Number(row[yAxis]) || 0;
          
          if (!acc[key]) {
            acc[key] = { name: key, total: 0, count: 0 };
          }
          acc[key].total += value;
          acc[key].count += 1;
          
          return acc;
        }, {} as Record<string, { name: string; total: number; count: number }>);

        return Object.values(grouped).map(item => ({
          name: item.name,
          value: item.total / item.count // Average
        }));
      } else if (numericColumns.includes(xAxis) && yAxis && numericColumns.includes(yAxis)) {
        // Both numeric - create bins for x-axis
        const sortedData = data
          .map(row => ({ x: Number(row[xAxis]) || 0, y: Number(row[yAxis]) || 0 }))
          .sort((a, b) => a.x - b.x);

        const binSize = Math.max(1, Math.floor(sortedData.length / 20));
        const binned = [];
        
        for (let i = 0; i < sortedData.length; i += binSize) {
          const bin = sortedData.slice(i, i + binSize);
          const avgX = bin.reduce((sum, item) => sum + item.x, 0) / bin.length;
          const avgY = bin.reduce((sum, item) => sum + item.y, 0) / bin.length;
          
          binned.push({
            name: avgX.toFixed(1),
            value: avgY
          });
        }
        
        return binned;
      }
    }

    return [];
  }, [currentSource, xAxis, yAxis, chartType, categoricalColumns, numericColumns]);

  // Auto-select initial axes when data source changes
  React.useEffect(() => {
    if (currentSource && !xAxis) {
      setXAxis(categoricalColumns[0] || allColumns[0] || '');
    }
    if (currentSource && !yAxis && numericColumns.length > 0) {
      setYAxis(numericColumns[0] || '');
    }
  }, [currentSource, categoricalColumns, numericColumns, allColumns, xAxis, yAxis]);

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 mb-4" />
            <p>Select data columns to generate visualization</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      width: '100%',
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[1]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={chartData}>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name={xAxis} />
              <YAxis type="number" dataKey="y" name={yAxis} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data Points" data={chartData} fill={CHART_COLORS[2]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (dataSources.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <BarChart3 className="mx-auto h-12 w-12 mb-4" />
            <p>Upload CSV files to create visualizations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Data Visualization
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {chartData.length} data points
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Source */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Source
              </label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                      <Badge variant="outline" className="ml-2">
                        {source.data.length} rows
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Chart Type
              </label>
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Pie Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="scatter">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Scatter Plot
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* X Axis */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                X Axis
              </label>
              <Select value={xAxis} onValueChange={setXAxis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select X axis" />
                </SelectTrigger>
                <SelectContent>
                  {allColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                      <Badge 
                        variant="outline" 
                        className="ml-2"
                      >
                        {numericColumns.includes(column) ? 'numeric' : 'categorical'}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Y Axis */}
            {chartType !== 'pie' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Y Axis
                </label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Y axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {(chartType === 'scatter' ? allColumns : numericColumns).map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                        <Badge 
                          variant="outline" 
                          className="ml-2"
                        >
                          {numericColumns.includes(column) ? 'numeric' : 'categorical'}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent className="p-6">
          {renderChart()}
        </CardContent>
      </Card>

      {/* Data Summary */}
      {currentSource && (
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentSource.data.length}
                </div>
                <div className="text-sm text-gray-500">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentSource.columns.length}
                </div>
                <div className="text-sm text-gray-500">Columns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {numericColumns.length}
                </div>
                <div className="text-sm text-gray-500">Numeric</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {categoricalColumns.length}
                </div>
                <div className="text-sm text-gray-500">Categorical</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};