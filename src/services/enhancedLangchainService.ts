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

export class EnhancedLangChainService {
  private isInitialized: boolean = true;

  constructor() {
    console.log('Enhanced LangChain AI service initialized with advanced function calling');
  }

  async processQueryWithAdvancedFunctionCalling(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    try {
      // Prepare comprehensive context
      const context = this.prepareAdvancedDataContext(files, joinedData, databaseData);
      
      // Define enhanced function definitions
      const functionDefinitions = this.getEnhancedFunctionDefinitions();
      
      // Create advanced system prompt with function calling
      const systemPrompt = this.createAdvancedSystemPrompt(functionDefinitions, context);

      // Use Blink AI with enhanced prompting
      const { text } = await blink.ai.generateText({
        prompt: `${systemPrompt}\n\nUser Query: "${query}"\n\nPlease analyze this request and provide a comprehensive response with appropriate visualizations.`,
        maxTokens: 2000,
        search: this.shouldUseWebSearch(query)
      });

      // Process the AI response and extract function calls
      const functionCalls = this.extractFunctionCalls(text, query);
      
      // Execute function calls to generate charts (limit to 1-2 charts per request)
      const inlineCharts = await this.executeFunctionCalls(
        functionCalls.slice(0, 2), // Limit to max 2 charts per request
        files, 
        joinedData, 
        databaseData, 
        query
      );

      // Generate enhanced insights
      const insights = await this.generateEnhancedInsights(text, files, inlineCharts);
      
      // Extract visualization suggestions
      const visualizationSuggestions = this.extractAdvancedVisualizationSuggestions(text, files);

      return {
        response: this.enhanceResponseWithChartExplanations(text, inlineCharts),
        insights,
        visualizationSuggestions,
        inlineCharts,
        functionCalls
      };
    } catch (error) {
      console.error('Error in enhanced LangChain processing:', error);
      
      // Provide more specific error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Falling back to enhanced fallback response due to: ${errorMessage}`);
      
      return this.generateEnhancedFallbackResponse(query, files, joinedData, databaseData);
    }
  }

  private createAdvancedSystemPrompt(functionDefinitions: any[], context: string): string {
    return `You are an expert data scientist and visualization specialist with access to advanced analytical tools.

AVAILABLE FUNCTIONS:
${functionDefinitions.map(f => `• ${f.name}: ${f.description}\n  Parameters: ${JSON.stringify(f.parameters)}`).join('\n')}

DATA CONTEXT:
${context}

INSTRUCTIONS:
1. Analyze the user's request to understand their intent
2. Determine the most appropriate visualization(s) for their data
3. Explain your reasoning for chart selection
4. Provide insights about what the visualization reveals
5. Be conversational and educational

CHART SELECTION GUIDELINES:
• Bar charts: Comparing categories, showing rankings
• Line charts: Trends over time, continuous data
• Pie charts: Proportions, parts of a whole (max 8 categories)
• Scatter plots: Relationships between two numeric variables

Always explain WHY you chose a specific chart type and what insights it provides.`;
  }

  private getEnhancedFunctionDefinitions() {
    return [
      {
        name: 'create_comparative_bar_chart',
        description: 'Create a bar chart for comparing categorical data with advanced grouping',
        parameters: {
          xColumn: 'string - categorical column for x-axis',
          yColumn: 'string - numeric column for y-axis',
          groupBy: 'string - optional column for grouping/coloring',
          sortBy: 'string - sort order: asc, desc, or none'
        }
      },
      {
        name: 'create_trend_line_chart',
        description: 'Create a line chart for trend analysis with time series support',
        parameters: {
          xColumn: 'string - column for x-axis (preferably time/date)',
          yColumn: 'string - numeric column for y-axis',
          smoothing: 'boolean - apply trend smoothing'
        }
      },
      {
        name: 'create_distribution_pie_chart',
        description: 'Create a pie chart for showing proportions and distributions',
        parameters: {
          column: 'string - categorical column to analyze',
          maxCategories: 'number - maximum categories to show (default 8)'
        }
      },
      {
        name: 'create_correlation_scatter_plot',
        description: 'Create a scatter plot for analyzing relationships between variables',
        parameters: {
          xColumn: 'string - numeric column for x-axis',
          yColumn: 'string - numeric column for y-axis',
          colorBy: 'string - optional categorical column for coloring points'
        }
      },
      {
        name: 'analyze_data_patterns',
        description: 'Perform statistical analysis to identify patterns and anomalies',
        parameters: {
          columns: 'array - columns to analyze',
          analysisType: 'string - correlation, distribution, or outliers'
        }
      }
    ];
  }

  private shouldUseWebSearch(query: string): boolean {
    const webSearchKeywords = [
      'latest', 'current', 'recent', 'news', 'trends', 'market',
      'industry', 'benchmark', 'compare with', 'standard'
    ];
    
    return webSearchKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }

  private extractFunctionCalls(aiResponse: string, query: string): FunctionCall[] {
    const functionCalls: FunctionCall[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // Enhanced pattern matching for function calls
    const patterns = [
      { keywords: ['bar chart', 'bar graph', 'compare', 'comparison'], function: 'create_comparative_bar_chart' },
      { keywords: ['line chart', 'trend', 'time series', 'over time'], function: 'create_trend_line_chart' },
      { keywords: ['pie chart', 'distribution', 'proportion', 'percentage'], function: 'create_distribution_pie_chart' },
      { keywords: ['scatter plot', 'correlation', 'relationship', 'scatter'], function: 'create_correlation_scatter_plot' },
      { keywords: ['analyze', 'pattern', 'statistical', 'insights'], function: 'analyze_data_patterns' }
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => lowerQuery.includes(keyword) || lowerResponse.includes(keyword))) {
        functionCalls.push({
          name: pattern.function,
          arguments: this.inferFunctionArguments(pattern.function, query, aiResponse)
        });
      }
    }

    // If no specific function detected, default to the most appropriate one
    if (functionCalls.length === 0) {
      functionCalls.push({
        name: 'create_comparative_bar_chart',
        arguments: { sortBy: 'desc' }
      });
    }

    return functionCalls;
  }

  private inferFunctionArguments(functionName: string, query: string, aiResponse: string): Record<string, any> {
    const lowerQuery = query.toLowerCase();
    
    switch (functionName) {
      case 'create_comparative_bar_chart':
        return {
          sortBy: lowerQuery.includes('highest') || lowerQuery.includes('top') ? 'desc' : 'asc'
        };
      case 'create_trend_line_chart':
        return {
          smoothing: lowerQuery.includes('smooth') || lowerQuery.includes('trend')
        };
      case 'create_distribution_pie_chart':
        return {
          maxCategories: lowerQuery.includes('top') ? 5 : 8
        };
      case 'create_correlation_scatter_plot':
        return {};
      case 'analyze_data_patterns':
        return {
          analysisType: lowerQuery.includes('correlation') ? 'correlation' : 'distribution'
        };
      default:
        return {};
    }
  }

  private async executeFunctionCalls(
    functionCalls: FunctionCall[],
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[],
    originalQuery?: string
  ): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];
    
    // Get the best data source
    const dataSource = this.selectOptimalDataSource(files, joinedData, databaseData);
    if (!dataSource) return charts;

    const { data, columns } = dataSource;
    const numericColumns = this.getNumericColumns(data, columns);
    const categoricalColumns = this.getCategoricalColumns(data, columns);

    for (const functionCall of functionCalls) {
      try {
        const chart = await this.executeSpecificFunction(
          functionCall,
          data,
          numericColumns,
          categoricalColumns,
          originalQuery
        );
        
        if (chart) {
          charts.push(chart);
        }
      } catch (error) {
        console.error(`Error executing function ${functionCall.name}:`, error);
      }
    }

    return charts;
  }

  private async executeSpecificFunction(
    functionCall: FunctionCall,
    data: Record<string, any>[],
    numericColumns: string[],
    categoricalColumns: string[],
    originalQuery?: string
  ): Promise<ChartConfig | null> {
    const { name, arguments: args } = functionCall;

    switch (name) {
      case 'create_comparative_bar_chart':
        return this.createAdvancedBarChart(
          data,
          args.xColumn || categoricalColumns[0],
          args.yColumn || numericColumns[0],
          args.sortBy || 'desc',
          originalQuery
        );

      case 'create_trend_line_chart':
        return this.createAdvancedLineChart(
          data,
          args.xColumn || numericColumns[0],
          args.yColumn || numericColumns[1] || numericColumns[0],
          args.smoothing || false,
          originalQuery
        );

      case 'create_distribution_pie_chart':
        return this.createAdvancedPieChart(
          data,
          args.column || categoricalColumns[0],
          args.maxCategories || 8,
          originalQuery
        );

      case 'create_correlation_scatter_plot':
        return this.createAdvancedScatterChart(
          data,
          args.xColumn || numericColumns[0],
          args.yColumn || numericColumns[1],
          args.colorBy,
          originalQuery
        );

      default:
        return null;
    }
  }

  private createAdvancedBarChart(
    data: Record<string, any>[],
    xColumn: string,
    yColumn: string,
    sortBy: string = 'desc',
    originalQuery?: string
  ): ChartConfig {
    // Advanced data processing with aggregation
    const grouped = data.reduce((acc, row) => {
      const key = String(row[xColumn] || 'Unknown');
      const value = Number(row[yColumn]) || 0;
      
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, count: 0, sum: 0 };
      }
      acc[key].sum += value;
      acc[key].count += 1;
      acc[key].value = acc[key].sum / acc[key].count; // Average
      
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number; sum: number }>);

    let chartData = Object.values(grouped);
    
    // Apply sorting
    if (sortBy === 'desc') {
      chartData = chartData.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'asc') {
      chartData = chartData.sort((a, b) => a.value - b.value);
    }
    
    // Limit to top 15 for readability
    chartData = chartData.slice(0, 15);

    return {
      type: 'bar',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${yColumn} by ${xColumn}`,
      description: `Advanced bar chart showing ${yColumn} grouped by ${xColumn}. Data is aggregated (averaged) and sorted ${sortBy}ending. Shows top ${chartData.length} categories with ${data.length} total data points analyzed.`
    };
  }

  private createAdvancedLineChart(
    data: Record<string, any>[],
    xColumn: string,
    yColumn: string,
    smoothing: boolean = false,
    originalQuery?: string
  ): ChartConfig {
    let chartData = data
      .map(row => ({
        name: String(row[xColumn] || ''),
        value: Number(row[yColumn]) || 0,
        originalX: row[xColumn]
      }))
      .filter(item => item.name !== '')
      .sort((a, b) => {
        // Smart sorting for different data types
        const aNum = Number(a.originalX);
        const bNum = Number(b.originalX);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        // Try date parsing
        const aDate = new Date(a.originalX);
        const bDate = new Date(b.originalX);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100);

    // Apply smoothing if requested
    if (smoothing && chartData.length > 3) {
      chartData = this.applyMovingAverage(chartData, 3);
    }

    return {
      type: 'line',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${yColumn} Trend Over ${xColumn}${smoothing ? ' (Smoothed)' : ''}`,
      description: `Advanced line chart showing how ${yColumn} changes over ${xColumn}. ${smoothing ? 'Applied 3-point moving average smoothing. ' : ''}Data is intelligently sorted and limited to ${chartData.length} points for optimal visualization.`
    };
  }

  private createAdvancedPieChart(
    data: Record<string, any>[],
    column: string,
    maxCategories: number = 8,
    originalQuery?: string
  ): ChartConfig {
    // Count occurrences with advanced grouping
    const counts = data.reduce((acc, row) => {
      const key = String(row[column] || 'Unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let chartData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Group small categories into "Others" if there are too many
    if (chartData.length > maxCategories) {
      const topCategories = chartData.slice(0, maxCategories - 1);
      const othersCount = chartData.slice(maxCategories - 1).reduce((sum, item) => sum + item.value, 0);
      
      if (othersCount > 0) {
        topCategories.push({ name: 'Others', value: othersCount });
      }
      
      chartData = topCategories;
    }

    return {
      type: 'pie',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${column} Distribution`,
      description: `Advanced pie chart showing the distribution of values in ${column}. Shows top ${chartData.length} categories from ${data.length} total records. ${chartData.find(d => d.name === 'Others') ? 'Small categories are grouped into "Others".' : ''}`
    };
  }

  private createAdvancedScatterChart(
    data: Record<string, any>[],
    xColumn: string,
    yColumn: string,
    colorBy?: string,
    originalQuery?: string
  ): ChartConfig {
    const chartData = data
      .map((row, index) => ({
        name: `Point ${index + 1}`,
        x: Number(row[xColumn]) || 0,
        y: Number(row[yColumn]) || 0,
        category: colorBy ? String(row[colorBy]) : 'Data',
        originalData: row
      }))
      .filter(item => !isNaN(item.x) && !isNaN(item.y))
      .slice(0, 500);

    // Calculate correlation coefficient
    const correlation = this.calculateCorrelation(
      chartData.map(d => d.x),
      chartData.map(d => d.y)
    );

    return {
      type: 'scatter',
      data: chartData,
      xColumn: 'x',
      yColumn: 'y',
      title: `${xColumn} vs ${yColumn}${colorBy ? ` (colored by ${colorBy})` : ''}`,
      description: `Advanced scatter plot analyzing the relationship between ${xColumn} and ${yColumn}. Correlation coefficient: ${correlation.toFixed(3)} (${this.interpretCorrelation(correlation)}). Shows ${chartData.length} data points${colorBy ? ` with color coding by ${colorBy}` : ''}.`
    };
  }

  private applyMovingAverage(data: any[], windowSize: number): any[] {
    if (data.length < windowSize) return data;
    
    const smoothed = [...data];
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, item) => sum + item.value, 0) / windowSize;
      smoothed[i] = { ...smoothed[i], value: average };
    }
    
    return smoothed;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private interpretCorrelation(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'very strong correlation';
    if (abs >= 0.6) return 'strong correlation';
    if (abs >= 0.4) return 'moderate correlation';
    if (abs >= 0.2) return 'weak correlation';
    return 'very weak correlation';
  }

  private selectOptimalDataSource(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): { data: Record<string, any>[]; columns: string[] } | null {
    // Prioritize data sources by quality and completeness
    const sources = [];
    
    if (joinedData && joinedData.length > 0) {
      sources.push({
        data: joinedData,
        columns: Object.keys(joinedData[0] || {}),
        score: joinedData.length * 3 // Highest priority
      });
    }
    
    if (databaseData && databaseData.length > 0) {
      sources.push({
        data: databaseData,
        columns: Object.keys(databaseData[0] || {}),
        score: databaseData.length * 2
      });
    }
    
    files.forEach(file => {
      sources.push({
        data: file.data,
        columns: file.columns,
        score: file.rowCount
      });
    });
    
    // Select the source with the highest score
    const bestSource = sources.sort((a, b) => b.score - a.score)[0];
    return bestSource || null;
  }

  private getNumericColumns(data: Record<string, any>[], columns: string[]): string[] {
    return columns.filter(col => {
      const sampleValues = data.slice(0, 50).map(row => row[col]).filter(v => v != null);
      if (sampleValues.length === 0) return false;
      
      const numericCount = sampleValues.filter(v => 
        typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null)
      ).length;
      
      return numericCount / sampleValues.length > 0.8; // 80% numeric threshold
    });
  }

  private getCategoricalColumns(data: Record<string, any>[], columns: string[]): string[] {
    const numericColumns = this.getNumericColumns(data, columns);
    return columns.filter(col => !numericColumns.includes(col));
  }

  private prepareAdvancedDataContext(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): string {
    let context = 'COMPREHENSIVE DATA ANALYSIS CONTEXT:\n\n';

    // Analyze data quality and structure
    const totalRows = files.reduce((sum, f) => sum + f.rowCount, 0) + 
                     (joinedData?.length || 0) + 
                     (databaseData?.length || 0);
    
    context += `📊 DATASET OVERVIEW:\n`;
    context += `• Total data points: ${totalRows.toLocaleString()}\n`;
    context += `• Data sources: ${files.length} CSV files${joinedData ? ' + joined data' : ''}${databaseData ? ' + database' : ''}\n\n`;

    // CSV Files analysis
    if (files.length > 0) {
      context += '📁 CSV FILES ANALYSIS:\n';
      files.forEach((file, index) => {
        const numericCols = this.getNumericColumns(file.data, file.columns);
        const categoricalCols = this.getCategoricalColumns(file.data, file.columns);
        
        context += `${index + 1}. ${file.name}\n`;
        context += `   • Rows: ${file.rowCount.toLocaleString()}\n`;
        context += `   • Numeric columns (${numericCols.length}): ${numericCols.join(', ')}\n`;
        context += `   • Categorical columns (${categoricalCols.length}): ${categoricalCols.join(', ')}\n`;
        
        if (file.data.length > 0) {
          context += `   • Sample: ${JSON.stringify(file.data[0], null, 2)}\n`;
        }
        context += '\n';
      });
    }

    // Joined data analysis
    if (joinedData && joinedData.length > 0) {
      const columns = Object.keys(joinedData[0] || {});
      const numericCols = this.getNumericColumns(joinedData, columns);
      const categoricalCols = this.getCategoricalColumns(joinedData, columns);
      
      context += '🔗 JOINED DATA ANALYSIS:\n';
      context += `• Combined rows: ${joinedData.length.toLocaleString()}\n`;
      context += `• Numeric columns (${numericCols.length}): ${numericCols.join(', ')}\n`;
      context += `• Categorical columns (${categoricalCols.length}): ${categoricalCols.join(', ')}\n`;
      context += `• Sample: ${JSON.stringify(joinedData[0], null, 2)}\n\n`;
    }

    // Database data analysis
    if (databaseData && databaseData.length > 0) {
      const columns = Object.keys(databaseData[0] || {});
      const numericCols = this.getNumericColumns(databaseData, columns);
      const categoricalCols = this.getCategoricalColumns(databaseData, columns);
      
      context += '🗄️ DATABASE DATA ANALYSIS:\n';
      context += `• Database rows: ${databaseData.length.toLocaleString()}\n`;
      context += `• Numeric columns (${numericCols.length}): ${numericCols.join(', ')}\n`;
      context += `• Categorical columns (${categoricalCols.length}): ${categoricalCols.join(', ')}\n`;
      context += `• Sample: ${JSON.stringify(databaseData[0], null, 2)}\n\n`;
    }

    return context;
  }

  private async generateEnhancedInsights(
    response: string,
    files: CSVFile[],
    charts: ChartConfig[]
  ): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];

    try {
      // Use AI to generate structured insights
      const { text } = await blink.ai.generateText({
        prompt: `Based on this data analysis and visualizations, extract key insights:\n\nAnalysis: "${response}"\n\nCharts created: ${charts.map(c => `${c.type} chart: ${c.title}`).join(', ')}\n\nIMPORTANT: You must respond with ONLY a valid JSON array, no additional text or explanations.\n\nGenerate 3-5 actionable insights in this exact JSON format:\n[\n  {\n    "type": "pattern|correlation|anomaly|trend|summary",\n    "title": "Brief insight title",\n    "description": "Detailed actionable description",\n    "confidence": 0.0-1.0\n  }\n]\n\nFocus on business-relevant insights and patterns. Return ONLY the JSON array.`,
        maxTokens: 800
      });

      try {
        // Clean the response to extract JSON
        const cleanedText = this.extractJSONFromResponse(text);
        
        // Validate that we have a non-empty JSON string
        if (!cleanedText || cleanedText.trim() === '[]') {
          console.warn('No valid JSON insights found in AI response, using fallback');
        } else {
          const aiInsights = JSON.parse(cleanedText);
          
          if (Array.isArray(aiInsights) && aiInsights.length > 0) {
            aiInsights.forEach((insight, index) => {
              // Validate insight structure
              if (insight && typeof insight === 'object') {
                insights.push({
                  id: `enhanced_insight_${Date.now()}_${index}`,
                  type: this.validateInsightType(insight.type) || 'summary',
                  title: String(insight.title || 'AI-Generated Insight').substring(0, 100),
                  description: String(insight.description || 'Analysis completed').substring(0, 500),
                  confidence: Math.min(Math.max(Number(insight.confidence) || 0.8, 0), 1),
                  createdAt: new Date()
                });
              }
            });
          } else {
            console.warn('AI response did not contain valid insights array');
          }
        }
      } catch (parseError) {
        console.error('Error parsing enhanced insights JSON:', {
          error: parseError,
          response: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
          cleanedText: this.extractJSONFromResponse(text)
        });
        
        // Add a fallback insight when parsing fails
        insights.push({
          id: `fallback_insight_${Date.now()}`,
          type: 'summary',
          title: 'Analysis Completed',
          description: 'AI analysis completed successfully. The system encountered a formatting issue with detailed insights, but the analysis results are available.',
          confidence: 0.7,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error generating enhanced insights:', error);
    }

    // Add chart-specific insights
    charts.forEach((chart, index) => {
      insights.push({
        id: `chart_insight_${Date.now()}_${index}`,
        type: 'pattern',
        title: `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart Analysis`,
        description: chart.description || `Generated ${chart.type} chart showing ${chart.title}`,
        confidence: 0.9,
        createdAt: new Date()
      });
    });

    return insights;
  }

  private extractAdvancedVisualizationSuggestions(
    response: string,
    files: CSVFile[]
  ): any[] {
    const suggestions: any[] = [];
    const lowerResponse = response.toLowerCase();

    // Advanced pattern matching for suggestions
    const suggestionPatterns = [
      { keywords: ['histogram', 'distribution'], type: 'histogram', confidence: 0.8 },
      { keywords: ['heatmap', 'correlation matrix'], type: 'heatmap', confidence: 0.9 },
      { keywords: ['box plot', 'outliers'], type: 'boxplot', confidence: 0.7 },
      { keywords: ['time series', 'temporal'], type: 'timeseries', confidence: 0.8 }
    ];

    for (const pattern of suggestionPatterns) {
      if (pattern.keywords.some(keyword => lowerResponse.includes(keyword))) {
        suggestions.push({
          type: pattern.type,
          title: `${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} Visualization`,
          description: `Consider creating a ${pattern.type} for deeper analysis`,
          confidence: pattern.confidence
        });
      }
    }

    return suggestions;
  }

  private enhanceResponseWithChartExplanations(response: string, charts: ChartConfig[]): string {
    if (charts.length === 0) return response;

    let enhancedResponse = response;
    
    enhancedResponse += '\n\n📊 **Generated Visualizations:**\n';
    charts.forEach((chart, index) => {
      enhancedResponse += `\n${index + 1}. **${chart.title}** (${chart.type} chart)\n`;
      enhancedResponse += `   ${chart.description}\n`;
    });

    enhancedResponse += '\n💡 **How to interpret these charts:**\n';
    enhancedResponse += '• Click the expand button to view charts in full screen\n';
    enhancedResponse += '• Use the save button to store charts for future reference\n';
    enhancedResponse += '• Download the underlying data as CSV for further analysis\n';

    return enhancedResponse;
  }

  private extractJSONFromResponse(response: string): string {
    // Clean the response first
    const cleanResponse = response.trim();
    
    // Try to find JSON array first (most common for insights)
    const jsonArrayMatches = [
      // Match JSON array with proper bracket balancing
      cleanResponse.match(/\[(?:[^[\]]*|\[[^\]]*\])*\]/),
      // Match JSON array in code blocks
      cleanResponse.match(/```(?:json)?\s*(\[(?:[^[\]]*|\[[^\]]*\])*\])\s*```/),
      // Match JSON array with newlines and escapes
      cleanResponse.match(/\[[\s\S]*?\]/),
    ];
    
    for (const match of jsonArrayMatches) {
      if (match) {
        const jsonStr = match[1] || match[0];
        if (this.isValidJSONString(jsonStr)) {
          return jsonStr;
        }
      }
    }
    
    // Try to find JSON object
    const jsonObjectMatches = [
      // Match JSON object with proper brace balancing
      cleanResponse.match(/\{(?:[^{}]*|\{[^}]*\})*\}/),
      // Match JSON object in code blocks
      cleanResponse.match(/```(?:json)?\s*(\{(?:[^{}]*|\{[^}]*\})*\})\s*```/),
      // Match JSON object with newlines
      cleanResponse.match(/\{[\s\S]*?\}/),
    ];
    
    for (const match of jsonObjectMatches) {
      if (match) {
        const jsonStr = match[1] || match[0];
        if (this.isValidJSONString(jsonStr)) {
          // Wrap single object in array for consistency
          return `[${jsonStr}]`;
        }
      }
    }
    
    // If no valid JSON found, return empty array
    console.warn('No valid JSON found in response, returning empty array');
    return '[]';
  }

  private isValidJSONString(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private validateInsightType(type: any): string | null {
    const validTypes = ['pattern', 'correlation', 'anomaly', 'trend', 'summary'];
    if (typeof type === 'string' && validTypes.includes(type.toLowerCase())) {
      return type.toLowerCase();
    }
    return null;
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

  private generateEnhancedFallbackResponse(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): AIResponse {
    const lowerQuery = query.toLowerCase();
    let response = '';
    let inlineCharts: ChartConfig[] = [];

    // Generate contextual fallback with chart
    const dataSource = this.selectOptimalDataSource(files, joinedData, databaseData);
    
    if (dataSource) {
      const { data, columns } = dataSource;
      const numericColumns = this.getNumericColumns(data, columns);
      const categoricalColumns = this.getCategoricalColumns(data, columns);
      
      response = `I understand you're asking about "${query}". Let me analyze your data and create an appropriate visualization.\n\n📊 **Data Analysis:**\n• Dataset contains ${data.length.toLocaleString()} rows\n• Found ${numericColumns.length} numeric columns: ${numericColumns.join(', ')}\n• Found ${categoricalColumns.length} categorical columns: ${categoricalColumns.join(', ')}\n\n🎯 **Generated Visualization:**\nBased on your data structure, I've created the most suitable chart to help you explore your data.`;
      
      // Generate appropriate fallback chart
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        inlineCharts = [this.createAdvancedBarChart(data, categoricalColumns[0], numericColumns[0], 'desc', query)];
      } else if (numericColumns.length >= 2) {
        inlineCharts = [this.createAdvancedScatterChart(data, numericColumns[0], numericColumns[1], undefined, query)];
      } else if (categoricalColumns.length > 0) {
        inlineCharts = [this.createAdvancedPieChart(data, categoricalColumns[0], 8, query)];
      }
    } else {
      response = `I'm ready to help you analyze your data! Please upload CSV files or connect to a database to get started with intelligent visualizations and insights.`;
    }

    return {
      response,
      insights: [{
        id: `fallback_insight_${Date.now()}`,
        type: 'summary',
        title: 'Enhanced Analysis Ready',
        description: 'Advanced LangChain AI service is ready to provide intelligent data analysis and visualizations.',
        confidence: 1.0,
        createdAt: new Date()
      }],
      visualizationSuggestions: [],
      inlineCharts
    };
  }
}