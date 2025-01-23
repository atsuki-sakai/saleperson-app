
import axios, { AxiosInstance } from 'axios';
import { DatasetRepository } from './repositories/DatasetRepository';
import { DocumentRepository } from './repositories/DocumentRepository';
// import { SegmentRepository } from './repositories/SegmentRepository';

export class DifyService {
  public dataset: DatasetRepository;
  public document: DocumentRepository;

  private apiClient: AxiosInstance;

  constructor(apiKey: string, baseURL: string) {
    this.apiClient = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.dataset = new DatasetRepository(this.apiClient);
    this.document = new DocumentRepository(this.apiClient);
  
  }
}