import { blink } from '../blink/client';

export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'histogram';
  aiPrompt: string;
  requiredDataStructure: {
    minRows: number;
    requiredColumns: string[];
    optionalColumns: string[];
    dataTypes: Record<string, 'string' | 'number' | 'date'>;
  };
  defaultConfig: {
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartGenerationRequest {
  datasetId: string;
  naturalLanguageRequest: string;
  data: Record<string, any>[];
  preferredChartType?: string;
  columnHints?: {
    xAxis?: string;
    yAxis?: string;
    category?: string;
  };
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

export interface ChartGenerationResult {
  chartId: string;
  chartConfig: any;
  processedData: Record<string, any>[];
  aiPrompt: string;
  formulaId?: string;
  insights: string[];
}

export class ChartStorageService {
  private static instance: ChartStorageService;
  private static readonly TABLE_CHART_TEMPLATES = 'chart_templates';

  private constructor() {}

  static getInstance(): ChartStorageService {
    if (!ChartStorageService.instance) {
      ChartStorageService.instance = new ChartStorageService();
    }
    return ChartStorageService.instance;
  }

  // Initialize chart templates table
  static async initializeTables(): Promise<void> {
    try {
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_CHART_TEMPLATES} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          chart_type TEXT NOT NULL,
          ai_prompt TEXT NOT NULL,
          required_data_structure TEXT NOT NULL,
          default_config TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      // Create chart formulas table
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS chart_formulas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          chart_type TEXT NOT NULL,
          template TEXT NOT NULL,
          required_columns TEXT NOT NULL,
          aggregation TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      // Note: saved_charts table is automatically created by Blink SDK

      // Insert default templates and formulas
      await this.insertDefaultTemplates();
      await this.insertDefaultChartFormulas();

      console.log('Chart templates and formulas tables initialized successfully');
    } catch (error) {
      console.error('Error initializing chart templates table:', error);
      throw error;
    }
  }

  // Insert default chart templates
  private static async insertDefaultTemplates(): Promise<void> {
    const defaultTemplates: Omit<ChartTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Sales Performance Bar Chart',
        description: 'Compare sales performance across categories, regions, or time periods',
        chartType: 'bar',
        aiPrompt: 'Create a bar chart showing {yAxis} by {xAxis}. Use colors to distinguish categories and include data labels for clarity.',
        requiredDataStructure: {
          minRows: 2,
          requiredColumns: ['category', 'value'],
          optionalColumns: ['subcategory', 'date', 'region'],
          dataTypes: {
            category: 'string',
            value: 'number',
            date: 'date',
            region: 'string'
          }
        },
        defaultConfig: {
          colors: ['#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706'],
          showLegend: true,
          showGrid: true,
          aggregation: 'sum'
        }
      },
      {
        name: 'Trend Analysis Line Chart',
        description: 'Show trends and patterns over time',
        chartType: 'line',
        aiPrompt: 'Create a line chart showing {yAxis} trends over {xAxis}. Highlight significant changes and patterns.',
        requiredDataStructure: {
          minRows: 3,
          requiredColumns: ['date', 'value'],
          optionalColumns: ['category', 'forecast'],
          dataTypes: {
            date: 'date',
            value: 'number',
            category: 'string'
          }
        },
        defaultConfig: {
          colors: ['#2563eb', '#7c3aed'],
          showLegend: true,
          showGrid: true
        }
      },
      {
        name: 'Market Share Pie Chart',
        description: 'Display proportional data and market share',
        chartType: 'pie',
        aiPrompt: 'Create a pie chart showing the distribution of {category}. Include percentages and highlight the largest segments.',
        requiredDataStructure: {
          minRows: 2,
          requiredColumns: ['category', 'value'],
          optionalColumns: ['subcategory'],
          dataTypes: {
            category: 'string',
            value: 'number'
          }
        },
        defaultConfig: {
          colors: ['#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', '#db2777'],
          showLegend: true,
          aggregation: 'sum'
        }
      },
      {
        name: 'Correlation Scatter Plot',
        description: 'Analyze relationships between two numeric variables',
        chartType: 'scatter',
        aiPrompt: 'Create a scatter plot showing the relationship between {xAxis} and {yAxis}. Identify correlations and outliers.',
        requiredDataStructure: {
          minRows: 5,
          requiredColumns: ['x_value', 'y_value'],
          optionalColumns: ['category', 'size'],
          dataTypes: {
            x_value: 'number',
            y_value: 'number',
            category: 'string',
            size: 'number'
          }
        },
        defaultConfig: {
          colors: ['#2563eb'],
          showGrid: true
        }
      },
      {
        name: 'Distribution Histogram',
        description: 'Show frequency distribution of numeric data',
        chartType: 'histogram',
        aiPrompt: 'Create a histogram showing the distribution of {xAxis}. Use appropriate bin sizes and highlight the distribution shape.',
        requiredDataStructure: {
          minRows: 10,
          requiredColumns: ['value'],
          optionalColumns: ['category'],
          dataTypes: {
            value: 'number',
            category: 'string'
          }
        },
        defaultConfig: {
          colors: ['#7c3aed'],
          showGrid: true
        }
      }
    ];

    try {
      const user = await blink.auth.me();
      
      for (const template of defaultTemplates) {
        const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if template already exists
        const existing = await blink.db.sql(`
          SELECT id FROM ${this.TABLE_CHART_TEMPLATES} 
          WHERE name = ? AND user_id = ?
        `, [template.name, user.id]);

        if (existing.length === 0) {
          await blink.db.sql(`
            INSERT INTO ${this.TABLE_CHART_TEMPLATES} (
              id, name, description, chart_type, ai_prompt, 
              required_data_structure, default_config, created_at, updated_at, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            templateId,
            template.name,
            template.description,
            template.chartType,
            template.aiPrompt,
            JSON.stringify(template.requiredDataStructure),
            JSON.stringify(template.defaultConfig),
            new Date().toISOString(),
            new Date().toISOString(),
            user.id
          ]);
        }
      }
    } catch (error) {
      console.error('Error inserting default chart templates:', error);
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
      }
    ];

    try {
      const user = await blink.auth.me();
      
      for (const formula of defaultFormulas) {
        const formulaId = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if formula already exists
        const existing = await blink.db.sql(`
          SELECT id FROM chart_formulas 
          WHERE name = ? AND user_id = ?
        `, [formula.name, user.id]);

        if (existing.length === 0) {
          await blink.db.sql(`
            INSERT INTO chart_formulas (
              id, name, description, chart_type, template, 
              required_columns, aggregation, created_at, updated_at, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            formulaId,
            formula.name,
            formula.description,
            formula.chartType,
            formula.template,
            JSON.stringify(formula.requiredColumns),
            formula.aggregation || null,
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

  // Generate chart using AI and templates
  async generateChart(request: ChartGenerationRequest): Promise<ChartGenerationResult> {
    try {
      // Analyze data structure
      const dataAnalysis = this.analyzeDataStructure(request.data);
      
      // Find best matching template or formula
      const bestTemplate = await this.findBestTemplate(
        request.naturalLanguageRequest,
        dataAnalysis,
        request.preferredChartType
      );

      // Generate chart configuration using AI
      const chartConfig = await this.generateChartConfig(
        request.naturalLanguageRequest,
        request.data,
        bestTemplate,
        request.columnHints
      );

      // Process data according to configuration
      const processedData = this.processDataForChart(request.data, chartConfig);

      // Generate insights about the chart
      const insights = await this.generateChartInsights(processedData, chartConfig);

      // Save the chart
      const chartId = await this.saveChart(
        request.datasetId,
        {
          name: chartConfig.title || 'Generated Chart',
          type: chartConfig.type,
          config: {
            dataSource: 'dataset',
            xAxis: chartConfig.xAxis,
            yAxis: chartConfig.yAxis,
            filters: chartConfig.filters,
            aggregation: chartConfig.aggregation,
            customization: {
              colors: chartConfig.colors,
              title: chartConfig.title,
              subtitle: chartConfig.subtitle,
              showLegend: chartConfig.showLegend,
              showGrid: chartConfig.showGrid
            }
          },
          data: processedData,
          aiPrompt: request.naturalLanguageRequest
        },
        bestTemplate?.formulaId
      );

      return {
        chartId,
        chartConfig,
        processedData,
        aiPrompt: request.naturalLanguageRequest,
        formulaId: bestTemplate?.formulaId,
        insights
      };
    } catch (error) {
      console.error('Error generating chart:', error);
      throw error;
    }
  }

  // Analyze data structure to understand what charts are possible
  private analyzeDataStructure(data: Record<string, any>[]): {
    rowCount: number;
    columns: string[];
    numericColumns: string[];
    stringColumns: string[];
    dateColumns: string[];
    dataTypes: Record<string, 'string' | 'number' | 'date'>;
  } {
    if (data.length === 0) {
      return {
        rowCount: 0,
        columns: [],
        numericColumns: [],
        stringColumns: [],
        dateColumns: [],
        dataTypes: {}
      };
    }

    const columns = Object.keys(data[0]);
    const numericColumns: string[] = [];
    const stringColumns: string[] = [];
    const dateColumns: string[] = [];
    const dataTypes: Record<string, 'string' | 'number' | 'date'> = {};

    columns.forEach(col => {
      const sampleValues = data.slice(0, 10).map(row => row[col]).filter(v => v != null);
      
      if (sampleValues.length === 0) {
        dataTypes[col] = 'string';
        stringColumns.push(col);
        return;
      }

      // Check if it's a date
      const isDate = sampleValues.some(v => {
        const date = new Date(v);
        return !isNaN(date.getTime()) && typeof v === 'string' && v.match(/\d{4}-\d{2}-\d{2}/);
      });

      if (isDate) {
        dataTypes[col] = 'date';
        dateColumns.push(col);
        return;
      }

      // Check if it's numeric
      const isNumeric = sampleValues.every(v => !isNaN(Number(v)));
      
      if (isNumeric) {
        dataTypes[col] = 'number';
        numericColumns.push(col);
      } else {
        dataTypes[col] = 'string';
        stringColumns.push(col);
      }
    });

    return {
      rowCount: data.length,
      columns,
      numericColumns,
      stringColumns,
      dateColumns,
      dataTypes
    };
  }

  // Find the best template or formula for the request
  private async findBestTemplate(
    naturalLanguageRequest: string,
    dataAnalysis: any,
    preferredChartType?: string
  ): Promise<{ templateId?: string; formulaId?: string; template?: ChartTemplate; formula?: ChartFormula } | null> {
    try {
      // Get available templates and formulas
      const [templates, formulas] = await Promise.all([
        this.listChartTemplates(),
        this.listChartFormulas()
      ]);

      // Use AI to find the best match
      const prompt = `Based on the user request and data structure, recommend the best chart template or formula.

User Request: "${naturalLanguageRequest}"

Data Analysis:
- Row Count: ${dataAnalysis.rowCount}
- Numeric Columns: ${dataAnalysis.numericColumns.join(', ')}
- String Columns: ${dataAnalysis.stringColumns.join(', ')}
- Date Columns: ${dataAnalysis.dateColumns.join(', ')}

Available Templates:
${templates.map(t => `- ${t.name}: ${t.description} (${t.chartType})`).join('\n')}

Available Formulas:
${formulas.map(f => `- ${f.name}: ${f.description} (${f.chartType})`).join('\n')}

${preferredChartType ? `Preferred Chart Type: ${preferredChartType}` : ''}

Return the best match as JSON:
{
  "type": "template|formula",
  "id": "template_or_formula_id",
  "reason": "explanation of why this is the best match"
}`;

      const { object } = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['template', 'formula'] },
            id: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['type', 'id', 'reason']
        }
      });

      if (object.type === 'template') {
        const template = templates.find(t => t.id === object.id);
        return template ? { templateId: object.id, template } : null;
      } else {
        const formula = formulas.find(f => f.id === object.id);
        return formula ? { formulaId: object.id, formula } : null;
      }
    } catch (error) {
      console.error('Error finding best template:', error);
      return null;
    }
  }

  // Generate chart configuration using AI
  private async generateChartConfig(
    naturalLanguageRequest: string,
    data: Record<string, any>[],
    bestMatch: any,
    columnHints?: any
  ): Promise<any> {
    try {
      const dataAnalysis = this.analyzeDataStructure(data);
      const sampleData = data.slice(0, 5);

      const prompt = `Generate a chart configuration based on the user request and data.

User Request: "${naturalLanguageRequest}"

Data Structure:
- Columns: ${dataAnalysis.columns.join(', ')}
- Numeric Columns: ${dataAnalysis.numericColumns.join(', ')}
- String Columns: ${dataAnalysis.stringColumns.join(', ')}
- Date Columns: ${dataAnalysis.dateColumns.join(', ')}

Sample Data:
${JSON.stringify(sampleData, null, 2)}

${bestMatch?.template ? `Template: ${bestMatch.template.name} - ${bestMatch.template.description}` : ''}
${bestMatch?.formula ? `Formula: ${bestMatch.formula.name} - ${bestMatch.formula.description}` : ''}

${columnHints ? `Column Hints: ${JSON.stringify(columnHints)}` : ''}

Generate a chart configuration as JSON:
{
  "type": "bar|line|pie|scatter|area|histogram",
  "title": "Chart Title",
  "subtitle": "Chart Subtitle (optional)",
  "xAxis": "column_name",
  "yAxis": "column_name",
  "aggregation": "sum|avg|count|min|max",
  "filters": {},
  "colors": ["#color1", "#color2"],
  "showLegend": true,
  "showGrid": true
}`;

      const { object } = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            xAxis: { type: 'string' },
            yAxis: { type: 'string' },
            aggregation: { type: 'string' },
            filters: { type: 'object' },
            colors: { type: 'array', items: { type: 'string' } },
            showLegend: { type: 'boolean' },
            showGrid: { type: 'boolean' }
          },
          required: ['type', 'title', 'xAxis']
        }
      });

      return object;
    } catch (error) {
      console.error('Error generating chart config:', error);
      throw error;
    }
  }

  // Process data according to chart configuration
  private processDataForChart(data: Record<string, any>[], config: any): Record<string, any>[] {
    let processedData = [...data];

    // Apply filters if any
    if (config.filters && Object.keys(config.filters).length > 0) {
      processedData = processedData.filter(row => {
        return Object.entries(config.filters).every(([key, value]) => {
          return row[key] === value;
        });
      });
    }

    // Apply aggregation if needed
    if (config.aggregation && config.xAxis && config.yAxis) {
      const grouped = new Map<string, number[]>();
      
      processedData.forEach(row => {
        const key = String(row[config.xAxis]);
        const value = Number(row[config.yAxis]) || 0;
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(value);
      });

      processedData = Array.from(grouped.entries()).map(([key, values]) => {
        let aggregatedValue: number;
        switch (config.aggregation) {
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
          [config.xAxis]: key,
          [config.yAxis]: aggregatedValue
        };
      });
    }

    // Limit data for performance
    return processedData.slice(0, 1000);
  }

  // Generate insights about the chart
  private async generateChartInsights(data: Record<string, any>[], config: any): Promise<string[]> {
    try {
      const prompt = `Analyze this chart data and provide 3-5 key insights.

Chart Type: ${config.type}
Chart Title: ${config.title}
Data Points: ${data.length}

Sample Data:
${JSON.stringify(data.slice(0, 10), null, 2)}

Provide insights as an array of strings:
["Insight 1", "Insight 2", "Insight 3"]`;

      const { object } = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['insights']
        }
      });

      return object.insights || [];
    } catch (error) {
      console.error('Error generating chart insights:', error);
      return [];
    }
  }

  // List chart templates
  async listChartTemplates(): Promise<ChartTemplate[]> {
    try {
      const user = await blink.auth.me();
      
      const result = await blink.db.sql(`
        SELECT * FROM ${ChartStorageService.TABLE_CHART_TEMPLATES} 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        chartType: row.chart_type,
        aiPrompt: row.ai_prompt,
        requiredDataStructure: JSON.parse(row.required_data_structure),
        defaultConfig: JSON.parse(row.default_config),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error listing chart templates:', error);
      return [];
    }
  }

  // Save custom chart template
  async saveChartTemplate(template: Omit<ChartTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await blink.db.sql(`
        INSERT INTO ${ChartStorageService.TABLE_CHART_TEMPLATES} (
          id, name, description, chart_type, ai_prompt, 
          required_data_structure, default_config, created_at, updated_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        templateId,
        template.name,
        template.description,
        template.chartType,
        template.aiPrompt,
        JSON.stringify(template.requiredDataStructure),
        JSON.stringify(template.defaultConfig),
        new Date().toISOString(),
        new Date().toISOString(),
        user.id
      ]);

      return templateId;
    } catch (error) {
      console.error('Error saving chart template:', error);
      throw error;
    }
  }

  // List chart formulas
  async listChartFormulas(): Promise<ChartFormula[]> {
    try {
      const user = await blink.auth.me();
      
      const result = await blink.db.sql(`
        SELECT * FROM chart_formulas 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        chartType: row.chart_type,
        template: row.template,
        requiredColumns: JSON.parse(row.required_columns),
        aggregation: row.aggregation,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error listing chart formulas:', error);
      return [];
    }
  }

  // Save chart
  async saveChart(
    datasetId: string, 
    chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'>,
    formulaId?: string
  ): Promise<string> {
    try {
      const user = await blink.auth.me();
      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use Blink SDK to save chart - this should match the schema used by EnhancedDatasetManager
      const savedChart = {
        id: chartId,
        datasetId: datasetId || 'default',
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

  // Get user charts
  async getUserCharts(): Promise<SavedChart[]> {
    try {
      const user = await blink.auth.me();
      
      // Use Blink SDK to query saved charts - this should match the schema used by EnhancedDatasetManager
      const charts = await blink.db.savedCharts.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      // Handle empty result
      if (!charts || !Array.isArray(charts)) {
        return [];
      }

      return charts.map(chart => ({
        id: chart.id,
        name: chart.name || 'Untitled Chart',
        type: chart.type || 'bar',
        formulaId: chart.formulaId,
        config: chart.configData ? JSON.parse(chart.configData) : {
          dataSource: 'dataset',
          xAxis: '',
          yAxis: '',
          filters: {},
          customization: {}
        },
        data: chart.chartData ? JSON.parse(chart.chartData) : [],
        aiPrompt: chart.aiPrompt || '',
        createdAt: new Date(chart.createdAt),
        updatedAt: new Date(chart.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading user charts:', error);
      return [];
    }
  }
}