import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Database, 
  TrendingUp, 
  Users, 
  BarChart3, 
  DollarSign,
  Download,
  Sparkles,
  Play
} from 'lucide-react';
import { CSVFile } from '../types/csv';
import { SampleDataGenerator } from '../services/sampleDataGenerator';
import toast from 'react-hot-toast';

interface SampleDataLoaderProps {
  onDataLoaded: (files: CSVFile[]) => void;
  isLoading?: boolean;
}

export const SampleDataLoader: React.FC<SampleDataLoaderProps> = ({ 
  onDataLoaded, 
  isLoading = false 
}) => {
  const sampleDatasets = [
    {
      id: 'sales',
      name: 'Sales Performance Data',
      description: 'Regional sales data with products, revenue, and quarterly performance metrics',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      rows: 200,
      columns: ['region', 'product', 'month', 'sales', 'units', 'profit', 'quarter']
    },
    {
      id: 'customers',
      name: 'Customer Analytics Data',
      description: 'Customer segmentation with revenue, satisfaction scores, and geographic data',
      icon: Users,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      rows: 150,
      columns: ['customer_id', 'country', 'segment', 'status', 'annual_revenue', 'employees', 'satisfaction_score']
    },
    {
      id: 'analytics',
      name: 'Web Analytics Data',
      description: 'Website traffic data with page views, bounce rates, and traffic sources',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-900',
      rows: 300,
      columns: ['page', 'traffic_source', 'device_type', 'sessions', 'pageviews', 'bounce_rate']
    },
    {
      id: 'financial',
      name: 'Financial Performance Data',
      description: 'Budget vs actual spending across departments with variance analysis',
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      rows: 180,
      columns: ['category', 'department', 'month', 'actual_amount', 'budget_amount', 'variance_percent']
    }
  ];

  const handleLoadSampleData = (type: 'sales' | 'customers' | 'analytics' | 'financial') => {
    try {
      const sampleFile = SampleDataGenerator.generateRandomDataset(type);
      onDataLoaded([sampleFile]);
      
      const dataset = sampleDatasets.find(d => d.id === type);
      toast.success(`Loaded ${dataset?.name} with ${sampleFile.rowCount} rows!`);
    } catch (error) {
      console.error('Error loading sample data:', error);
      toast.error('Failed to load sample data');
    }
  };

  const handleLoadAllSampleData = () => {
    try {
      const allSampleFiles = SampleDataGenerator.getAllSampleDatasets();
      onDataLoaded(allSampleFiles);
      
      const totalRows = allSampleFiles.reduce((sum, file) => sum + file.rowCount, 0);
      toast.success(`Loaded all ${allSampleFiles.length} sample datasets with ${totalRows} total rows!`);
    } catch (error) {
      console.error('Error loading all sample data:', error);
      toast.error('Failed to load sample datasets');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">Try Sample Datasets</h3>
              <p className="text-sm text-indigo-700 font-normal">
                Explore the AI-powered analytics with professionally crafted sample data
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-indigo-800">
              <p>🚀 <strong>Perfect for testing:</strong> Advanced LangChain function calling, statistical analysis, and intelligent visualizations</p>
              <p className="mt-1">💡 <strong>What you'll get:</strong> Interactive charts, correlation analysis, trend detection, and business insights</p>
            </div>
            <Button 
              onClick={handleLoadAllSampleData}
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Load All Datasets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Datasets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleDatasets.map((dataset) => {
          const IconComponent = dataset.icon;
          
          return (
            <Card key={dataset.id} className={`${dataset.bgColor} ${dataset.borderColor} hover:shadow-md transition-shadow`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-gradient-to-r ${dataset.color} rounded-lg text-white`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${dataset.textColor} text-sm`}>{dataset.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-white/50">
                          {dataset.rows} rows
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-white/50">
                          {dataset.columns.length} columns
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleLoadSampleData(dataset.id as any)}
                    disabled={isLoading}
                    className="hover:bg-white/50"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className={`text-xs ${dataset.textColor} mb-3 leading-relaxed`}>
                  {dataset.description}
                </p>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Key Columns:</div>
                  <div className="flex flex-wrap gap-1">
                    {dataset.columns.slice(0, 4).map((column) => (
                      <Badge key={column} variant="secondary" className="text-xs bg-white/70">
                        {column}
                      </Badge>
                    ))}
                    {dataset.columns.length > 4 && (
                      <Badge variant="secondary" className="text-xs bg-white/70">
                        +{dataset.columns.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features Preview */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
        <CardContent className="p-4">
          <div className="text-center">
            <h4 className="font-semibold text-gray-900 mb-2">🎯 What You Can Do With Sample Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span>Generate advanced charts with AI reasoning</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Discover patterns and correlations</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span>Get statistical insights and analysis</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};