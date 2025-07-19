import { CSVFile, DataInsight, ChatMessage } from '../types/csv';

export class AIService {
  private apiKey: string | null = null;

  constructor() {
    // In a real implementation, this would come from environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  }

  async generateInsights(files: CSVFile[], joinedData?: Record<string, any>[]): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];

    try {
      // Generate basic statistical insights
      for (const file of files) {
        const fileInsights = this.generateStatisticalInsights(file);
        insights.push(...fileInsights);
      }

      // Generate relationship insights
      if (files.length > 1) {
        const relationshipInsights = this.generateRelationshipInsights(files);
        insights.push(...relationshipInsights);
      }

      // Generate joined data insights
      if (joinedData && joinedData.length > 0) {
        const joinedInsights = this.generateJoinedDataInsights(joinedData);
        insights.push(...joinedInsights);
      }

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.generateFallbackInsights(files);
    }
  }

  private generateStatisticalInsights(file: CSVFile): DataInsight[] {
    const insights: DataInsight[] = [];

    // Data overview insight
    insights.push({
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'summary',
      title: `${file.name} Overview`,
      description: `Dataset contains ${file.rowCount.toLocaleString()} rows and ${file.columns.length} columns. Key columns include: ${file.columns.slice(0, 5).join(', ')}${file.columns.length > 5 ? '...' : ''}.`,
      confidence: 1.0,
      createdAt: new Date()
    });

    // Analyze numeric columns
    const numericColumns = file.columns.filter(col => {
      const values = file.data.map(row => row[col]).filter(v => v != null);
      return values.length > 0 && values.every(v => typeof v === 'number' || !isNaN(Number(v)));
    });

    if (numericColumns.length > 0) {
      const col = numericColumns[0];
      const values = file.data.map(row => Number(row[col])).filter(v => !isNaN(v));
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'pattern',
        title: `${col} Statistics`,
        description: `Average: ${avg.toFixed(2)}, Range: ${min} to ${max}. This suggests ${avg > (max + min) / 2 ? 'higher' : 'lower'} concentration of values.`,
        confidence: 0.8,
        data: { column: col, avg, min, max },
        createdAt: new Date()
      });
    }

    // Check for missing data patterns
    const columnsWithNulls = file.columns.filter(col => {
      const nullCount = file.data.filter(row => row[col] == null).length;
      return nullCount > 0;
    });

    if (columnsWithNulls.length > 0) {
      const worstColumn = columnsWithNulls.reduce((worst, col) => {
        const nullCount = file.data.filter(row => row[col] == null).length;
        const worstNullCount = file.data.filter(row => row[worst] == null).length;
        return nullCount > worstNullCount ? col : worst;
      });

      const nullCount = file.data.filter(row => row[worstColumn] == null).length;
      const percentage = (nullCount / file.rowCount * 100).toFixed(1);

      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'anomaly',
        title: 'Missing Data Detected',
        description: `Column "${worstColumn}" has ${percentage}% missing values (${nullCount} rows). Consider data cleaning or imputation strategies.`,
        confidence: 0.9,
        data: { column: worstColumn, nullCount, percentage },
        createdAt: new Date()
      });
    }

    return insights;
  }

  private generateRelationshipInsights(files: CSVFile[]): DataInsight[] {
    const insights: DataInsight[] = [];
    const allRelationships = files.flatMap(f => f.relationships || []);

    if (allRelationships.length > 0) {
      const highConfidenceRels = allRelationships.filter(r => r.confidence > 0.8);
      
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'correlation',
        title: 'Strong Data Relationships Found',
        description: `Detected ${allRelationships.length} relationships between datasets, with ${highConfidenceRels.length} high-confidence connections. This enables powerful cross-dataset analysis.`,
        confidence: 0.9,
        data: { totalRelationships: allRelationships.length, highConfidence: highConfidenceRels.length },
        createdAt: new Date()
      });
    }

    return insights;
  }

  private generateJoinedDataInsights(joinedData: Record<string, any>[]): DataInsight[] {
    const insights: DataInsight[] = [];

    insights.push({
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'summary',
      title: 'Joined Dataset Created',
      description: `Successfully merged datasets into ${joinedData.length.toLocaleString()} rows with ${Object.keys(joinedData[0] || {}).length} combined columns. This unified view enables comprehensive analysis across all data sources.`,
      confidence: 1.0,
      data: { rows: joinedData.length, columns: Object.keys(joinedData[0] || {}).length },
      createdAt: new Date()
    });

    return insights;
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

  async processQuery(
    query: string, 
    files: CSVFile[], 
    joinedData?: Record<string, any>[]
  ): Promise<{ response: string; insights: DataInsight[] }> {
    try {
      // This is a simplified implementation
      // In a real app, this would use LangChain and actual AI models
      
      const response = this.generateQueryResponse(query, files, joinedData);
      const insights = await this.generateQueryInsights(query, files, joinedData);

      return { response, insights };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        response: "I'm having trouble processing your query right now. Please try rephrasing your question or check if your data is properly loaded.",
        insights: []
      };
    }
  }

  private generateQueryResponse(
    query: string, 
    files: CSVFile[], 
    joinedData?: Record<string, any>[]
  ): string {
    const lowerQuery = query.toLowerCase();
    
    // Simple pattern matching for common queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      const totalRows = files.reduce((sum, f) => sum + f.rowCount, 0);
      return `Your datasets contain a total of ${totalRows.toLocaleString()} rows across ${files.length} file${files.length > 1 ? 's' : ''}.`;
    }
    
    if (lowerQuery.includes('column') || lowerQuery.includes('field')) {
      const allColumns = [...new Set(files.flatMap(f => f.columns))];
      return `Your datasets have ${allColumns.length} unique columns: ${allColumns.slice(0, 10).join(', ')}${allColumns.length > 10 ? '...' : ''}.`;
    }
    
    if (lowerQuery.includes('relationship') || lowerQuery.includes('connect')) {
      const relationships = files.flatMap(f => f.relationships || []);
      if (relationships.length > 0) {
        return `I found ${relationships.length} relationship${relationships.length > 1 ? 's' : ''} between your datasets. The strongest connections are based on matching values in key columns.`;
      } else {
        return "I haven't detected any strong relationships between your datasets yet. Try uploading files with common identifier columns.";
      }
    }
    
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
      return `Here's an overview: You have ${files.length} dataset${files.length > 1 ? 's' : ''} with ${files.reduce((sum, f) => sum + f.rowCount, 0).toLocaleString()} total rows. ${joinedData ? `The joined dataset has ${joinedData.length} rows.` : 'No joined data available yet.'}`;
    }
    
    // Default response
    return `I understand you're asking about "${query}". Based on your current datasets, I can help you analyze patterns, relationships, and generate visualizations. Try asking specific questions about your data columns, counts, or relationships.`;
  }

  private async generateQueryInsights(
    query: string, 
    files: CSVFile[], 
    joinedData?: Record<string, any>[]
  ): Promise<DataInsight[]> {
    // Generate contextual insights based on the query
    const insights: DataInsight[] = [];
    
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'trend',
        title: 'Pattern Analysis Suggestion',
        description: 'To identify trends, consider visualizing your time-series data using line charts or analyzing correlations between numeric columns.',
        confidence: 0.7,
        createdAt: new Date()
      });
    }
    
    return insights;
  }
}