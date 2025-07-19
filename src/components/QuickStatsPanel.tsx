import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Calculator,
  Target,
  Zap
} from 'lucide-react';
import { CSVFile } from '../types/csv';

interface QuickStatsPanelProps {
  files: CSVFile[];
  joinedData?: Record<string, any>[];
  databaseData?: Record<string, any>[];
}

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const getNumericColumns = (data: Record<string, any>[]): string[] => {
  if (data.length === 0) return [];
  
  const columns = Object.keys(data[0] || {});
  return columns.filter(col => {
    const sampleValues = data.slice(0, 50).map(row => row[col]).filter(v => v != null);
    if (sampleValues.length === 0) return false;
    
    const numericCount = sampleValues.filter(v => 
      typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null)
    ).length;
    
    return numericCount / sampleValues.length > 0.7;
  });
};

const getCategoricalColumns = (data: Record<string, any>[]): string[] => {
  if (data.length === 0) return [];
  
  const columns = Object.keys(data[0] || {});
  const numericColumns = getNumericColumns(data);
  return columns.filter(col => !numericColumns.includes(col));
};

const calculateDataCompleteness = (data: Record<string, any>[]): number => {
  if (data.length === 0) return 0;
  
  const totalCells = data.length * Object.keys(data[0] || {}).length;
  if (totalCells === 0) return 0;
  
  const completeCells = data.reduce((sum, row) => {
    return sum + Object.values(row).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;
  }, 0);
  
  return completeCells / totalCells;
};

export const QuickStatsPanel: React.FC<QuickStatsPanelProps> = ({
  files,
  joinedData,
  databaseData
}) => {
  const stats = useMemo(() => {
    const allData = [
      ...files.flatMap(f => f.data),
      ...(joinedData || []),
      ...(databaseData || [])
    ];

    if (allData.length === 0) {
      return [];
    }

    const numericColumns = getNumericColumns(allData);
    const categoricalColumns = getCategoricalColumns(allData);
    
    const statsItems: StatItem[] = [
      {
        label: 'Total Records',
        value: allData.length.toLocaleString(),
        icon: BarChart3,
        color: 'text-blue-600',
        description: 'Total number of data points across all sources'
      },
      {
        label: 'Data Sources',
        value: files.length + (joinedData ? 1 : 0) + (databaseData ? 1 : 0),
        icon: Activity,
        color: 'text-green-600',
        description: 'Number of different data sources loaded'
      },
      {
        label: 'Numeric Fields',
        value: numericColumns.length,
        icon: Calculator,
        color: 'text-purple-600',
        description: 'Columns containing numeric data for analysis'
      },
      {
        label: 'Categories',
        value: categoricalColumns.length,
        icon: PieChart,
        color: 'text-orange-600',
        description: 'Categorical columns for grouping and filtering'
      }
    ];

    // Add data quality score
    const completenessScore = calculateDataCompleteness(allData);
    statsItems.push({
      label: 'Data Quality',
      value: `${Math.round(completenessScore * 100)}%`,
      icon: Target,
      color: completenessScore > 0.8 ? 'text-green-600' : completenessScore > 0.6 ? 'text-yellow-600' : 'text-red-600',
      description: 'Percentage of complete data points (non-null values)'
    });

    // Add relationships count
    const relationshipsCount = files.reduce((sum, file) => sum + (file.relationships?.length || 0), 0);
    if (relationshipsCount > 0) {
      statsItems.push({
        label: 'Relationships',
        value: relationshipsCount,
        icon: Zap,
        color: 'text-indigo-600',
        description: 'Detected relationships between datasets'
      });
    }

    return statsItems;
  }, [files, joinedData, databaseData]);

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="mx-auto h-12 w-12 mb-4" />
            <p>Upload data to see statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={`p-2 rounded-full bg-white shadow-sm`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {stat.label}
                    </p>
                    {stat.change && (
                      <Badge 
                        variant={stat.change > 0 ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {stat.change > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(stat.change)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 leading-tight">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Quality Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Data Quality Insights
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            {stats.find(s => s.label === 'Data Quality')?.value === '100%' && (
              <p>✅ Excellent! Your data has no missing values.</p>
            )}
            {parseInt(stats.find(s => s.label === 'Data Quality')?.value as string || '0') > 80 && 
             parseInt(stats.find(s => s.label === 'Data Quality')?.value as string || '0') < 100 && (
              <p>✅ Good data quality with minimal missing values.</p>
            )}
            {parseInt(stats.find(s => s.label === 'Data Quality')?.value as string || '0') <= 80 && (
              <p>⚠️ Consider cleaning your data to improve analysis accuracy.</p>
            )}
            
            {stats.find(s => s.label === 'Numeric Fields')?.value as number > 3 && (
              <p>📊 Great! Multiple numeric fields enable rich statistical analysis.</p>
            )}
            
            {stats.find(s => s.label === 'Relationships')?.value as number > 0 && (
              <p>🔗 Detected relationships allow for comprehensive cross-dataset analysis.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};