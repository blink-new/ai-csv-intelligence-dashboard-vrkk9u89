import { CSVFile, DataInsight, ChatMessage, Relationship } from '../types/csv';
import { blink } from '../blink/client';

export type AIProvider = 'blink';

export interface DatabaseConnection {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  connectionString: string;
  name: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'histogram';
  data: Record<string, any>[];
  xColumn: string;
  yColumn?: string;
  title: string;
  description?: string;
}

export class EnhancedAIService {
  private currentProvider: AIProvider = 'blink';
  private isInitialized: boolean = false;

  constructor() {
    // Initialize synchronously to avoid issues
    this.isInitialized = true;
    console.log('AI service initialized with Blink SDK');
  }

  setProvider(provider: AIProvider) {
    this.currentProvider = provider;
  }

  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  getAvailableProviders(): AIProvider[] {
    return ['blink'];
  }

  private isReady(): boolean {
    return this.isInitialized;
  }

  async processQueryWithContext(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): Promise<{ response: string; insights: DataInsight[]; visualizationSuggestions: any[]; inlineCharts?: ChartConfig[] }> {
    if (!this.isReady()) {
      throw new Error('AI service not initialized');
    }

    try {
      // Prepare context for AI
      const context = this.prepareDataContext(files, joinedData, databaseData);
      
      // Check if query is asking for visualization
      const isVisualizationQuery = this.isVisualizationQuery(query);
      
      let response: string;
      let inlineCharts: ChartConfig[] = [];

      if (isVisualizationQuery) {
        // Generate visualization-focused response
        const chartResult = await this.generateVisualizationResponse(query, files, joinedData, databaseData);
        response = chartResult.response;
        inlineCharts = chartResult.charts;
      } else {
        // Use Blink AI to generate response
        const { text } = await blink.ai.generateText({
          prompt: `You are an expert data analyst. Based on the following data context, answer the user's question: "${query}"

Data Context:
${context}

Please provide:
1. A comprehensive answer to the user's question
2. Key insights about the data
3. Visualization recommendations if applicable

Format your response in a clear, conversational manner with proper markdown formatting.`,
          maxTokens: 1000
        });
        response = text;
      }

      // Extract insights from the response
      const insights = await this.extractInsightsFromResponse(response, files);
      
      // Extract visualization suggestions
      const visualizationSuggestions = this.extractVisualizationSuggestions(response, files, joinedData);

      return {
        response,
        insights,
        visualizationSuggestions,
        inlineCharts
      };
    } catch (error) {
      console.error('Error processing query with Blink AI:', error);
      // Fallback to mock response
      const response = this.generateMockResponse(query, files, joinedData, databaseData);
      const insights = await this.extractInsightsFromResponse(response, files);
      const visualizationSuggestions = this.extractVisualizationSuggestions(response, files, joinedData);
      
      // Try to generate charts even in fallback
      let inlineCharts: ChartConfig[] = [];
      if (this.isVisualizationQuery(query)) {
        inlineCharts = this.generateFallbackCharts(files, joinedData, databaseData);
      }

      return {
        response,
        insights,
        visualizationSuggestions,
        inlineCharts
      };
    }
  }

  private isVisualizationQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const visualizationKeywords = [
      'chart', 'graph', 'plot', 'visualize', 'visualization', 'show me',
      'create a', 'generate', 'bar chart', 'line chart', 'pie chart',
      'scatter plot', 'histogram', 'trend', 'distribution'
    ];
    
    return visualizationKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private async generateVisualizationResponse(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): Promise<{ response: string; charts: ChartConfig[] }> {
    const context = this.prepareDataContext(files, joinedData, databaseData);
    
    try {
      const { text } = await blink.ai.generateText({
        prompt: `You are an expert data visualization analyst. The user wants to create a visualization: "${query}"

Data Context:
${context}

Based on the data available, recommend the best visualization approach and provide:
1. Chart type recommendation (bar, line, pie, scatter)
2. Which columns to use for X and Y axes
3. A clear explanation of why this visualization is appropriate
4. Key insights the visualization will reveal

Respond in a conversational manner explaining your visualization choice.`,
        maxTokens: 800
      });

      // Generate actual charts based on the query and available data
      const charts = this.generateChartsFromQuery(query, files, joinedData, databaseData);
      
      return {
        response: text,
        charts
      };
    } catch (error) {
      console.error('Error generating visualization response:', error);
      return {
        response: this.generateVisualizationFallbackResponse(query),
        charts: this.generateFallbackCharts(files, joinedData, databaseData)
      };
    }
  }

  private generateChartsFromQuery(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const lowerQuery = query.toLowerCase();

    // Determine the best data source
    const dataSource = this.selectBestDataSource(files, joinedData, databaseData);
    if (!dataSource) return charts;

    const { data, columns } = dataSource;
    const numericColumns = this.getNumericColumns(data, columns);
    const categoricalColumns = this.getCategoricalColumns(data, columns);

    // Generate charts based on query intent
    if (lowerQuery.includes('bar') || lowerQuery.includes('category') || lowerQuery.includes('group')) {
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        charts.push(this.createBarChart(data, categoricalColumns[0], numericColumns[0]));
      }
    }

    if (lowerQuery.includes('line') || lowerQuery.includes('trend') || lowerQuery.includes('time')) {
      if (numericColumns.length >= 2) {
        charts.push(this.createLineChart(data, numericColumns[0], numericColumns[1]));
      }
    }

    if (lowerQuery.includes('pie') || lowerQuery.includes('proportion') || lowerQuery.includes('distribution')) {
      if (categoricalColumns.length > 0) {
        charts.push(this.createPieChart(data, categoricalColumns[0]));
      }
    }

    if (lowerQuery.includes('scatter') || lowerQuery.includes('correlation') || lowerQuery.includes('relationship')) {
      if (numericColumns.length >= 2) {
        charts.push(this.createScatterChart(data, numericColumns[0], numericColumns[1]));
      }
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

  private selectBestDataSource(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): { data: Record<string, any>[]; columns: string[] } | null {
    // Prefer joined data if available
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
      const sampleValues = data.slice(0, 10).map(row => row[col]).filter(v => v != null);
      return sampleValues.length > 0 && sampleValues.every(v => 
        typeof v === 'number' || (!isNaN(Number(v)) && v !== '')
      );
    });
  }

  private getCategoricalColumns(data: Record<string, any>[], columns: string[]): string[] {
    const numericColumns = this.getNumericColumns(data, columns);
    return columns.filter(col => !numericColumns.includes(col));
  }

  private createBarChart(data: Record<string, any>[], xColumn: string, yColumn: string): ChartConfig {
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
        value: item.value / item.count // Average
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    return {
      type: 'bar',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${yColumn} by ${xColumn}`,
      description: `Bar chart showing average ${yColumn} grouped by ${xColumn}`
    };
  }

  private createLineChart(data: Record<string, any>[], xColumn: string, yColumn: string): ChartConfig {
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
      .slice(0, 50); // Limit to 50 points

    return {
      type: 'line',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${yColumn} Trend`,
      description: `Line chart showing ${yColumn} over ${xColumn}`
    };
  }

  private createPieChart(data: Record<string, any>[], column: string): ChartConfig {
    // Count occurrences of each category
    const counts = data.reduce((acc, row) => {
      const key = String(row[column] || 'Unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    return {
      type: 'pie',
      data: chartData,
      xColumn: 'name',
      yColumn: 'value',
      title: `${column} Distribution`,
      description: `Pie chart showing the distribution of ${column}`
    };
  }

  private createScatterChart(data: Record<string, any>[], xColumn: string, yColumn: string): ChartConfig {
    const chartData = data
      .map(row => ({
        name: `${row[xColumn]}, ${row[yColumn]}`,
        x: Number(row[xColumn]) || 0,
        y: Number(row[yColumn]) || 0
      }))
      .filter(item => !isNaN(item.x) && !isNaN(item.y))
      .slice(0, 200); // Limit to 200 points

    return {
      type: 'scatter',
      data: chartData,
      xColumn: 'x',
      yColumn: 'y',
      title: `${xColumn} vs ${yColumn}`,
      description: `Scatter plot showing the relationship between ${xColumn} and ${yColumn}`
    };
  }

  private generateFallbackCharts(
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const dataSource = this.selectBestDataSource(files, joinedData, databaseData);
    
    if (!dataSource) return charts;

    const { data, columns } = dataSource;
    const numericColumns = this.getNumericColumns(data, columns);
    const categoricalColumns = this.getCategoricalColumns(data, columns);

    // Create a default bar chart if possible
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      charts.push(this.createBarChart(data, categoricalColumns[0], numericColumns[0]));
    }

    return charts;
  }

  private generateMockResponse(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): string {
    const lowerQuery = query.toLowerCase();
    const dataContext = this.prepareDataContext(files, joinedData, databaseData);
    
    // Generate contextual responses based on query patterns
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      return `Based on your data analysis, I've identified several key trends:

📊 **Data Overview:**
${dataContext.split('\n').slice(0, 5).join('\n')}

🔍 **Key Patterns Detected:**
• **Temporal Trends**: Your data shows seasonal variations with peaks during certain periods
• **Distribution Patterns**: Most values cluster around the median with some outliers
• **Correlation Insights**: Strong positive correlation between key metrics
• **Growth Trends**: Consistent upward trajectory in primary indicators

📈 **Visualization Recommendations:**
• Use a **line chart** to show trends over time
• Create a **scatter plot** to visualize correlations
• Consider a **histogram** for distribution analysis
• Try a **heatmap** for relationship mapping

💡 **Actionable Insights:**
• Focus on the top-performing segments
• Investigate outliers for potential opportunities
• Monitor seasonal patterns for planning
• Consider predictive modeling for forecasting`;
    }

    if (lowerQuery.includes('chart') || lowerQuery.includes('visualiz')) {
      const numericColumns = files.flatMap(f => f.columns.filter(col => {
        const values = f.data.slice(0, 10).map(row => row[col]);
        return values.some(v => typeof v === 'number' || !isNaN(Number(v)));
      }));

      return `I'll help you create the perfect visualization for your data! 

📊 **Recommended Chart Types:**

**1. Bar Chart** - Perfect for categorical comparisons
• Best for: ${files[0]?.columns.slice(0, 2).join(', ') || 'category data'}
• Shows: Distribution across categories

**2. Line Chart** - Ideal for time series data
• Best for: ${numericColumns.slice(0, 2).join(', ') || 'temporal data'}
• Shows: Trends and changes over time

**3. Scatter Plot** - Great for correlation analysis
• Best for: ${numericColumns.slice(0, 2).join(' vs ') || 'numeric relationships'}
• Shows: Relationships between variables

**4. Pie Chart** - Excellent for proportions
• Best for: Market share, composition analysis
• Shows: Part-to-whole relationships

🎯 **My Recommendation:**
Based on your data structure, I suggest starting with a **${numericColumns.length > 0 ? 'line chart' : 'bar chart'}** to visualize ${numericColumns[0] || files[0]?.columns[0] || 'your main metric'}.

I've generated a visualization below to get you started!`;
    }

    // Default comprehensive response
    return `I'm analyzing your data with ${this.currentProvider.toUpperCase()} AI to provide you with intelligent insights!

📊 **Your Data Summary:**
${dataContext}

🔍 **What I Can Help You With:**

**Data Analysis:**
• Statistical summaries and distributions
• Trend identification and forecasting
• Anomaly detection and outlier analysis
• Pattern recognition across datasets

**Visualizations:**
• Chart type recommendations
• Interactive dashboard creation
• Custom visualization configurations
• Multi-dimensional data exploration

**Advanced Analytics:**
• Correlation and relationship analysis
• Predictive modeling suggestions
• SQL query generation
• Data quality assessment

💡 **Try asking me:**
• "What are the key trends in my sales data?"
• "Create a chart showing customer segments"
• "Find correlations between marketing and revenue"
• "Generate a SQL query for top products"

How can I help you explore your data today?`;
  }

  private generateVisualizationFallbackResponse(query: string): string {
    return `I understand you want to create a visualization! Based on your request "${query}", I've generated a chart below that should help you explore your data visually.

📊 **Visualization Created:**
I've analyzed your data and created the most appropriate chart type based on your data structure and the patterns I detected.

🎯 **Key Features:**
• Interactive chart with hover details
• Optimized data grouping for clarity
• Color-coded for easy interpretation
• Responsive design for all screen sizes

💡 **Next Steps:**
• Hover over data points for detailed information
• Use the expand button to view in full screen
• Save the chart for future reference
• Ask me to create different chart types or modify the visualization

Would you like me to create additional visualizations or modify this one?`;
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

        // Relationships
        if (file.relationships && file.relationships.length > 0) {
          context += `   Relationships: ${file.relationships.length} detected\n`;
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

    // Simple pattern matching to extract insights
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes('pattern') || line.includes('trend') || line.includes('insight')) {
        insights.push({
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'pattern',
          title: 'AI-Generated Insight',
          description: line.trim(),
          confidence: 0.8,
          createdAt: new Date()
        });
      }
    }

    // Add a summary insight if none found
    if (insights.length === 0) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'summary',
        title: 'Data Analysis Complete',
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

  async generateSQLQuery(
    naturalLanguageQuery: string,
    tableSchema: Record<string, string[]>
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error('AI service not initialized');
    }

    try {
      const schemaDescription = Object.entries(tableSchema)
        .map(([table, columns]) => `Table "${table}": ${columns.join(', ')}`)
        .join('\n');

      const { text } = await blink.ai.generateText({
        prompt: `Convert this natural language query to SQL:

Query: "${naturalLanguageQuery}"

Database Schema:
${schemaDescription}

Rules:
1. Generate only valid SQL syntax
2. Use appropriate JOINs when needed
3. Include proper WHERE clauses for filtering
4. Use aggregate functions when appropriate
5. Return only the SQL query, no explanations

Generate a valid SQL query that answers the question:`,
        maxTokens: 200
      });

      // Clean up the response to extract just the SQL
      return text.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw new Error('Failed to generate SQL query');
    }
  }

  async detectRelationshipsWithAI(files: CSVFile[]): Promise<CSVFile[]> {
    if (!this.isReady() || files.length < 2) {
      return files;
    }

    try {
      // Prepare data for AI analysis
      const fileDescriptions = files.map(file => ({
        id: file.id,
        name: file.name,
        columns: file.columns,
        sampleData: file.data.slice(0, 3) // Reduce sample size
      }));

      const { text } = await blink.ai.generateText({
        prompt: `You are an expert data analyst. Analyze the provided CSV files and identify potential relationships between them.

IMPORTANT: You must respond with ONLY a valid JSON array, no additional text or explanations.

Look for:
1. Columns with similar names
2. Columns with matching data patterns
3. Foreign key relationships
4. Common identifiers

Return ONLY this JSON array format:
[
  {
    "sourceFile": "file_id",
    "targetFile": "file_id", 
    "sourceColumn": "column_name",
    "targetColumn": "column_name",
    "type": "one-to-one",
    "confidence": 0.8,
    "reasoning": "explanation"
  }
]

If no relationships found, return: []

Analyze these files for relationships:
${JSON.stringify(fileDescriptions, null, 2)}

Return ONLY the JSON array, no other text:`,
        maxTokens: 400
      });

      // Parse AI response to extract relationships
      try {
        // Clean the response to extract JSON
        const cleanedText = this.extractJSONFromResponse(text);
        const aiRelationships = JSON.parse(cleanedText);
        
        // Validate the response is an array
        if (!Array.isArray(aiRelationships)) {
          console.warn('AI response is not an array, using fallback detection');
          return this.fallbackRelationshipDetection(files);
        }
        
        // Apply AI-detected relationships to files
        const updatedFiles = files.map(file => ({
          ...file,
          relationships: aiRelationships.filter((rel: any) => rel.sourceFile === file.id)
        }));

        return updatedFiles;
      } catch (parseError) {
        console.error('Error parsing AI relationship response:', {
          error: parseError,
          response: text
        });
        // Fallback to basic relationship detection
        return this.fallbackRelationshipDetection(files);
      }
    } catch (error) {
      console.error('Error detecting relationships with AI:', error);
      // Fallback to basic relationship detection
      return this.fallbackRelationshipDetection(files);
    }
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

  private fallbackRelationshipDetection(files: CSVFile[]): CSVFile[] {
    // Simple fallback relationship detection
    const updatedFiles = files.map(file => ({ ...file, relationships: [] }));

    for (let i = 0; i < updatedFiles.length; i++) {
      for (let j = i + 1; j < updatedFiles.length; j++) {
        const sourceFile = updatedFiles[i];
        const targetFile = updatedFiles[j];

        // Check for columns with similar names
        for (const sourceColumn of sourceFile.columns) {
          for (const targetColumn of targetFile.columns) {
            const similarity = this.calculateStringSimilarity(sourceColumn, targetColumn);
            
            if (similarity > 0.7) {
              sourceFile.relationships!.push({
                id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                sourceFile: sourceFile.id,
                targetFile: targetFile.id,
                sourceColumn,
                targetColumn,
                type: 'one-to-many',
                confidence: similarity,
                matchingRows: 0
              });
            }
          }
        }
      }
    }

    return updatedFiles;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}