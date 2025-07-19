import { CSVFile, DataInsight } from './csv';

export interface DataContextType {
  files: CSVFile[];
  joinedData: Record<string, any>[];
  databaseData: Record<string, any>[];
  insights: DataInsight[];
  isAnalyzing: boolean;
  
  // File management
  addFiles: (newFiles: CSVFile[]) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  
  // Data management
  setJoinedData: (data: Record<string, any>[]) => void;
  setDatabaseData: (data: Record<string, any>[]) => void;
  
  // Insights management
  addInsights: (newInsights: DataInsight[]) => void;
  clearInsights: () => void;
  
  // Analysis
  analyzeFiles: () => Promise<void>;
}