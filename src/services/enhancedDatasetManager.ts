import { blink } from '../blink/client';
import { CSVFile, DataInsight } from '../types/csv';

export interface SavedDataset {
  id: string;
  name: string;
  description?: string;
  files: CSVFile[];
  joinedData?: Record<string, any>[];
  insights: DataInsight[];
  charts: SavedChart[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'histogram';
  config: {
    dataSource: string;
    xAxis: string;
    yAxis?: string;
    filters?: Record<string, any>;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    customization?: {
      colors?: string[];
      title?: string;
      subtitle?: string;
      showLegend?: boolean;
      showGrid?: boolean;
    };
  };
  data: Record<string, any>[];
  aiPrompt?: string;
  formulaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartFormula {
  id: string;
  name: string;
  description: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'histogram';
  template: string;
  requiredColumns: {
    xAxis: { type: 'string' | 'number' | 'date'; required: boolean };
    yAxis?: { type: 'string' | 'number' | 'date'; required: boolean };
  };
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  createdAt: Date;
  updatedAt: Date;
}

export class EnhancedDatasetManager {
  // Save dataset using Blink database
  static async saveDataset(dataset: Omit<SavedDataset, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the first file for backward compatibility with existing table structure
      const firstFile = dataset.files[0];
      
      const savedDataset = {
        id: datasetId,
        name: dataset.name,
        description: dataset.description || '',
        fileName: firstFile?.name || 'combined_dataset',
        columns: JSON.stringify(firstFile?.columns || []),
        rowCount: firstFile?.rowCount || 0,
        data: JSON.stringify(firstFile?.data || []),
        relationships: JSON.stringify([]),
        filesData: JSON.stringify(dataset.files),
        joinedData: JSON.stringify(dataset.joinedData || []),
        insightsData: JSON.stringify(dataset.insights),
        chartsData: JSON.stringify(dataset.charts),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.id
      };

      await blink.db.datasets.create(savedDataset);
      return datasetId;
    } catch (error) {
      console.error('Error saving dataset:', error);
      throw error;
    }
  }

  // Load dataset
  static async loadDataset(datasetId: string): Promise<SavedDataset | null> {
    try {
      const user = await blink.auth.me();
      
      const datasets = await blink.db.datasets.list({
        where: { id: datasetId, userId: user.id }
      });

      if (datasets.length === 0) return null;

      const dataset = datasets[0];
      
      // Handle both old and new data formats
      let files = [];
      let joinedData = [];
      let insights = [];
      let charts = [];
      
      try {
        files = dataset.filesData ? JSON.parse(dataset.filesData) : [{
          id: dataset.id,
          name: dataset.fileName || 'dataset',
          columns: JSON.parse(dataset.columns || '[]'),
          rowCount: dataset.rowCount || 0,
          data: JSON.parse(dataset.data || '[]')
        }];
        joinedData = dataset.joinedData ? JSON.parse(dataset.joinedData) : [];
        insights = dataset.insightsData ? JSON.parse(dataset.insightsData) : [];
        charts = dataset.chartsData ? JSON.parse(dataset.chartsData) : [];
      } catch (parseError) {
        console.warn('Error parsing dataset JSON fields:', parseError);
        // Fallback to basic structure
        files = [{
          id: dataset.id,
          name: dataset.fileName || 'dataset',
          columns: [],
          rowCount: dataset.rowCount || 0,
          data: []
        }];
      }
      
      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        files,
        joinedData,
        insights,
        charts,
        createdAt: new Date(dataset.createdAt),
        updatedAt: new Date(dataset.updatedAt),
        userId: dataset.userId
      };
    } catch (error) {
      console.error('Error loading dataset:', error);
      throw error;
    }
  }

  // List user datasets
  static async listDatasets(): Promise<SavedDataset[]> {
    try {
      const user = await blink.auth.me();
      
      const datasets = await blink.db.datasets.list({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' }
      });

      return datasets.map(dataset => {
        // Handle both old and new data formats
        let files = [];
        let joinedData = [];
        let insights = [];
        let charts = [];
        
        try {
          files = dataset.filesData ? JSON.parse(dataset.filesData) : [{
            id: dataset.id,
            name: dataset.fileName || 'dataset',
            columns: JSON.parse(dataset.columns || '[]'),
            rowCount: dataset.rowCount || 0,
            data: JSON.parse(dataset.data || '[]')
          }];
          joinedData = dataset.joinedData ? JSON.parse(dataset.joinedData) : [];
          insights = dataset.insightsData ? JSON.parse(dataset.insightsData) : [];
          charts = dataset.chartsData ? JSON.parse(dataset.chartsData) : [];
        } catch (parseError) {
          console.warn('Error parsing dataset JSON fields:', parseError);
          // Fallback to basic structure
          files = [{
            id: dataset.id,
            name: dataset.fileName || 'dataset',
            columns: [],
            rowCount: dataset.rowCount || 0,
            data: []
          }];
        }
        
        return {
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          files,
          joinedData,
          insights,
          charts,
          createdAt: new Date(dataset.createdAt),
          updatedAt: new Date(dataset.updatedAt),
          userId: dataset.userId
        };
      });
    } catch (error) {
      console.error('Error listing datasets:', error);
      return [];
    }
  }

  // Update dataset
  static async updateDataset(datasetId: string, updates: Partial<SavedDataset>): Promise<void> {
    try {
      const user = await blink.auth.me();
      
      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.files) {
        updateData.filesData = JSON.stringify(updates.files);
        // Update main file data for backward compatibility
        const firstFile = updates.files[0];
        if (firstFile) {
          updateData.fileName = firstFile.name;
          updateData.columns = JSON.stringify(firstFile.columns);
          updateData.rowCount = firstFile.rowCount;
          updateData.data = JSON.stringify(firstFile.data);
        }
      }
      if (updates.joinedData) updateData.joinedData = JSON.stringify(updates.joinedData);
      if (updates.insights) updateData.insightsData = JSON.stringify(updates.insights);
      if (updates.charts) updateData.chartsData = JSON.stringify(updates.charts);

      await blink.db.datasets.update(datasetId, updateData);
    } catch (error) {
      console.error('Error updating dataset:', error);
      throw error;
    }
  }

  // Delete dataset
  static async deleteDataset(datasetId: string): Promise<void> {
    try {
      const user = await blink.auth.me();
      
      // Delete related charts first
      const charts = await blink.db.savedCharts.list({
        where: { datasetId: datasetId, userId: user.id }
      });
      
      for (const chart of charts) {
        await blink.db.savedCharts.delete(chart.id);
      }

      // Delete dataset
      await blink.db.datasets.delete(datasetId);
    } catch (error) {
      console.error('Error deleting dataset:', error);
      throw error;
    }
  }

  // Save chart
  static async saveChart(
    datasetId: string, 
    chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'>,
    formulaId?: string
  ): Promise<string> {
    try {
      const user = await blink.auth.me();
      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const savedChart = {
        id: chartId,
        datasetId,
        name: chart.name,
        type: chart.type,
        formulaId: formulaId || null,
        configData: JSON.stringify(chart.config),
        chartData: JSON.stringify(chart.data),
        aiPrompt: chart.aiPrompt || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.id
      };

      await blink.db.savedCharts.create(savedChart);
      return chartId;
    } catch (error) {
      console.error('Error saving chart:', error);
      throw error;
    }
  }

  // Load charts for dataset
  static async loadCharts(datasetId: string): Promise<SavedChart[]> {
    try {
      const user = await blink.auth.me();
      
      const charts = await blink.db.savedCharts.list({
        where: { datasetId, userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      return charts.map(chart => ({
        id: chart.id,
        name: chart.name,
        type: chart.type,
        formulaId: chart.formulaId,
        config: JSON.parse(chart.configData),
        data: JSON.parse(chart.chartData),
        aiPrompt: chart.aiPrompt,
        createdAt: new Date(chart.createdAt),
        updatedAt: new Date(chart.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading charts:', error);
      return [];
    }
  }

  // Save chart formula
  static async saveChartFormula(formula: Omit<ChartFormula, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const formulaId = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const savedFormula = {
        id: formulaId,
        name: formula.name,
        description: formula.description,
        chartType: formula.chartType,
        template: formula.template,
        requiredColumns: JSON.stringify(formula.requiredColumns),
        aggregation: formula.aggregation || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.id
      };

      await blink.db.chartFormulas.create(savedFormula);
      return formulaId;
    } catch (error) {
      console.error('Error saving chart formula:', error);
      throw error;
    }
  }

  // List chart formulas
  static async listChartFormulas(): Promise<ChartFormula[]> {
    try {
      const user = await blink.auth.me();
      
      const formulas = await blink.db.chartFormulas.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      return formulas.map(formula => ({
        id: formula.id,
        name: formula.name,
        description: formula.description,
        chartType: formula.chartType,
        template: formula.template,
        requiredColumns: JSON.parse(formula.requiredColumns),
        aggregation: formula.aggregation,
        createdAt: new Date(formula.createdAt),
        updatedAt: new Date(formula.updatedAt)
      }));
    } catch (error) {
      console.error('Error listing chart formulas:', error);
      return [];
    }
  }

  // Apply chart formula to data
  static async applyChartFormula(
    formulaId: string, 
    data: Record<string, any>[], 
    columnMapping: Record<string, string>
  ): Promise<{ chartConfig: any; processedData: Record<string, any>[] }> {
    try {
      const user = await blink.auth.me();
      
      const formulas = await blink.db.chartFormulas.list({
        where: { id: formulaId, userId: user.id }
      });

      if (formulas.length === 0) {
        throw new Error('Chart formula not found');
      }

      const formula = formulas[0];
      const parsedFormula: ChartFormula = {
        id: formula.id,
        name: formula.name,
        description: formula.description,
        chartType: formula.chartType,
        template: formula.template,
        requiredColumns: JSON.parse(formula.requiredColumns),
        aggregation: formula.aggregation,
        createdAt: new Date(formula.createdAt),
        updatedAt: new Date(formula.updatedAt)
      };

      // Process data according to formula
      let processedData = [...data];

      // Apply aggregation if needed
      if (parsedFormula.aggregation && columnMapping.xAxis && columnMapping.yAxis) {
        const grouped = new Map<string, number[]>();
        
        processedData.forEach(row => {
          const key = String(row[columnMapping.xAxis]);
          const value = Number(row[columnMapping.yAxis]) || 0;
          
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(value);
        });

        processedData = Array.from(grouped.entries()).map(([key, values]) => {
          let aggregatedValue: number;
          switch (parsedFormula.aggregation) {
            case 'sum':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'min':
              aggregatedValue = Math.min(...values);
              break;
            case 'max':
              aggregatedValue = Math.max(...values);
              break;
            default:
              aggregatedValue = values[0];
          }

          return {
            [columnMapping.xAxis]: key,
            [columnMapping.yAxis]: aggregatedValue
          };
        });
      }

      const chartConfig = {
        type: parsedFormula.chartType,
        xAxis: columnMapping.xAxis,
        yAxis: columnMapping.yAxis,
        aggregation: parsedFormula.aggregation,
        title: parsedFormula.name,
        description: parsedFormula.description
      };

      return { chartConfig, processedData };
    } catch (error) {
      console.error('Error applying chart formula:', error);
      throw error;
    }
  }

  // Export dataset as CSV
  static async exportDatasetAsCSV(datasetId: string, includeJoinedData: boolean = false): Promise<string> {
    try {
      const dataset = await this.loadDataset(datasetId);
      if (!dataset) throw new Error('Dataset not found');

      const dataToExport = includeJoinedData && dataset.joinedData?.length 
        ? dataset.joinedData 
        : dataset.files[0]?.data || [];

      if (dataToExport.length === 0) return '';

      // Convert to CSV format
      const headers = Object.keys(dataToExport[0]);
      const csvRows = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting dataset as CSV:', error);
      throw error;
    }
  }

  // Initialize default chart formulas
  static async initializeDefaultFormulas(): Promise<void> {
    try {
      const user = await blink.auth.me();
      
      const defaultFormulas: Omit<ChartFormula, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          name: 'Sales by Category',
          description: 'Bar chart showing sales amounts grouped by category',
          chartType: 'bar',
          requiredColumns: {
            xAxis: { type: 'string', required: true },
            yAxis: { type: 'number', required: true }
          },
          aggregation: 'sum',
          template: 'Create a bar chart showing {yAxis} by {xAxis}. Group the data by {xAxis} and sum the {yAxis} values.'
        },
        {
          name: 'Trend Over Time',
          description: 'Line chart showing trends over time periods',
          chartType: 'line',
          requiredColumns: {
            xAxis: { type: 'date', required: true },
            yAxis: { type: 'number', required: true }
          },
          template: 'Create a line chart showing {yAxis} trends over {xAxis}. Display the data chronologically.'
        },
        {
          name: 'Distribution Pie Chart',
          description: 'Pie chart showing distribution of categories',
          chartType: 'pie',
          requiredColumns: {
            xAxis: { type: 'string', required: true },
            yAxis: { type: 'number', required: false }
          },
          aggregation: 'count',
          template: 'Create a pie chart showing the distribution of {xAxis}. If {yAxis} is provided, use it as the value, otherwise count occurrences.'
        }
      ];

      // Check if formulas already exist
      const existingFormulas = await this.listChartFormulas();
      
      for (const formula of defaultFormulas) {
        const exists = existingFormulas.some(existing => existing.name === formula.name);
        if (!exists) {
          await this.saveChartFormula(formula);
        }
      }
    } catch (error) {
      console.error('Error initializing default formulas:', error);
    }
  }
}