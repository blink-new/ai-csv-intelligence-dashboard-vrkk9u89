import React, { useState, useCallback, ReactNode } from 'react';
import { DataContext } from './dataContext';
import { DataContextType } from '../types/dataContext';
import { CSVFile, DataInsight } from '../types/csv';
import { OptimizedCSVParser } from '../services/optimizedCSVParser';
import { CSVAnalysisService } from '../services/csvAnalysisService';
import toast from 'react-hot-toast';

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [joinedData, setJoinedData] = useState<Record<string, any>[]>([]);
  const [databaseData, setDatabaseData] = useState<Record<string, any>[]>([]);
  const [insights, setInsights] = useState<DataInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addInsights = useCallback((newInsights: DataInsight[]) => {
    setInsights(prev => [...prev, ...newInsights]);
  }, []);

  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  const addFiles = useCallback(async (newFiles: CSVFile[]) => {
    setIsAnalyzing(true);
    
    try {
      setFiles(prev => {
        const updatedFiles = [...prev, ...newFiles];
        // Auto-detect relationships when new files are added
        OptimizedCSVParser.detectRelationshipsOptimized(updatedFiles).then(filesWithRelationships => {
          setFiles(filesWithRelationships);
        }).catch(error => {
          console.error('Error detecting relationships:', error);
        });
        return updatedFiles; // Return immediately, update async
      });
      
      if (newFiles.length > 0) {
        toast.success(`Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`);
        
        // Analyze each new file and generate insights
        for (const file of newFiles) {
          try {
            const analysis = await CSVAnalysisService.analyzeCSVFile(file);
            addInsights(analysis.insights);
            
            // Show analysis suggestions
            if (analysis.suggestions.length > 0) {
              toast.success(`Generated ${analysis.insights.length} insights for ${file.name}`);
            }
          } catch (error) {
            console.error(`Error analyzing ${file.name}:`, error);
            toast.error(`Failed to analyze ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error adding files:', error);
      toast.error('Failed to add files');
    } finally {
      setIsAnalyzing(false);
    }
  }, [addInsights]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      const fileName = prev.find(f => f.id === fileId)?.name;
      
      if (fileName) {
        toast.success(`Removed ${fileName}`);
      }
      
      // Re-detect relationships after removal
      if (updatedFiles.length > 1) {
        try {
          OptimizedCSVParser.detectRelationshipsOptimized(updatedFiles).then(filesWithRelationships => {
            setFiles(filesWithRelationships);
          });
          return updatedFiles; // Return immediately, update async
        } catch (error) {
          console.error('Error re-detecting relationships:', error);
          return updatedFiles;
        }
      }
      
      return updatedFiles;
    });
    
    // Clear joined data if it was based on the removed file
    setJoinedData([]);
  }, []);

  const clearAllFiles = useCallback(() => {
    setFiles([]);
    setJoinedData([]);
    setInsights([]);
    toast.success('Cleared all files');
  }, []);

  const analyzeFiles = useCallback(async () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Generate joined dataset if multiple files with relationships
      if (files.length > 1) {
        const relationships = files.flatMap(f => f.relationships || []);
        if (relationships.length > 0) {
          OptimizedCSVParser.joinDatasetsOptimized(files, relationships).then(joined => {
            setJoinedData(joined);
          });
        }
      }
      
      // Generate initial insights
      const newInsights: DataInsight[] = [];
      
      files.forEach(file => {
        // Basic file insights
        newInsights.push({
          id: `file_insight_${file.id}_${Date.now()}`,
          type: 'summary',
          title: `${file.name} Analysis`,
          description: `Dataset contains ${file.rowCount} rows and ${file.columns.length} columns. Key columns: ${file.columns.slice(0, 5).join(', ')}${file.columns.length > 5 ? '...' : ''}`,
          confidence: 0.9,
          createdAt: new Date()
        });
        
        // Relationship insights
        if (file.relationships && file.relationships.length > 0) {
          newInsights.push({
            id: `rel_insight_${file.id}_${Date.now()}`,
            type: 'pattern',
            title: 'Data Relationships Detected',
            description: `Found ${file.relationships.length} relationship${file.relationships.length > 1 ? 's' : ''} with other datasets, enabling advanced cross-dataset analysis.`,
            confidence: 0.8,
            createdAt: new Date()
          });
        }
      });
      
      addInsights(newInsights);
      toast.success('Analysis completed');
    } catch (error) {
      console.error('Error analyzing files:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, addInsights]);

  const value: DataContextType = {
    files,
    joinedData,
    databaseData,
    insights,
    isAnalyzing,
    addFiles,
    removeFile,
    clearAllFiles,
    setJoinedData,
    setDatabaseData,
    addInsights,
    clearInsights,
    analyzeFiles
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};