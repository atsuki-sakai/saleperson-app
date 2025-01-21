
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DifyError } from '../types/DifyError';
import { summaryObjectToText } from '../../helper/converter';
import {
  ICreateDatasetRequest,
  ICreateDatasetResponse,
  IGetDatasetsResponse,
} from '../types';

export class DatasetRepository {
  private apiClient: AxiosInstance;
  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }


  /**
   * ========== Create Empty Dataset ==========
   * POST /datasets
   */
  public async createDataset(data: ICreateDatasetRequest): Promise<ICreateDatasetResponse> {
    try {
      const response = await this.apiClient.post<ICreateDatasetResponse>('/datasets', data);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }
  /**
   * ========== Get Datasets ==========
   * GET /datasets
   */
  public async getDatasets(page = 1, limit = 20): Promise<IGetDatasetsResponse> {
    try {
      const response = await this.apiClient.get<IGetDatasetsResponse>('/datasets', {
        params: { page, limit },
      });
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Delete Dataset ==========
   * DELETE /datasets/{dataset_id}
   */
  public async deleteDataset(datasetId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/datasets/${datasetId}`);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ## Beta版 機能 ##
   * POST /chat-messages 商品のサマリーとターゲットを生成する為のエンドポイント
   * 
   * FEATURE - サマリーを登録時に生成することで回答精度を上げられないか？ 
   * Difyへ送ってサマリーを生成し、最終的に連結したテキストを返す
   * ※商品数が多いと時間がかかり、大量のトークンを埋め込みと生成に使用するので注意(Deepseek推奨)
   * 
   */
  public async generateSummaryAndTargets(productText: string) {
    try {
      const response = await this.apiClient.post('/chat-messages', {
        inputs: {},
        query: productText,
        response_mode: "blocking",
        user: "system",
      });
      const summary = summaryObjectToText(response.data);
      return summary;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * ========== 共通エラーハンドリング ==========
   */
  private handleError(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError;
      const statusCode = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;
      const data = axiosError.response?.data as { code?: string; message?: string };

      const errorMsg = data?.message || 'Dataset APIで不明なエラーが発生しました。';
      throw new DifyError(
        `[DatasetRepository] ${errorMsg} (status: ${statusCode} ${statusText ?? ''})`,
        data?.code,
        statusCode
      );
    } else {
      throw new DifyError('[DatasetRepository] 不明なエラーが発生しました。');
    }
  }
}
