import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Database, Link, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { CSVFile } from '../types/csv';
import { OptimizedCSVParser } from '../services/optimizedCSVParser';

interface CSVUploaderProps {
  onFilesUploaded: (files: CSVFile[]) => void;
  uploadedFiles: CSVFile[];
  onFileRemove?: (fileId: string) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onFilesUploaded, uploadedFiles, onFileRemove }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const csvFiles: CSVFile[] = [];
      
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setUploadProgress((i / acceptedFiles.length) * 50);
        
        const parsedFile = await OptimizedCSVParser.parseFileOptimized(file, (progress) => {
          const overallProgress = ((i / acceptedFiles.length) * 50) + (progress.percentage * 0.5);
          setUploadProgress(overallProgress);
        });
        csvFiles.push(parsedFile);
      }

      setUploadProgress(75);

      // Detect relationships between all files (including existing ones)
      const allFiles = [...uploadedFiles, ...csvFiles];
      const updatedFiles = await OptimizedCSVParser.detectRelationshipsOptimized(allFiles);
      
      // Update the new files with relationship information from the detection
      csvFiles.forEach((file, index) => {
        const updatedFile = updatedFiles.find(f => f.name === file.name && f.data.length === file.data.length);
        if (updatedFile) {
          file.relationships = updatedFile.relationships;
        }
      });

      setUploadProgress(100);
      onFilesUploaded(csvFiles);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFilesUploaded, uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    if (onFileRemove) {
      onFileRemove(fileId);
    } else {
      // Fallback to old behavior
      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
      onFilesUploaded(updatedFiles);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors upload-zone ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload CSV Files
            </h3>
            <p className="text-gray-500 mb-4">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag & drop CSV files here, or click to select files'}
            </p>
            <p className="text-sm text-gray-400">
              Supports multiple files • Automatic relationship detection
            </p>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Processing files...</span>
                <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Uploaded Files ({uploadedFiles.length})
              </h3>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {uploadedFiles.reduce((sum, f) => sum + f.rowCount, 0)} total rows
              </Badge>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{file.rowCount} rows</span>
                        <span>{file.columns.length} columns</span>
                        {file.relationships && file.relationships.length > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            {file.relationships.length} relationships
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {file.schema?.filter(s => s.type === 'id').length || 0} ID columns
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Relationship Summary */}
            {uploadedFiles.some(f => f.relationships && f.relationships.length > 0) && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Detected Relationships
                </h4>
                <div className="space-y-2">
                  {uploadedFiles.flatMap(f => f.relationships || []).map((rel, index) => {
                    const sourceFile = uploadedFiles.find(f => f.id === rel.sourceFile);
                    const targetFile = uploadedFiles.find(f => f.id === rel.targetFile);
                    return (
                      <div key={index} className="text-sm text-blue-800">
                        <span className="font-medium">{sourceFile?.name}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">{targetFile?.name}</span>
                        <span className="ml-2 text-blue-600">
                          ({rel.sourceColumn} ↔ {rel.targetColumn})
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {Math.round(rel.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};