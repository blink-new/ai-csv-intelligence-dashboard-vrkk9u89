import { blink } from '../blink/client';
import { CSVFile, DataInsight, ChatMessage } from '../types/csv';

export class BlinkAIService {
  async processQuery(
    query: string,
    files: CSVFile[],
    joinedData?: Record<string, any>[],
    databaseData?: Record<string, any>[]
  ): Promise<{ response: string; insights: DataInsight[]; visualizationSuggestions: any[] }> {
    try {
      // Prepare context for AI
      const context = this.prepareDataContext(files, joinedData, databaseData);
      
      // Use Blink AI to generate response
      const { text } = await blink.ai.generateText({
        prompt: `You are an expert data analyst. Based on the following data context, answer the user's question: "${query}"

Data Context:
${context}

Please provide:
1. A comprehensive answer to the user's question
2. Key insights about the data
3. Visualization recommendations if applicable

Format your response in a clear, conversational manner.`,
        maxTokens: 1000
      });

      // Extract insights from the response
      const insights = this.extractInsightsFromResponse(text, files);
      
      // Extract visualization suggestions
      const visualizationSuggestions = this.extractVisualizationSuggestions(text, files);

      return {
        response: text,
        insights,
        visualizationSuggestions
      };
    } catch (error) {
      console.error('Error processing query with Blink AI:', error);
      throw new Error('Failed to process query with AI');
    }
  }

  async generateInsights(files: CSVFile[], joinedData?: Record<string, any>[]): Promise<DataInsight[]> {
    try {
      const context = this.prepareDataContext(files, joinedData);
      
      const { text } = await blink.ai.generateText({
        prompt: `Analyze the following dataset and provide key insights:

${context}

Please identify:
1. Data quality issues
2. Interesting patterns or trends
3. Statistical summaries
4. Potential relationships between variables
5. Anomalies or outliers

Format each insight with a clear title and description.`,
        maxTokens: 800
      });

      return this.extractInsightsFromResponse(text, files);
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.generateFallbackInsights(files);
    }
  }

  async generateSQLQuery(naturalLanguageQuery: string, tableSchema: Record<string, string[]>): Promise<string> {
    try {
      const schemaDescription = Object.entries(tableSchema)
        .map(([table, columns]) => `Table "${table}": ${columns.join(', ')}`)
        .join('\n');

      const { text } = await blink.ai.generateText({
        prompt: `Convert this natural language query to SQL:

Query: "${naturalLanguageQuery}"

Database Schema:
${schemaDescription}

Generate a valid SQL query that answers the question. Return only the SQL query without explanations.`,
        maxTokens: 200
      });

      // Clean up the response to extract just the SQL
      return text.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw new Error('Failed to generate SQL query');
    }
  }

  async detectRelationships(files: CSVFile[]): Promise<CSVFile[]> {
    if (files.length < 2) return files;

    try {
      const fileDescriptions = files.map(file => ({
        name: file.name,
        columns: file.columns,
        sampleData: file.data.slice(0, 3)
      }));

      const { text } = await blink.ai.generateText({
        prompt: `Analyze these CSV files and identify potential relationships between them:

${JSON.stringify(fileDescriptions, null, 2)}

Look for:
1. Columns with similar names
2. Columns with matching data patterns
3. Foreign key relationships
4. Common identifiers

Return a JSON array of relationships in this format:
[
  {
    "sourceFile": "file_name",
    "targetFile": "file_name",
    "sourceColumn": "column_name",
    "targetColumn": "column_name",
    "type": "one-to-one|one-to-many|many-to-many",
    "confidence": 0.0-1.0,
    "reasoning": "explanation"
  }
]`,
        maxTokens: 500
      });

      try {
        const relationships = JSON.parse(text);
        
        // Apply detected relationships to files
        const updatedFiles = files.map(file => ({
          ...file,
          relationships: relationships.filter((rel: any) => rel.sourceFile === file.name)
        }));

        return updatedFiles;
      } catch (parseError) {
        console.error('Error parsing AI relationship response:', parseError);
        return files;
      }
    } catch (error) {
      console.error('Error detecting relationships with AI:', error);
      return files;
    }
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

  private extractInsightsFromResponse(response: string, files: CSVFile[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Simple pattern matching to extract insights
    const lines = response.split('\n');
    let currentInsight: Partial<DataInsight> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for insight patterns
      if (trimmedLine.includes('insight') || trimmedLine.includes('pattern') || trimmedLine.includes('trend')) {
        if (currentInsight) {
          insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: currentInsight.type || 'pattern',
            title: currentInsight.title || 'AI-Generated Insight',
            description: currentInsight.description || trimmedLine,
            confidence: 0.8,
            createdAt: new Date()
          });
        }
        
        currentInsight = {
          type: 'pattern',
          title: trimmedLine.length > 50 ? trimmedLine.substring(0, 50) + '...' : trimmedLine,
          description: trimmedLine
        };
      } else if (currentInsight && trimmedLine.length > 0) {
        currentInsight.description = (currentInsight.description || '') + ' ' + trimmedLine;
      }
    }
    
    // Add final insight if exists
    if (currentInsight) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: currentInsight.type || 'pattern',
        title: currentInsight.title || 'AI-Generated Insight',
        description: currentInsight.description || 'AI analysis completed',
        confidence: 0.8,
        createdAt: new Date()
      });
    }

    // If no insights extracted, create a summary insight
    if (insights.length === 0) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'summary',
        title: 'AI Analysis Complete',
        description: 'AI has analyzed your data and provided insights in the response above.',
        confidence: 1.0,
        createdAt: new Date()
      });
    }

    return insights;
  }

  private extractVisualizationSuggestions(response: string, files: CSVFile[]): any[] {
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

  private generateFallbackInsights(files: CSVFile[]): DataInsight[] {
    return [{
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'summary',
      title: 'Data Loaded Successfully',
      description: `Loaded ${files.length} CSV file${files.length > 1 ? 's' : ''} with a total of ${files.reduce((sum, f) => sum + f.rowCount, 0).toLocaleString()} rows. Ready for analysis and visualization.`,
      confidence: 1.0,
      createdAt: new Date()
    }];
  }
}