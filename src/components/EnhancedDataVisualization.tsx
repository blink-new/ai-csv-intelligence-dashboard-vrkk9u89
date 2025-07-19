import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Treemap,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Activity as ScatterIcon,
  TrendingUp,
  Download,
  Settings,
  Palette,
  Filter,
  Zap
} from 'lucide-react';
import { CSVFile } from '../types/csv';
import { EnhancedChartInterface } from './EnhancedChartInterface';

interface EnhancedDataVisualizationProps {
  files: CSVFile[];
  joinedData?: Record<string, any>[];
  databaseData?: Record<string, any>[];
}

type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'treemap' | 'radial' | 'histogram';

const COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', 
  '#db2777', '#0891b2', '#65a30d', '#dc2626', '#7c2d12'
];

export const EnhancedDataVisualization: React.FC<EnhancedDataVisualizationProps> = ({ 
  files, 
  joinedData, 
  databaseData 
}) => {
  const [selectedDataset, setSelectedDataset] = useState<string>('csv');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');
  const [colorColumn, setColorColumn] = useState<string>('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  // Get current data based on selection
  const currentData = useMemo(() => {
    switch (selectedDataset) {
      case 'csv':
        if (selectedFile) {
          const file = files.find(f => f.id === selectedFile);
          return file?.data || [];
        }
        return files[0]?.data || [];
      case 'joined':
        return joinedData || [];
      case 'database':
        return databaseData || [];
      default:
        return [];
    }
  }, [selectedDataset, selectedFile, files, joinedData, databaseData]);

  // Get available columns
  const availableColumns = useMemo(() => {
    if (currentData.length === 0) return [];
    return Object.keys(currentData[0] || {});
  }, [currentData]);

  // Get numeric columns
  const numericColumns = useMemo(() => {
    if (currentData.length === 0) return [];
    return availableColumns.filter(col => {
      const values = currentData.slice(0, 100).map(row => row[col]);
      return values.some(v => typeof v === 'number' || !isNaN(Number(v)));
    });
  }, [currentData, availableColumns]);

  // Filter data if filter is applied
  const filteredData = useMemo(() => {
    if (!filterColumn || filterColumn === 'none' || !filterValue) return currentData;
    return currentData.filter(row => 
      String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
    );
  }, [currentData, filterColumn, filterValue]);

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!xColumn || filteredData.length === 0) return [];

    if (chartType === 'histogram') {
      // Create histogram data
      const values = filteredData.map(row => Number(row[xColumn])).filter(v => !isNaN(v));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
      const binSize = (max - min) / binCount;
      
      const bins = Array.from({ length: binCount }, (_, i) => ({
        range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
        count: 0,
        binStart: min + i * binSize
      }));

      values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex].count++;
      });

      return bins;
    }

    if (chartType === 'pie') {
      // Aggregate data for pie chart
      const aggregated = new Map<string, number>();
      filteredData.forEach(row => {
        const key = String(row[xColumn]);
        const value = yColumn ? Number(row[yColumn]) || 1 : 1;
        aggregated.set(key, (aggregated.get(key) || 0) + value);
      });

      return Array.from(aggregated.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Limit to top 10 for readability
    }

    // For other chart types, use data as-is with proper formatting
    return filteredData.map(row => ({
      ...row,
      [xColumn]: row[xColumn],
      [yColumn]: yColumn ? Number(row[yColumn]) || 0 : 0
    }));
  }, [filteredData, xColumn, yColumn, chartType]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 mb-4" />
            <p>No data to visualize</p>
            <p className="text-sm">Select columns and configure your chart</p>
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
              <XAxis dataKey={xColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yColumn} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yColumn} stroke={COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={yColumn} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xColumn} />
              <YAxis dataKey={yColumn} />
              <Tooltip />
              <Legend />
              <Scatter dataKey={yColumn} fill={COLORS[0]} />
            </ScatterChart>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radial':
        return (
          <ResponsiveContainer {...commonProps}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={chartData.slice(0, 8)}>
              <RadialBar dataKey={yColumn} cornerRadius={10} fill={COLORS[0]} />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTypeOptions = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare categories' },
    { value: 'line', label: 'Line Chart', icon: LineChartIcon, description: 'Show trends over time' },
    { value: 'area', label: 'Area Chart', icon: TrendingUp, description: 'Filled trend visualization' },
    { value: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, description: 'Find correlations' },
    { value: 'pie', label: 'Pie Chart', icon: PieChartIcon, description: 'Show proportions' },
    { value: 'histogram', label: 'Histogram', icon: BarChart3, description: 'Data distribution' },
    { value: 'radial', label: 'Radial Bar', icon: BarChart3, description: 'Circular comparison' }
  ];

  const datasetOptions = [
    { value: 'csv', label: 'CSV Files', available: files.length > 0 },
    { value: 'joined', label: 'Joined Data', available: joinedData && joinedData.length > 0 },
    { value: 'database', label: 'Database Data', available: databaseData && databaseData.length > 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Enhanced Data Visualization
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredData.length} rows
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="data" className="space-y-4">
            <TabsList>
              <TabsTrigger value="data">Data Source</TabsTrigger>
              <TabsTrigger value="chart">Chart Type</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="ai">AI Generator</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Source</label>
                  <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasetOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          disabled={!option.available}
                        >
                          {option.label} {!option.available && '(No data)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDataset === 'csv' && files.length > 1 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">CSV File</label>
                    <Select value={selectedFile} onValueChange={setSelectedFile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV file" />
                      </SelectTrigger>
                      <SelectContent>
                        {files.map(file => (
                          <SelectItem key={file.id} value={file.id}>
                            {file.name} ({file.rowCount} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Chart Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {chartTypeOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        variant={chartType === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartType(option.value as ChartType)}
                        className="flex flex-col items-center gap-1 h-auto p-3"
                        title={option.description}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 text-center leading-tight">{option.description}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="columns" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {chartType === 'pie' ? 'Category Column' : 'X-Axis Column'}
                  </label>
                  <Select value={xColumn} onValueChange={setXColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {chartType !== 'histogram' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {chartType === 'pie' ? 'Value Column (optional)' : 'Y-Axis Column'}
                    </label>
                    <Select value={yColumn} onValueChange={setYColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericColumns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter Column</label>
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column to filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No filter</SelectItem>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filterColumn && filterColumn !== 'none' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter Value</label>
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="Enter filter value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <EnhancedChartInterface
                data={filteredData}
                onChartGenerated={(config, processedData) => {
                  // Update the current chart configuration
                  setChartType(config.type);
                  setXColumn(config.xAxis);
                  setYColumn(config.yAxis);
                  // The chart will automatically re-render with the new data
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {chartTypeOptions.find(opt => opt.value === chartType)?.label || 'Chart'}
            </span>
            <div className="flex items-center gap-2">
              {filterColumn && filterColumn !== 'none' && filterValue && (
                <Badge variant="outline" className="text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  {filterColumn}: {filterValue}
                </Badge>
              )}
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Customize
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Chart Insights */}
      {chartData.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="h-5 w-5" />
              Chart Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Displaying {chartData.length} data points</p>
              {chartType === 'pie' && (
                <p>• Top category: {chartData[0]?.name} ({((chartData[0]?.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)</p>
              )}
              {numericColumns.includes(yColumn) && chartType !== 'pie' && (
                <p>• Y-axis range: {Math.min(...chartData.map(d => d[yColumn])).toFixed(2)} to {Math.max(...chartData.map(d => d[yColumn])).toFixed(2)}</p>
              )}
              <p>• Chart type: {chartTypeOptions.find(opt => opt.value === chartType)?.label}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};