import { blink } from '../blink/client';
import { CSVFile, DataInsight } from '../types/csv';

export interface CSVAnalysisResult {
  columnAnalysis: {
    column: string;
    type: 'numeric' | 'categorical' | 'date' | 'text';
    uniqueValues: number;
    nullCount: number;
    sampleValues: any[];
    suggestions: string[];
  }[];
  dataQuality: {
    totalRows: number;
    completeness: number;
    duplicateRows: number;
    issues: string[];
  };
  insights: DataInsight[];
  suggestions: string[];
}

export class CSVAnalysisService {
  static async analyzeCSVFile(file: CSVFile): Promise<CSVAnalysisResult> {
    try {
      // Analyze first 10 rows and column structure
      const sampleData = file.data.slice(0, 10);
      const columnAnalysis = this.analyzeColumns(file.data, file.columns);
      const dataQuality = this.assessDataQuality(file.data);
      
      // Use AI to generate insights and suggestions
      const aiAnalysis = await this.generateAIInsights(file, columnAnalysis, sampleData);
      
      return {
        columnAnalysis,
        dataQuality,
        insights: aiAnalysis.insights,
        suggestions: aiAnalysis.suggestions
      };
    } catch (error) {
      console.error('Error analyzing CSV file:', error);
      return this.getFallbackAnalysis(file);
    }
  }

  private static analyzeColumns(data: Record<string, any>[], columns: string[]) {
    return columns.map(column => {
      const values = data.map(row => row[column]).filter(v => v != null && v !== '');
      const uniqueValues = new Set(values).size;
      const nullCount = data.length - values.length;
      const sampleValues = values.slice(0, 5);
      
      // Determine column type
      let type: 'numeric' | 'categorical' | 'date' | 'text' = 'text';
      
      const numericCount = values.filter(v => !isNaN(Number(v))).length;
      const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;
      
      if (numericCount / values.length > 0.8) {
        type = 'numeric';
      } else if (dateCount / values.length > 0.8) {
        type = 'date';
      } else if (uniqueValues < values.length * 0.5) {
        type = 'categorical';
      }
      
      // Generate suggestions based on column analysis
      const suggestions = this.generateColumnSuggestions(column, type, uniqueValues, values.length);
      
      return {
        column,
        type,
        uniqueValues,
        nullCount,
        sampleValues,
        suggestions
      };
    });
  }

  private static assessDataQuality(data: Record<string, any>[]) {
    const totalRows = data.length;
    const totalCells = totalRows * Object.keys(data[0] || {}).length;
    const nonNullCells = data.reduce((count, row) => {
      return count + Object.values(row).filter(v => v != null && v !== '').length;
    }, 0);
    
    const completeness = totalCells > 0 ? nonNullCells / totalCells : 0;
    
    // Check for duplicate rows
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size;
    const duplicateRows = totalRows - uniqueRows;
    
    const issues: string[] = [];
    if (completeness < 0.9) issues.push('Data has missing values');
    if (duplicateRows > 0) issues.push(`${duplicateRows} duplicate rows found`);
    if (totalRows < 10) issues.push('Dataset is very small');
    
    return {
      totalRows,
      completeness,
      duplicateRows,
      issues
    };
  }

  private static generateColumnSuggestions(column: string, type: string, uniqueValues: number, totalValues: number): string[] {
    const suggestions: string[] = [];
    
    switch (type) {
      case 'numeric':
        suggestions.push(`Create bar chart showing ${column} distribution`);
        suggestions.push(`Analyze ${column} statistics (min, max, average)`);
        if (uniqueValues > 10) {
          suggestions.push(`Create histogram for ${column} values`);
        }
        break;
        
      case 'categorical':
        suggestions.push(`Create pie chart showing ${column} categories`);
        suggestions.push(`Analyze ${column} frequency distribution`);
        if (uniqueValues < 10) {
          suggestions.push(`Compare categories in ${column}`);
        }
        break;
        
      case 'date':
        suggestions.push(`Create time series chart for ${column}`);
        suggestions.push(`Analyze trends over ${column}`);
        suggestions.push(`Group data by ${column} periods`);
        break;
        
      case 'text':
        if (uniqueValues / totalValues > 0.8) {
          suggestions.push(`${column} appears to be unique identifiers`);
        } else {
          suggestions.push(`Analyze ${column} text patterns`);
          suggestions.push(`Create word cloud from ${column}`);
        }
        break;
    }
    
    return suggestions;
  }

  private static async generateAIInsights(
    file: CSVFile, 
    columnAnalysis: any[], 
    sampleData: Record<string, any>[]
  ): Promise<{ insights: DataInsight[], suggestions: string[] }> {
    try {
      const prompt = `Analyze this CSV dataset and provide insights:

Dataset: ${file.name}
Rows: ${file.rowCount}
Columns: ${file.columns.length}

Column Analysis:
${columnAnalysis.map(col => 
  `- ${col.column} (${col.type}): ${col.uniqueValues} unique values, ${col.nullCount} nulls`
).join('\n')}

Sample Data (first 3 rows):
${sampleData.slice(0, 3).map(row => JSON.stringify(row)).join('\n')}

Please provide:
1. 3-5 key insights about this dataset
2. 5-7 specific analysis suggestions
3. Potential data quality issues
4. Recommended visualizations

Format as JSON:
{
  "insights": [
    {"type": "pattern|correlation|anomaly|trend|summary", "title": "...", "description": "...", "confidence": 0.0-1.0}
  ],
  "suggestions": ["suggestion1", "suggestion2", ...]
}`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 1000
      });

      // Parse AI response
      const cleanedText = this.extractJSONFromResponse(text);
      const aiResponse = JSON.parse(cleanedText);
      
      const insights: DataInsight[] = (aiResponse.insights || []).map((insight: any, index: number) => ({
        id: `ai_insight_${file.id}_${Date.now()}_${index}`,
        type: insight.type || 'summary',
        title: insight.title || 'AI Analysis',
        description: insight.description || 'Analysis completed',
        confidence: Math.min(Math.max(insight.confidence || 0.8, 0), 1),
        createdAt: new Date()
      }));

      return {
        insights,
        suggestions: aiResponse.suggestions || []
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        insights: [{
          id: `fallback_insight_${file.id}_${Date.now()}`,
          type: 'summary',
          title: 'Dataset Uploaded',
          description: `Successfully loaded ${file.name} with ${file.rowCount} rows and ${file.columns.length} columns.`,
          confidence: 1.0,
          createdAt: new Date()
        }],
        suggestions: [
          'Explore data patterns with AI chat',
          'Create visualizations to understand trends',
          'Check for data quality issues',
          'Look for correlations between columns'
        ]
      };
    }
  }

  private static extractJSONFromResponse(response: string): string {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // Fallback to empty structure
    return '{"insights": [], "suggestions": []}';
  }

  private static getFallbackAnalysis(file: CSVFile): CSVAnalysisResult {
    const columnAnalysis = file.columns.map(column => ({
      column,
      type: 'text' as const,
      uniqueValues: 0,
      nullCount: 0,
      sampleValues: [],
      suggestions: [`Analyze ${column} patterns`]
    }));

    return {
      columnAnalysis,
      dataQuality: {
        totalRows: file.rowCount,
        completeness: 1.0,
        duplicateRows: 0,
        issues: []
      },
      insights: [{
        id: `fallback_insight_${file.id}_${Date.now()}`,
        type: 'summary',
        title: 'File Loaded',
        description: `${file.name} loaded successfully with ${file.rowCount} rows.`,
        confidence: 1.0,
        createdAt: new Date()
      }],
      suggestions: [
        'Start exploring your data with AI chat',
        'Create charts to visualize patterns',
        'Look for relationships between columns'
      ]
    };
  }
}