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

export interface ChartFormula {
  id: string;
  name: string;
  description: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'histogram';
  requiredColumns: {
    xAxis: { type: 'string' | 'number' | 'date'; required: boolean };
    yAxis?: { type: 'string' | 'number' | 'date'; required: boolean };
    category?: { type: 'string' | 'number'; required: boolean };
  };
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: {
    column: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
    value: any;
  }[];
  template: string; // AI prompt template for generating this chart
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'histogram';
  formulaId?: string; // Reference to chart formula
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
  aiPrompt?: string; // The AI prompt used to generate this chart
  createdAt: Date;
  updatedAt: Date;
}

export interface DatasetUpdate {
  id: string;
  data: Record<string, any>[];
  updatedColumns?: string[];
  changeLog: {
    action: 'insert' | 'update' | 'delete';
    rowsAffected: number;
    timestamp: Date;
    description: string;
  }[];
}

export class DatasetManager {
  private static readonly TABLE_DATASETS = 'datasets';
  private static readonly TABLE_CHARTS = 'saved_charts';
  private static readonly TABLE_CHART_FORMULAS = 'chart_formulas';
  private static readonly TABLE_DATASET_UPDATES = 'dataset_updates';

  // Initialize database tables
  static async initializeTables(): Promise<void> {
    try {
      // Create datasets table
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_DATASETS} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          files_data TEXT NOT NULL,
          joined_data TEXT,
          insights_data TEXT NOT NULL,
          charts_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      // Create chart formulas table
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_CHART_FORMULAS} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          chart_type TEXT NOT NULL,
          required_columns TEXT NOT NULL,
          aggregation TEXT,
          filters TEXT,
          template TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      // Create charts table
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_CHARTS} (
          id TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          formula_id TEXT,
          config_data TEXT NOT NULL,
          chart_data TEXT NOT NULL,
          ai_prompt TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          FOREIGN KEY (dataset_id) REFERENCES ${this.TABLE_DATASETS}(id),
          FOREIGN KEY (formula_id) REFERENCES ${this.TABLE_CHART_FORMULAS}(id)
        )
      `);

      // Create dataset updates table
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_DATASET_UPDATES} (
          id TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL,
          data_snapshot TEXT NOT NULL,
          updated_columns TEXT,
          change_log TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          FOREIGN KEY (dataset_id) REFERENCES ${this.TABLE_DATASETS}(id)
        )
      `);

      // Insert default chart formulas
      await this.insertDefaultChartFormulas();

      console.log('Dataset management tables initialized successfully');
    } catch (error) {
      console.error('Error initializing dataset tables:', error);
      throw error;
    }
  }

  // Insert default chart formulas
  private static async insertDefaultChartFormulas(): Promise<void> {
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
      },
      {
        name: 'Correlation Scatter',
        description: 'Scatter plot showing correlation between two numeric variables',
        chartType: 'scatter',
        requiredColumns: {
          xAxis: { type: 'number', required: true },
          yAxis: { type: 'number', required: true }
        },
        template: 'Create a scatter plot showing the relationship between {xAxis} and {yAxis}.'
      },
      {
        name: 'Value Distribution',
        description: 'Histogram showing distribution of numeric values',
        chartType: 'histogram',
        requiredColumns: {
          xAxis: { type: 'number', required: true }
        },
        template: 'Create a histogram showing the distribution of {xAxis} values. Use appropriate bin sizes.'
      }
    ];

    try {
      const user = await blink.auth.me();
      
      for (const formula of defaultFormulas) {
        const formulaId = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if formula already exists
        const existing = await blink.db.sql(`
          SELECT id FROM ${this.TABLE_CHART_FORMULAS} 
          WHERE name = ? AND user_id = ?
        `, [formula.name, user.id]);

        if (existing.length === 0) {
          await blink.db.sql(`
            INSERT INTO ${this.TABLE_CHART_FORMULAS} (
              id, name, description, chart_type, required_columns, 
              aggregation, filters, template, created_at, updated_at, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            formulaId,
            formula.name,
            formula.description,
            formula.chartType,
            JSON.stringify(formula.requiredColumns),
            formula.aggregation || null,
            JSON.stringify(formula.filters || []),
            formula.template,
            new Date().toISOString(),
            new Date().toISOString(),
            user.id
          ]);
        }
      }
    } catch (error) {
      console.error('Error inserting default chart formulas:', error);
    }
  }

  // Save dataset
  static async saveDataset(dataset: Omit<SavedDataset, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const savedDataset: SavedDataset = {
        ...dataset,
        id: datasetId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id
      };

      await blink.db.sql(`
        INSERT INTO ${this.TABLE_DATASETS} (
          id, name, description, files_data, joined_data, insights_data, 
          charts_data, created_at, updated_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        savedDataset.id,
        savedDataset.name,
        savedDataset.description || '',
        JSON.stringify(savedDataset.files),
        JSON.stringify(savedDataset.joinedData || []),
        JSON.stringify(savedDataset.insights),
        JSON.stringify(savedDataset.charts),
        savedDataset.createdAt.toISOString(),
        savedDataset.updatedAt.toISOString(),
        savedDataset.userId
      ]);

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
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_DATASETS} 
        WHERE id = ? AND user_id = ?
      `, [datasetId, user.id]);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        files: JSON.parse(row.files_data),
        joinedData: JSON.parse(row.joined_data),
        insights: JSON.parse(row.insights_data),
        charts: JSON.parse(row.charts_data),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        userId: row.user_id
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
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_DATASETS} 
        WHERE user_id = ? 
        ORDER BY updated_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        files: JSON.parse(row.files_data),
        joinedData: JSON.parse(row.joined_data),
        insights: JSON.parse(row.insights_data),
        charts: JSON.parse(row.charts_data),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        userId: row.user_id
      }));
    } catch (error) {
      console.error('Error listing datasets:', error);
      throw error;
    }
  }

  // Save chart formula
  static async saveChartFormula(formula: Omit<ChartFormula, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const formulaId = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_CHART_FORMULAS} (
          id, name, description, chart_type, required_columns, 
          aggregation, filters, template, created_at, updated_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        formulaId,
        formula.name,
        formula.description,
        formula.chartType,
        JSON.stringify(formula.requiredColumns),
        formula.aggregation || null,
        JSON.stringify(formula.filters || []),
        formula.template,
        new Date().toISOString(),
        new Date().toISOString(),
        user.id
      ]);

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
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_CHART_FORMULAS} 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        chartType: row.chart_type,
        requiredColumns: JSON.parse(row.required_columns),
        aggregation: row.aggregation,
        filters: JSON.parse(row.filters || '[]'),
        template: row.template,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error listing chart formulas:', error);
      throw error;
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
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_CHART_FORMULAS} 
        WHERE id = ? AND user_id = ?
      `, [formulaId, user.id]);

      if (result.length === 0) {
        throw new Error('Chart formula not found');
      }

      const formula: ChartFormula = {
        id: result[0].id,
        name: result[0].name,
        description: result[0].description,
        chartType: result[0].chart_type,
        requiredColumns: JSON.parse(result[0].required_columns),
        aggregation: result[0].aggregation,
        filters: JSON.parse(result[0].filters || '[]'),
        template: result[0].template,
        createdAt: new Date(result[0].created_at),
        updatedAt: new Date(result[0].updated_at)
      };

      // Validate column mapping
      const requiredCols = Object.keys(formula.requiredColumns);
      for (const reqCol of requiredCols) {
        if (formula.requiredColumns[reqCol].required && !columnMapping[reqCol]) {
          throw new Error(`Required column mapping missing: ${reqCol}`);
        }
      }

      // Process data according to formula
      let processedData = [...data];

      // Apply filters if any
      if (formula.filters && formula.filters.length > 0) {
        processedData = processedData.filter(row => {
          return formula.filters!.every(filter => {
            const value = row[columnMapping[filter.column] || filter.column];
            switch (filter.operator) {
              case 'equals':
                return value === filter.value;
              case 'contains':
                return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
              case 'greater':
                return Number(value) > Number(filter.value);
              case 'less':
                return Number(value) < Number(filter.value);
              default:
                return true;
            }
          });
        });
      }

      // Apply aggregation if needed
      if (formula.aggregation && columnMapping.xAxis && columnMapping.yAxis) {
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
          switch (formula.aggregation) {
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
        type: formula.chartType,
        xAxis: columnMapping.xAxis,
        yAxis: columnMapping.yAxis,
        aggregation: formula.aggregation,
        title: formula.name,
        description: formula.description
      };

      return { chartConfig, processedData };
    } catch (error) {
      console.error('Error applying chart formula:', error);
      throw error;
    }
  }

  // Save chart with formula reference
  static async saveChart(
    datasetId: string, 
    chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'>,
    formulaId?: string
  ): Promise<string> {
    try {
      const user = await blink.auth.me();
      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_CHARTS} (
          id, dataset_id, name, type, formula_id, config_data, 
          chart_data, ai_prompt, created_at, updated_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        chartId,
        datasetId,
        chart.name,
        chart.type,
        formulaId || null,
        JSON.stringify(chart.config),
        JSON.stringify(chart.data),
        chart.aiPrompt || null,
        new Date().toISOString(),
        new Date().toISOString(),
        user.id
      ]);

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
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_CHARTS} 
        WHERE dataset_id = ? AND user_id = ? 
        ORDER BY created_at DESC
      `, [datasetId, user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        formulaId: row.formula_id,
        config: JSON.parse(row.config_data),
        data: JSON.parse(row.chart_data),
        aiPrompt: row.ai_prompt,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error loading charts:', error);
      throw error;
    }
  }

  // Update dataset
  static async updateDataset(datasetId: string, updates: Partial<SavedDataset>): Promise<void> {
    try {
      const user = await blink.auth.me();
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.files) {
        updateFields.push('files_data = ?');
        updateValues.push(JSON.stringify(updates.files));
      }
      if (updates.joinedData) {
        updateFields.push('joined_data = ?');
        updateValues.push(JSON.stringify(updates.joinedData));
      }
      if (updates.insights) {
        updateFields.push('insights_data = ?');
        updateValues.push(JSON.stringify(updates.insights));
      }
      if (updates.charts) {
        updateFields.push('charts_data = ?');
        updateValues.push(JSON.stringify(updates.charts));
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(datasetId, user.id);

      await blink.db.sql(`
        UPDATE ${this.TABLE_DATASETS} 
        SET ${updateFields.join(', ')} 
        WHERE id = ? AND user_id = ?
      `, updateValues);
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
      await blink.db.sql(`
        DELETE FROM ${this.TABLE_CHARTS} 
        WHERE dataset_id = ? AND user_id = ?
      `, [datasetId, user.id]);

      // Delete dataset updates
      await blink.db.sql(`
        DELETE FROM ${this.TABLE_DATASET_UPDATES} 
        WHERE dataset_id = ? AND user_id = ?
      `, [datasetId, user.id]);

      // Delete dataset
      await blink.db.sql(`
        DELETE FROM ${this.TABLE_DATASETS} 
        WHERE id = ? AND user_id = ?
      `, [datasetId, user.id]);
    } catch (error) {
      console.error('Error deleting dataset:', error);
      throw error;
    }
  }

  // Update CSV data
  static async updateCSVData(
    datasetId: string, 
    fileId: string, 
    newData: Record<string, any>[],
    changeDescription: string
  ): Promise<void> {
    try {
      const user = await blink.auth.me();
      const dataset = await this.loadDataset(datasetId);
      
      if (!dataset) throw new Error('Dataset not found');

      // Find and update the specific file
      const fileIndex = dataset.files.findIndex(f => f.id === fileId);
      if (fileIndex === -1) throw new Error('File not found in dataset');

      const oldData = dataset.files[fileIndex].data;
      dataset.files[fileIndex].data = newData;
      dataset.files[fileIndex].rowCount = newData.length;

      // Create change log
      const changeLog = {
        action: 'update' as const,
        rowsAffected: newData.length,
        timestamp: new Date(),
        description: changeDescription
      };

      // Save dataset update
      const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_DATASET_UPDATES} (
          id, dataset_id, data_snapshot, change_log, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        updateId,
        datasetId,
        JSON.stringify(newData),
        JSON.stringify([changeLog]),
        new Date().toISOString(),
        user.id
      ]);

      // Update the dataset
      await this.updateDataset(datasetId, { files: dataset.files });
    } catch (error) {
      console.error('Error updating CSV data:', error);
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
}