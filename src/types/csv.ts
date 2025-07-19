export interface CSVFile {
  id: string;
  name: string;
  data: Record<string, any>[];
  columns: string[];
  rowCount: number;
  relationships?: Relationship[];
  uploadedAt: Date;
}

export interface Relationship {
  id: string;
  sourceFile: string;
  targetFile: string;
  sourceColumn: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  confidence: number;
  matchingRows: number;
}

export interface DataInsight {
  id: string;
  type: 'pattern' | 'correlation' | 'anomaly' | 'trend' | 'summary';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  visualization?: {
    type: 'chart' | 'table' | 'text';
    config: any;
  };
  createdAt: Date;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'histogram';
  data: Record<string, any>[];
  xColumn: string;
  yColumn?: string;
  title: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  insights?: DataInsight[];
  chartConfig?: ChartConfig;
  inlineCharts?: ChartConfig[];
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  uniqueValues: number;
  nullCount: number;
  sampleValues: any[];
}