import React from 'react';
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
import { Badge } from './ui/badge';
import { Save, Maximize2, Download, BarChart3 } from 'lucide-react';

interface InlineChatVisualizationProps {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: Record<string, any>[];
  xColumn: string;
  yColumn?: string;
  title: string;
  description?: string;
  onSave?: (config: any) => void;
  onExpand?: (config: any) => void;
}

const COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706',
  '#db2777', '#0891b2', '#65a30d', '#dc2626', '#7c2d12'
];

export const InlineChatVisualization: React.FC<InlineChatVisualizationProps> = ({
  type,
  data,
  xColumn,
  yColumn,
  title,
  description,
  onSave,
  onExpand
}) => {
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <BarChart3 className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No data to visualize</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      width: '100%',
      height: 280,
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xColumn} 
                tick={{ fontSize: 12 }}
                angle={data.length > 8 ? -45 : 0}
                textAnchor={data.length > 8 ? 'end' : 'middle'}
                height={data.length > 8 ? 60 : 30}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey={yColumn || 'value'} 
                fill={COLORS[0]} 
                radius={[4, 4, 0, 0]}
                stroke={COLORS[0]}
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xColumn} 
                tick={{ fontSize: 12 }}
                angle={data.length > 8 ? -45 : 0}
                textAnchor={data.length > 8 ? 'end' : 'middle'}
                height={data.length > 8 ? 60 : 30}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={yColumn || 'value'} 
                stroke={COLORS[1]} 
                strokeWidth={3}
                dot={{ fill: COLORS[1], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS[1], strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                dataKey={xColumn} 
                name={xColumn}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="number" 
                dataKey={yColumn || 'y'} 
                name={yColumn || 'y'}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Scatter 
                name="Data Points" 
                data={data} 
                fill={COLORS[2]}
                stroke={COLORS[2]}
                strokeWidth={1}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <p>Unsupported chart type: {type}</p>
          </div>
        );
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        type,
        data,
        xColumn,
        yColumn,
        title,
        description
      });
    }
  };

  const handleExpand = () => {
    if (onExpand) {
      onExpand({
        type,
        data,
        xColumn,
        yColumn,
        title,
        description
      });
    }
  };

  const handleDownload = () => {
    // Create a simple CSV download
    const csvContent = data.map(row => 
      Object.values(row).join(',')
    ).join('\n');
    
    const headers = Object.keys(data[0] || {}).join(',');
    const fullCsv = headers + '\n' + csvContent;
    
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-base mb-1">{title}</h4>
              {description && (
                <p className="text-xs text-blue-700 leading-relaxed">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Badge variant="outline" className="text-xs bg-white/50">
                {data.length} points
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDownload}
                className="h-7 w-7 p-0 hover:bg-white/50"
                title="Download data as CSV"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
                className="h-7 w-7 p-0 hover:bg-white/50"
                title="Save chart"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExpand}
                className="h-7 w-7 p-0 hover:bg-white/50"
                title="Expand to full view"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};