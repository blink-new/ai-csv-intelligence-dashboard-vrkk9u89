import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Link, ArrowRight, Database, Eye, Download } from 'lucide-react';
import { CSVFile, Relationship } from '../types/csv';

interface RelationshipViewerProps {
  files: CSVFile[];
  onJoinData?: (relationships: Relationship[]) => void;
}

export const RelationshipViewer: React.FC<RelationshipViewerProps> = ({ files, onJoinData }) => {
  const allRelationships = files.flatMap(f => f.relationships || []);

  const getFileName = (fileId: string) => {
    return files.find(f => f.id === fileId)?.name || 'Unknown';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRelationshipTypeIcon = (type: Relationship['type']) => {
    switch (type) {
      case 'one-to-one':
        return '1:1';
      case 'one-to-many':
        return '1:N';
      case 'many-to-many':
        return 'N:N';
      default:
        return '?';
    }
  };

  if (allRelationships.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-gray-500">
            <Link className="mx-auto h-8 w-8 mb-2" />
            <p>No relationships detected</p>
            <p className="text-sm">Upload multiple CSV files to detect relationships</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Detected Relationships ({allRelationships.length})
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onJoinData?.(allRelationships)}
            >
              <Database className="h-4 w-4 mr-2" />
              Join Data
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allRelationships.map((relationship, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    {getRelationshipTypeIcon(relationship.type)}
                  </Badge>
                  <Badge 
                    className={`text-xs ${getConfidenceColor(relationship.confidence)}`}
                  >
                    {Math.round(relationship.confidence * 100)}% confidence
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {relationship.matchingRows} matches
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {getFileName(relationship.sourceFile)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Column: <code className="bg-gray-100 px-1 rounded">{relationship.sourceColumn}</code>
                  </div>
                </div>

                <div className="flex items-center px-4">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>

                <div className="flex-1 text-right">
                  <div className="font-medium text-sm text-gray-900">
                    {getFileName(relationship.targetFile)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Column: <code className="bg-gray-100 px-1 rounded">{relationship.targetColumn}</code>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-600">
                  <strong>Relationship Type:</strong> {relationship.type.replace('-', ' to ')}
                  <span className="ml-4">
                    <strong>Matching Rows:</strong> {relationship.matchingRows}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Relationship Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Relationship Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {allRelationships.filter(r => r.type === 'one-to-one').length}
              </div>
              <div className="text-blue-800">One-to-One</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {allRelationships.filter(r => r.type === 'one-to-many').length}
              </div>
              <div className="text-blue-800">One-to-Many</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {allRelationships.filter(r => r.type === 'many-to-many').length}
              </div>
              <div className="text-blue-800">Many-to-Many</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};