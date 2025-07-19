import { CSVFile } from '../types/csv';

export interface DatasetUrl {
  id: string;
  datasetId: string;
  url: string;
  name: string;
  createdAt: Date;
  accessCount: number;
}

export class DatasetUrlService {
  private static instance: DatasetUrlService;
  private urls: Map<string, DatasetUrl> = new Map();

  static getInstance(): DatasetUrlService {
    if (!DatasetUrlService.instance) {
      DatasetUrlService.instance = new DatasetUrlService();
    }
    return DatasetUrlService.instance;
  }

  generateUniqueUrl(file: CSVFile): DatasetUrl {
    const urlId = this.generateUrlId();
    const datasetUrl: DatasetUrl = {
      id: urlId,
      datasetId: file.id,
      url: `${window.location.origin}/dataset/${urlId}`,
      name: file.name,
      createdAt: new Date(),
      accessCount: 0
    };

    this.urls.set(urlId, datasetUrl);
    return datasetUrl;
  }

  getDatasetByUrl(urlId: string): DatasetUrl | null {
    const datasetUrl = this.urls.get(urlId);
    if (datasetUrl) {
      datasetUrl.accessCount++;
      return datasetUrl;
    }
    return null;
  }

  getAllUrls(): DatasetUrl[] {
    return Array.from(this.urls.values());
  }

  getUrlsForDataset(datasetId: string): DatasetUrl[] {
    return Array.from(this.urls.values()).filter(url => url.datasetId === datasetId);
  }

  deleteUrl(urlId: string): boolean {
    return this.urls.delete(urlId);
  }

  deleteUrlsForDataset(datasetId: string): void {
    const urlsToDelete = this.getUrlsForDataset(datasetId);
    urlsToDelete.forEach(url => this.urls.delete(url.id));
  }

  private generateUrlId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Share functionality
  shareDataset(file: CSVFile): { url: string; shareText: string } {
    const datasetUrl = this.generateUniqueUrl(file);
    const shareText = `Check out this dataset: ${file.name} (${file.rowCount} rows, ${file.columns.length} columns)`;
    
    return {
      url: datasetUrl.url,
      shareText
    };
  }

  // Copy to clipboard
  async copyUrlToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      return false;
    }
  }
}