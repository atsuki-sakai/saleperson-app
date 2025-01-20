
import axios, { AxiosInstance } from 'axios';
import { DatasetRepository } from './repositories/DatasetRepository';
import { DocumentRepository } from './repositories/DocumentRepository';
// import { SegmentRepository } from './repositories/SegmentRepository';

export class DifyService {
  public dataset: DatasetRepository;
  public document: DocumentRepository;
  // public segment: SegmentRepository;

  private apiClient: AxiosInstance;

  /**
   * @param apiKey  Dify のAPIキー
   * @param baseURL Dify APIのベースURL (例: "https://api.dify.ai/v1")
   */
  constructor(apiKey: string, baseURL: string) {
    this.apiClient = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // リポジトリのインスタンス化
    this.dataset = new DatasetRepository(this.apiClient);
    this.document = new DocumentRepository(this.apiClient);
    // this.segment = new SegmentRepository(this.apiClient);
  }
}