import { blink } from '../blink/client';
import { CSVFile, DataInsight, ChartConfig } from '../types/csv';

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface AIResponse {
  response: string;
  insights: DataInsight[];
  visualizationSuggestions: any[];
  inlineCharts?: ChartConfig[];
  functionCalls?: FunctionCall[];
}

export class LangChainAIService {
  private isInitialized: boolean = true;

  constructor() {
    console.log('LangChain AI service initialized with Blink SDK');
  }

  async processQueryWithFunctionCalling(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    try {
      // Prepare context for AI
      const context = this.prepareDataContext(files, joinedData, databaseData);
      
      // Define available functions for the AI
      const availableFunctions = this.getAvailableFunctions();
      
      // Create a comprehensive prompt with function calling capabilities
      const systemPrompt = `You are an expert data analyst with access to powerful visualization and analysis tools. 

Available Functions:
${availableFunctions.map(f => `- ${f.name}: ${f.description}`).join('\n')}

Data Context:
${context}

When the user asks for visualizations, charts, or data analysis, you should:
1. Analyze the request and determine the best approach
2. Call appropriate functions to generate visualizations
3. Provide clear explanations of your analysis
4. Generate insights based on the data

Always be conversational and explain your reasoning. When creating charts, explain why you chose that chart type and what insights it reveals.`;

      // Use Blink AI with structured prompting for function calling
      const { text } = await blink.ai.generateText({
        prompt: `${systemPrompt}

User Query: "${query}"

Please analyze this request and provide a comprehensive response. If the user is asking for visualizations or charts, determine the best chart type and data to use, then explain your choice.

Respond in this format:
1. First, provide a conversational response explaining what you're doing
2. If creating visualizations, explain your chart choices
3. Provide insights about the data

Available data sources:
${this.getDataSourceSummary(files, joinedData, databaseData)}`,
        maxTokens: 1500
      });

      // Parse the response and determine if we need to generate charts
      const shouldGenerateCharts = this.shouldGenerateVisualization(query, text);
      let inlineCharts: ChartConfig[] = [];
      
      if (shouldGenerateCharts) {
        inlineCharts = await this.generateChartsWithAI(query, files, joinedData, databaseData, text);
      }

      // Extract insights from the response
      const insights = await this.extractInsightsFromResponse(text, files);
      
      // Extract visualization suggestions
      const visualizationSuggestions = this.extractVisualizationSuggestions(text, files, joinedData);

      return {
        response: text,
        insights,
        visualizationSuggestions,
        inlineCharts
      };
    } catch (error) {
      console.error('Error processing query with LangChain AI:', error);
      return this.generateFallbackResponse(query, files, joinedData, databaseData);
    }
  }

  private getAvailableFunctions() {
    return [
      {
        name: 'create_bar_chart',
        description: 'Create a bar chart for categorical data comparison'
      },
      {
        name: 'create_line_chart', 
        description: 'Create a line chart for trend analysis over time'
      },
      {
        name: 'create_pie_chart',
        description: 'Create a pie chart for showing proportions and distributions'
      },
      {
        name: 'create_scatter_plot',
        description: 'Create a scatter plot for correlation analysis between two variables'
      },
      {
        name: 'analyze_data_patterns',
        description: 'Analyze data for patterns, trends, and anomalies'
      },
      {
        name: 'generate_insights',
        description: 'Generate statistical insights and summaries'
      }
    ];
  }

  private shouldGenerateVisualization(query: string, aiResponse: string): boolean {
    const lowerQuery = query.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    const visualizationKeywords = [
      'chart', 'graph', 'plot', 'visualize', 'visualization', 'show me',
      'create', 'generate', 'bar chart', 'line chart', 'pie chart',
      'scatter plot', 'histogram', 'trend', 'distribution', 'compare'
    ];
    
    return visualizationKeywords.some(keyword => 
      lowerQuery.includes(keyword) || lowerResponse.includes(keyword)
    );
  }

  private async generateChartsWithAI(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[],
    aiResponse?: string
  ): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];
    
    // Determine the best data source
    const dataSource = this.selectBestDataSource(files, joinedData, databaseData);
    if (!dataSource) return charts;

    const { data, columns } = dataSource;
    const numericColumns = this.getNumericColumns(data, columns);
    const categoricalColumns = this.getCategoricalColumns(data, columns);

    // Use AI to determine the best chart type and configuration
    try {
      const { text: chartConfig } = await blink.ai.generateText({
        prompt: `Based on the user query "${query}" and the available data, determine the best visualization approach.

Available columns:
- Numeric: ${numericColumns.join(', ')}
- Categorical: ${categoricalColumns.join(', ')}

Data sample: ${JSON.stringify(data.slice(0, 3), null, 2)}

IMPORTANT: You must respond with ONLY a valid JSON object, no additional text or explanations.

Return this exact JSON structure:
{
  "chartType": "bar|line|pie|scatter",
  "xColumn": "column_name",
  "yColumn": "column_name", 
  "title": "Chart Title",
  "description": "Why this chart is appropriate",
  "reasoning": "Explanation of choice"
}

Choose the most appropriate chart type based on the data types and user intent. Return ONLY the JSON object.`,
        maxTokens: 300
      });

      try {
        // Clean the response to extract JSON
        const cleanedConfig = this.extractJSONFromResponse(chartConfig);
        const config = JSON.parse(cleanedConfig);
        
        // Validate the config structure
        if (this.isValidChartConfig(config)) {
          const chart = this.createChartFromConfig(config, data, numericColumns, categoricalColumns);
          if (chart) {
            charts.push(chart);
          }
        } else {
          console.warn('Invalid chart config structure, using fallback');
          charts.push(...this.generateAutomaticCharts(query, data, numericColumns, categoricalColumns));
        }
      } catch (parseError) {
        console.error('Error parsing AI chart config:', {
          error: parseError,
          response: chartConfig,
          query: query
        });
        // Fallback to automatic chart generation
        charts.push(...this.generateAutomaticCharts(query, data, numericColumns, categoricalColumns));
      }
    } catch (error) {
      console.error('Error generating chart config with AI:', error);
      // Fallback to automatic chart generation
      charts.push(...this.generateAutomaticCharts(query, data, numericColumns, categoricalColumns));
    }

    return charts;
  }

  private extractJSONFromResponse(response: string): string {
    // Try to find JSON object or array in the response
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
    
    // Prefer object over array for chart configs
    if (jsonObjectMatch) {
      return jsonObjectMatch[0];
    }
    
    if (jsonArrayMatch) {
      return jsonArrayMatch[0];
    }
    
    // If no JSON found, try to extract between code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }
    
    // Return the original response if no patterns match
    return response.trim();
  }

  private isValidChartConfig(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.chartType === 'string' &&
      ['bar', 'line', 'pie', 'scatter'].includes(config.chartType) &&
      typeof config.xColumn === 'string' &&
      config.xColumn.length > 0
    );
  }

  private createChartFromConfig(
    config: any,
    data: Record<string, any>[],
    numericColumns: string[],
    categoricalColumns: string[]
  ): ChartConfig | null {
    const { chartType, xColumn, yColumn, title, description } = config;

    // Validate columns exist
    if (!data[0] || !(xColumn in data[0])) return null;
    if (yColumn && !(yColumn in data[0])) return null;

    switch (chartType) {
      case 'bar':
        return this.createBarChart(data, xColumn, yColumn || numericColumns[0], title, description);
      case 'line':
        return this.createLineChart(data, xColumn, yColumn || numericColumns[0], title, description);
      case 'pie':
        return this.createPieChart(data, xColumn, title, description);
      case 'scatter':
        return this.createScatterChart(data, xColumn, yColumn || numericColumns[1], title, description);
      default:
        return null;
    }
  }

  private generateAutomaticCharts(
    query: string,
    data: Record<string, any>[],
    numericColumns: string[],
    categoricalColumns: string[]
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const lowerQuery = query.toLowerCase();

    // Generate charts based on query intent and available data
    if ((lowerQuery.includes('bar') || lowerQuery.includes('compare') || lowerQuery.includes('category')) 
        && categoricalColumns.length > 0 && numericColumns.length > 0) {
      charts.push(this.createBarChart(data, categoricalColumns[0], numericColumns[0]));
    }

    if ((lowerQuery.includes('line') || lowerQuery.includes('trend') || lowerQuery.includes('time'))
        && numericColumns.length >= 2) {
      charts.push(this.createLineChart(data, numericColumns[0], numericColumns[1]));
    }

    if ((lowerQuery.includes('pie') || lowerQuery.includes('proportion') || lowerQuery.includes('distribution'))
        && categoricalColumns.length > 0) {
      charts.push(this.createPieChart(data, categoricalColumns[0]));
    }

    if ((lowerQuery.includes('scatter') || lowerQuery.includes('correlation') || lowerQuery.includes('relationship'))
        && numericColumns.length >= 2) {
      charts.push(this.createScatterChart(data, numericColumns[0], numericColumns[1]));
    }

    // If no specific chart type mentioned, create the most appropriate one
    if (charts.length === 0) {
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        charts.push(this.createBarChart(data, categoricalColumns[0], numericColumns[0]));
      } else if (numericColumns.length >= 2) {
        charts.push(this.createScatterChart(data, numericColumns[0], numericColumns[1]));
      }
    }

    return charts;
  }

  private createBarChart(
    data: Record<string, any>[], 
    xColumn: string, 
    yColumn: string,
    title?: string,
    description?: string
  ): ChartConfig {
    // Group data by category and aggregate
    const grouped = data.reduce((acc, row) => {
      const key = String(row[xColumn] || 'Unknown');
      const value = Number(row[yColumn]) || 0;
      
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, count: 0 };
      }
      acc[key].value += value;
      acc[key].count += 1;
      
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

    const chartData = Object.values(grouped)
      .map(item => ({
        name: item.name,
        value: item.count > 1 ? item.value / item.count : item.value // Average if multiple values
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15); // Top 15 for readability

    return {
      type: 'bar',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: title || `${yColumn} by ${xColumn}`,
      description: description || `Bar chart showing ${yColumn} grouped by ${xColumn}. Data is aggregated and sorted by value.`
    };
  }

  private createLineChart(
    data: Record<string, any>[], 
    xColumn: string, 
    yColumn: string,
    title?: string,
    description?: string
  ): ChartConfig {
    const chartData = data
      .map(row => ({
        name: String(row[xColumn] || ''),
        value: Number(row[yColumn]) || 0
      }))
      .filter(item => item.name !== '')
      .sort((a, b) => {
        // Try to sort numerically if possible, otherwise alphabetically
        const aNum = Number(a.name);
        const bNum = Number(b.name);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100); // Limit to 100 points for performance

    return {
      type: 'line',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: title || `${yColumn} Trend Over ${xColumn}`,
      description: description || `Line chart showing how ${yColumn} changes over ${xColumn}. Points are sorted for trend analysis.`
    };
  }

  private createPieChart(
    data: Record<string, any>[], 
    column: string,
    title?: string,
    description?: string
  ): ChartConfig {
    // Count occurrences of each category
    const counts = data.reduce((acc, row) => {
      const key = String(row[column] || 'Unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories for readability

    return {
      type: 'pie',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: title || `${column} Distribution`,
      description: description || `Pie chart showing the distribution of values in ${column}. Shows top 10 categories by frequency.`
    };
  }

  private createScatterChart(
    data: Record<string, any>[], 
    xColumn: string, 
    yColumn: string,
    title?: string,
    description?: string
  ): ChartConfig {
    const chartData = data
      .map(row => ({
        name: `${row[xColumn]}, ${row[yColumn]}`,
        x: Number(row[xColumn]) || 0,
        y: Number(row[yColumn]) || 0
      }))
      .filter(item => !isNaN(item.x) && !isNaN(item.y))
      .slice(0, 500); // Limit to 500 points for performance

    return {
      type: 'scatter',
      data: chartData,
      xColumn: 'x',
      yColumn: 'y',
      title: title || `${xColumn} vs ${yColumn}`,
      description: description || `Scatter plot showing the relationship between ${xColumn} and ${yColumn}. Each point represents one data record.`
    };
  }

  private selectBestDataSource(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): { data: Record<string, any>[]; columns: string[] } | null {
    // Prefer joined data if available and substantial
    if (joinedData && joinedData.length > 0) {
      return {
        data: joinedData,
        columns: Object.keys(joinedData[0] || {})
      };
    }

    // Then database data
    if (databaseData && databaseData.length > 0) {
      return {
        data: databaseData,
        columns: Object.keys(databaseData[0] || {})
      };
    }

    // Finally, use the largest CSV file
    if (files.length > 0) {
      const largestFile = files.reduce((largest, file) => 
        file.rowCount > largest.rowCount ? file : largest
      );
      return {
        data: largestFile.data,
        columns: largestFile.columns
      };
    }

    return null;
  }

  private getNumericColumns(data: Record<string, any>[], columns: string[]): string[] {
    return columns.filter(col => {
      const sampleValues = data.slice(0, 20).map(row => row[col]).filter(v => v != null);
      return sampleValues.length > 0 && sampleValues.every(v => 
        typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null)
      );
    });
  }

  private getCategoricalColumns(data: Record<string, any>[], columns: string[]): string[] {
    const numericColumns = this.getNumericColumns(data, columns);
    return columns.filter(col => !numericColumns.includes(col));
  }

  private getDataSourceSummary(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): string {
    let summary = '';
    
    if (files.length > 0) {
      summary += `CSV Files: ${files.map(f => `${f.name} (${f.rowCount} rows, columns: ${f.columns.join(', ')})`).join('; ')}\n`;
    }
    
    if (joinedData && joinedData.length > 0) {
      summary += `Joined Data: ${joinedData.length} rows, columns: ${Object.keys(joinedData[0] || {}).join(', ')}\n`;
    }
    
    if (databaseData && databaseData.length > 0) {
      summary += `Database Data: ${databaseData.length} rows, columns: ${Object.keys(databaseData[0] || {}).join(', ')}\n`;
    }
    
    return summary;
  }

  private prepareDataContext(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): string {
    let context = '';

    // CSV Files context
    if (files.length > 0) {
      context += 'CSV FILES:\n';
      files.forEach((file, index) => {
        context += `${index + 1}. ${file.name} (${file.rowCount} rows, ${file.columns.length} columns)\n`;
        context += `   Columns: ${file.columns.join(', ')}\n`;
        
        // Sample data
        if (file.data.length > 0) {
          context += `   Sample data: ${JSON.stringify(file.data.slice(0, 2), null, 2)}\n`;
        }
        context += '\n';
      });
    }

    // Joined data context
    if (joinedData && joinedData.length > 0) {
      context += `JOINED DATA:\n`;
      context += `- ${joinedData.length} rows after joining\n`;
      context += `- Columns: ${Object.keys(joinedData[0] || {}).join(', ')}\n`;
      context += `- Sample: ${JSON.stringify(joinedData.slice(0, 1), null, 2)}\n\n`;
    }

    // Database data context
    if (databaseData && databaseData.length > 0) {
      context += `DATABASE DATA:\n`;
      context += `- ${databaseData.length} rows from database\n`;
      context += `- Columns: ${Object.keys(databaseData[0] || {}).join(', ')}\n`;
      context += `- Sample: ${JSON.stringify(databaseData.slice(0, 1), null, 2)}\n\n`;
    }

    return context;
  }

  private async extractInsightsFromResponse(response: string, files: CSVFile[]): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];

    // Use AI to extract structured insights from the response
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Extract key insights from this data analysis response and format them as structured insights:

"${response}"

Return a JSON array of insights in this format:
[
  {
    "type": "pattern|correlation|anomaly|trend|summary",
    "title": "Brief insight title",
    "description": "Detailed description",
    "confidence": 0.0-1.0
  }
]

Focus on actionable insights, patterns, and key findings.`,
        maxTokens: 500
      });

      try {
        const aiInsights = JSON.parse(text);
        if (Array.isArray(aiInsights)) {
          aiInsights.forEach((insight, index) => {
            insights.push({
              id: `insight_${Date.now()}_${index}`,
              type: insight.type || 'summary',
              title: insight.title || 'AI-Generated Insight',
              description: insight.description || 'Analysis completed',
              confidence: insight.confidence || 0.8,
              createdAt: new Date()
            });
          });
        }
      } catch (parseError) {
        console.error('Error parsing AI insights:', parseError);
      }
    } catch (error) {
      console.error('Error extracting insights with AI:', error);
    }

    // Fallback: simple pattern matching
    if (insights.length === 0) {
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.includes('insight') || line.includes('pattern') || line.includes('trend')) {
          insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'pattern',
            title: 'AI-Generated Insight',
            description: line.trim(),
            confidence: 0.7,
            createdAt: new Date()
          });
        }
      }
    }

    // Ensure at least one insight
    if (insights.length === 0) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'summary',
        title: 'Analysis Complete',
        description: 'AI has successfully analyzed your data and provided comprehensive insights.',
        confidence: 1.0,
        createdAt: new Date()
      });
    }

    return insights;
  }

  private extractVisualizationSuggestions(
    response: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[]
  ): any[] {
    const suggestions: any[] = [];
    const lowerResponse = response.toLowerCase();

    // Extract chart type suggestions
    const chartTypes = ['bar', 'line', 'scatter', 'pie', 'histogram', 'heatmap'];
    
    for (const chartType of chartTypes) {
      if (lowerResponse.includes(chartType)) {
        suggestions.push({
          type: chartType,
          title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart Suggestion`,
          description: `Consider creating a ${chartType} chart based on the analysis`,
          confidence: 0.7
        });
      }
    }

    return suggestions;
  }

  private generateFallbackResponse(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): AIResponse {
    const lowerQuery = query.toLowerCase();
    let response = '';
    let inlineCharts: ChartConfig[] = [];

    // Generate contextual fallback responses
    if (lowerQuery.includes('chart') || lowerQuery.includes('visualiz')) {
      response = `I'll create a visualization for you based on your data! Let me analyze your datasets and generate the most appropriate chart.\n\n📊 **Creating Visualization:**\nAnalyzing your data structure to determine the best chart type...`;
      
      // Try to generate a fallback chart
      const dataSource = this.selectBestDataSource(files, joinedData, databaseData);
      if (dataSource) {
        const { data, columns } = dataSource;
        const numericColumns = this.getNumericColumns(data, columns);
        const categoricalColumns = this.getCategoricalColumns(data, columns);
        
        if (categoricalColumns.length > 0 && numericColumns.length > 0) {
          inlineCharts = [this.createBarChart(data, categoricalColumns[0], numericColumns[0])];
        } else if (numericColumns.length >= 2) {
          inlineCharts = [this.createScatterChart(data, numericColumns[0], numericColumns[1])];
        }
      }
    } else {
      response = `I understand you're asking about "${query}". Based on your data, I can help you with analysis, visualizations, and insights. Your datasets contain valuable information that we can explore together!\n\n🔍 **What I can help with:**\n• Create interactive charts and visualizations\n• Analyze patterns and trends\n• Generate statistical insights\n• Find relationships between data points\n\nTry asking me to create a specific chart or analyze particular aspects of your data!`;
    }

    return {
      response,
      insights: [{
        id: `insight_${Date.now()}`,
        type: 'summary',
        title: 'Ready to Analyze',
        description: 'AI is ready to help you explore and visualize your data.',
        confidence: 1.0,
        createdAt: new Date()
      }],
      visualizationSuggestions: [],
      inlineCharts
    };
  }
}