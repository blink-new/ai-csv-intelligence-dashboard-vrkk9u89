import Papa from 'papaparse';
import { CSVFile, Relationship, ColumnInfo } from '../types/csv';

export class CSVParser {
  static async parseFile(file: File): Promise<CSVFile> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            const data = results.data as Record<string, any>[];
            const columns = Object.keys(data[0] || {});
            
            const csvFile: CSVFile = {
              id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              data,
              columns,
              rowCount: data.length,
              uploadedAt: new Date(),
            };

            resolve(csvFile);
          } catch (error) {
            reject(new Error(`Failed to parse CSV: ${error}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  static detectRelationships(files: CSVFile[]): CSVFile[] {
    const updatedFiles = files.map(file => ({ ...file, relationships: [] }));

    for (let i = 0; i < updatedFiles.length; i++) {
      for (let j = i + 1; j < updatedFiles.length; j++) {
        const sourceFile = updatedFiles[i];
        const targetFile = updatedFiles[j];

        // Check each column in source against each column in target
        for (const sourceColumn of sourceFile.columns) {
          for (const targetColumn of targetFile.columns) {
            const relationship = this.analyzeColumnRelationship(
              sourceFile,
              targetFile,
              sourceColumn,
              targetColumn
            );

            if (relationship && relationship.confidence > 0.5) {
              sourceFile.relationships!.push(relationship);
            }
          }
        }
      }
    }

    return updatedFiles;
  }

  private static analyzeColumnRelationship(
    sourceFile: CSVFile,
    targetFile: CSVFile,
    sourceColumn: string,
    targetColumn: string
  ): Relationship | null {
    const sourceValues = sourceFile.data.map(row => row[sourceColumn]).filter(v => v != null);
    const targetValues = targetFile.data.map(row => row[targetColumn]).filter(v => v != null);

    if (sourceValues.length === 0 || targetValues.length === 0) {
      return null;
    }

    // Convert to strings for comparison
    const sourceSet = new Set(sourceValues.map(v => String(v).toLowerCase().trim()));
    const targetSet = new Set(targetValues.map(v => String(v).toLowerCase().trim()));

    // Find intersection
    const intersection = new Set([...sourceSet].filter(x => targetSet.has(x)));
    const matchingRows = intersection.size;

    if (matchingRows === 0) {
      return null;
    }

    // Calculate confidence based on overlap
    const sourceUnique = sourceSet.size;
    const targetUnique = targetSet.size;
    const overlapRatio = matchingRows / Math.max(sourceUnique, targetUnique);
    
    // Boost confidence if column names are similar
    const namesSimilar = this.calculateStringSimilarity(sourceColumn, targetColumn) > 0.6;
    const confidence = namesSimilar ? Math.min(overlapRatio * 1.2, 1) : overlapRatio;

    if (confidence < 0.3) {
      return null;
    }

    // Determine relationship type
    let type: Relationship['type'] = 'many-to-many';
    
    const sourceUniqueMatches = sourceValues.filter(v => 
      intersection.has(String(v).toLowerCase().trim())
    ).length;
    const targetUniqueMatches = targetValues.filter(v => 
      intersection.has(String(v).toLowerCase().trim())
    ).length;

    if (sourceUniqueMatches === sourceUnique && targetUniqueMatches === targetUnique) {
      type = 'one-to-one';
    } else if (sourceUniqueMatches === sourceUnique || targetUniqueMatches === targetUnique) {
      type = 'one-to-many';
    }

    return {
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceFile: sourceFile.id,
      targetFile: targetFile.id,
      sourceColumn,
      targetColumn,
      type,
      confidence,
      matchingRows
    };
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
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

  static joinDatasets(files: CSVFile[], relationships: Relationship[]): Record<string, any>[] {
    if (files.length < 2 || relationships.length === 0) {
      return [];
    }

    // Start with the first file as base
    let result = [...files[0].data];
    const processedFiles = new Set([files[0].id]);

    // Apply joins based on relationships
    for (const relationship of relationships) {
      const sourceFile = files.find(f => f.id === relationship.sourceFile);
      const targetFile = files.find(f => f.id === relationship.targetFile);

      if (!sourceFile || !targetFile) continue;

      // Determine which file to join
      let baseData: Record<string, any>[];
      let joinData: Record<string, any>[];
      let baseColumn: string;
      let joinColumn: string;

      if (processedFiles.has(sourceFile.id)) {
        baseData = result;
        joinData = targetFile.data;
        baseColumn = relationship.sourceColumn;
        joinColumn = relationship.targetColumn;
        processedFiles.add(targetFile.id);
      } else if (processedFiles.has(targetFile.id)) {
        baseData = result;
        joinData = sourceFile.data;
        baseColumn = relationship.targetColumn;
        joinColumn = relationship.sourceColumn;
        processedFiles.add(sourceFile.id);
      } else {
        // Neither file processed yet, skip for now
        continue;
      }

      // Create lookup map for join
      const joinMap = new Map<string, Record<string, any>[]>();
      joinData.forEach(row => {
        const key = String(row[joinColumn] || '').toLowerCase().trim();
        if (!joinMap.has(key)) {
          joinMap.set(key, []);
        }
        joinMap.get(key)!.push(row);
      });

      // Perform the join
      const joinedResult: Record<string, any>[] = [];
      baseData.forEach(baseRow => {
        const key = String(baseRow[baseColumn] || '').toLowerCase().trim();
        const matches = joinMap.get(key) || [];

        if (matches.length > 0) {
          matches.forEach(matchRow => {
            const joined = { ...baseRow };
            
            // Add columns from joined table with prefix to avoid conflicts
            Object.keys(matchRow).forEach(col => {
              const newColName = joined[col] !== undefined ? `${targetFile.name}_${col}` : col;
              joined[newColName] = matchRow[col];
            });
            
            joinedResult.push(joined);
          });
        } else {
          // Left join - keep base row even without match
          joinedResult.push(baseRow);
        }
      });

      result = joinedResult;
    }

    return result;
  }

  static analyzeColumn(data: Record<string, any>[], columnName: string): ColumnInfo {
    const values = data.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v != null);
    
    // Determine type
    let type: ColumnInfo['type'] = 'string';
    if (nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
      type = 'number';
    } else if (nonNullValues.every(v => typeof v === 'boolean')) {
      type = 'boolean';
    } else if (nonNullValues.some(v => !isNaN(Date.parse(String(v))))) {
      // Check if most values are valid dates
      const dateCount = nonNullValues.filter(v => !isNaN(Date.parse(String(v)))).length;
      if (dateCount / nonNullValues.length > 0.8) {
        type = 'date';
      }
    }

    return {
      name: columnName,
      type,
      uniqueValues: new Set(nonNullValues.map(v => String(v))).size,
      nullCount: values.length - nonNullValues.length,
      sampleValues: nonNullValues.slice(0, 5)
    };
  }
}