import Papa from 'papaparse';
import { CSVFile, Relationship, ColumnInfo } from '../types/csv';

export interface ParseProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class OptimizedCSVParser {
  private static readonly CHUNK_SIZE = 10000; // Process in chunks
  private static readonly MAX_SAMPLE_SIZE = 1000; // Sample for analysis

  static async parseFileOptimized(
    file: File,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<CSVFile> {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      let columns: string[] = [];
      let rowCount = 0;
      let isFirstChunk = true;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        chunk: (chunk, parser) => {
          try {
            const data = chunk.data as Record<string, any>[];
            
            if (isFirstChunk) {
              columns = Object.keys(data[0] || {});
              isFirstChunk = false;
            }

            // Process chunk in smaller batches to avoid blocking
            this.processChunkAsync(data, results, () => {
              rowCount += data.length;
              
              if (onProgress) {
                onProgress({
                  loaded: rowCount,
                  total: file.size, // Approximate
                  percentage: Math.min((rowCount / 10000) * 100, 90) // Estimate
                });
              }
            });

          } catch (error) {
            parser.abort();
            reject(new Error(`Chunk processing error: ${error}`));
          }
        },
        complete: () => {
          try {
            const csvFile: CSVFile = {
              id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              data: results,
              columns,
              rowCount: results.length,
              uploadedAt: new Date(),
              metadata: {
                fileSize: file.size,
                processingTime: Date.now(),
                sampleSize: Math.min(results.length, this.MAX_SAMPLE_SIZE)
              }
            };

            if (onProgress) {
              onProgress({ loaded: results.length, total: results.length, percentage: 100 });
            }

            resolve(csvFile);
          } catch (error) {
            reject(new Error(`Final processing error: ${error}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  private static processChunkAsync(
    chunk: Record<string, any>[],
    results: Record<string, any>[],
    callback: () => void
  ): void {
    // Use setTimeout to yield control back to the main thread
    setTimeout(() => {
      results.push(...chunk);
      callback();
    }, 0);
  }

  static async detectRelationshipsOptimized(files: CSVFile[]): Promise<CSVFile[]> {
    if (files.length < 2) return files;

    const updatedFiles = files.map(file => ({ ...file, relationships: [] }));

    // Use Web Workers for relationship detection if available
    if (typeof Worker !== 'undefined') {
      return this.detectRelationshipsWithWorker(updatedFiles);
    }

    // Fallback to optimized main thread processing
    return this.detectRelationshipsMainThread(updatedFiles);
  }

  private static async detectRelationshipsWithWorker(files: CSVFile[]): Promise<CSVFile[]> {
    // For now, fallback to main thread - Web Worker implementation would go here
    return this.detectRelationshipsMainThread(files);
  }

  private static async detectRelationshipsMainThread(files: CSVFile[]): Promise<CSVFile[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const sourceFile = files[i];
            const targetFile = files[j];

            // Use sample data for relationship detection to improve performance
            const sourceSample = this.getSampleData(sourceFile.data, this.MAX_SAMPLE_SIZE);
            const targetSample = this.getSampleData(targetFile.data, this.MAX_SAMPLE_SIZE);

            for (const sourceColumn of sourceFile.columns) {
              for (const targetColumn of targetFile.columns) {
                const relationship = await this.analyzeColumnRelationshipOptimized(
                  { ...sourceFile, data: sourceSample },
                  { ...targetFile, data: targetSample },
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
        resolve(files);
      }, 0);
    });
  }

  private static getSampleData(data: Record<string, any>[], sampleSize: number): Record<string, any>[] {
    if (data.length <= sampleSize) return data;
    
    // Get stratified sample
    const step = Math.floor(data.length / sampleSize);
    const sample: Record<string, any>[] = [];
    
    for (let i = 0; i < data.length; i += step) {
      if (sample.length < sampleSize) {
        sample.push(data[i]);
      }
    }
    
    return sample;
  }

  private static async analyzeColumnRelationshipOptimized(
    sourceFile: CSVFile,
    targetFile: CSVFile,
    sourceColumn: string,
    targetColumn: string
  ): Promise<Relationship | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sourceValues = sourceFile.data.map(row => row[sourceColumn]).filter(v => v != null);
        const targetValues = targetFile.data.map(row => row[targetColumn]).filter(v => v != null);

        if (sourceValues.length === 0 || targetValues.length === 0) {
          resolve(null);
          return;
        }

        // Convert to strings for comparison
        const sourceSet = new Set(sourceValues.map(v => String(v).toLowerCase().trim()));
        const targetSet = new Set(targetValues.map(v => String(v).toLowerCase().trim()));

        // Find intersection
        const intersection = new Set([...sourceSet].filter(x => targetSet.has(x)));
        const matchingRows = intersection.size;

        if (matchingRows === 0) {
          resolve(null);
          return;
        }

        // Calculate confidence based on overlap
        const sourceUnique = sourceSet.size;
        const targetUnique = targetSet.size;
        const overlapRatio = matchingRows / Math.max(sourceUnique, targetUnique);
        
        // Boost confidence if column names are similar
        const namesSimilar = this.calculateStringSimilarity(sourceColumn, targetColumn) > 0.6;
        const confidence = namesSimilar ? Math.min(overlapRatio * 1.2, 1) : overlapRatio;

        if (confidence < 0.3) {
          resolve(null);
          return;
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

        resolve({
          id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sourceFile: sourceFile.id,
          targetFile: targetFile.id,
          sourceColumn,
          targetColumn,
          type,
          confidence,
          matchingRows
        });
      }, 0);
    });
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

  static async joinDatasetsOptimized(
    files: CSVFile[], 
    relationships: Relationship[]
  ): Promise<Record<string, any>[]> {
    if (files.length < 2 || relationships.length === 0) {
      return [];
    }

    return new Promise((resolve) => {
      setTimeout(() => {
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

        resolve(result);
      }, 0);
    });
  }
}