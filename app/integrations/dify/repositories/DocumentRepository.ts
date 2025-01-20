import axios, { AxiosInstance, AxiosError } from 'axios';
import { DifyError } from '../types/DifyError';

import {
  ICreateDocumentByTextRequest,
  ICreateDocumentByTextResponse,
  IUpdateDocumentByTextRequest,
  IUpdateDocumentByTextResponse,
  IGetDocumentsResponse,
  IDeleteDocumentResponse,
  IGetIndexingStatusResponse,
  IAddSegmentsRequest,
  IAddSegmentsResponse,
  IGetSegmentsResponse,
  IRetrieveRequest,
  IRetrieveResponse,
  IDeleteSegmentResponse,
  IUpdateSegmentRequest,
  IUpdateSegmentResponse,
} from '../types';

export class DocumentRepository {
  private apiClient: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }

  /**
   * ========== Create Document by Text ==========
   * POST /datasets/{dataset_id}/document/create-by-text
   */
  public async createDocumentByText(
    datasetId: string,
    data: ICreateDocumentByTextRequest
  ): Promise<ICreateDocumentByTextResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/document/create-by-text`;
      const response = await this.apiClient.post<ICreateDocumentByTextResponse>(endpoint, data);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Update Document by Text ==========
   * POST /datasets/{dataset_id}/documents/{document_id}/update-by-text
   */
  public async updateDocumentByText(
    datasetId: string,
    documentId: string,
    data: IUpdateDocumentByTextRequest
  ): Promise<IUpdateDocumentByTextResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}/update-by-text`;
      const response = await this.apiClient.post<IUpdateDocumentByTextResponse>(endpoint, data);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Get Document List ==========
   * GET /datasets/{dataset_id}/documents
   */
  public async getDocuments(
    datasetId: string,
    page = 1,
    limit = 20
  ): Promise<IGetDocumentsResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents`;
      const params: Record<string, any> = { page, limit };
      const response = await this.apiClient.get<IGetDocumentsResponse>(endpoint, { params });
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Delete a Document ==========
   * DELETE /datasets/{dataset_id}/documents/{document_id}
   */
  public async deleteDocument(
    datasetId: string,
    documentId: string
  ): Promise<IDeleteDocumentResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}`;
      const response = await this.apiClient.delete<IDeleteDocumentResponse>(endpoint);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Get Document Embedding Status ==========
   * GET /datasets/{dataset_id}/documents/{batch}/indexing-status
   */
  public async getIndexingStatus(
    datasetId: string,
    batch: string
  ): Promise<IGetIndexingStatusResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${batch}/indexing-status`;
      const response = await this.apiClient.get<IGetIndexingStatusResponse>(endpoint);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Add Chunks to a Document (Segments) ==========
   * POST /datasets/{dataset_id}/documents/{document_id}/segments
   */
  public async addDocumentSegments(
    datasetId: string,
    documentId: string,
    segments: IAddSegmentsRequest
  ): Promise<IAddSegmentsResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}/segments`;
      const response = await this.apiClient.post<IAddSegmentsResponse>(endpoint, segments);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== Get Chunks from a Document (Segments) ==========
   * GET /datasets/{dataset_id}/documents/{document_id}/segments
   */
  public async getDocumentSegments(
    datasetId: string,
    documentId: string,
    keyword?: string,
    status?: 'completed'
  ): Promise<IGetSegmentsResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}/segments`;
      const params: Record<string, any> = {};
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;

      const response = await this.apiClient.get<IGetSegmentsResponse>(endpoint, { params });
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== 10) Update a Chunk in a Document ==========
   * POST /datasets/{dataset_id}/documents/{document_id}/segments/{segment_id}
   */
  public async updateDocumentSegment(
    datasetId: string,
    documentId: string,
    segmentId: string,
    data: IUpdateSegmentRequest
  ): Promise<IUpdateSegmentResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`;
      const response = await this.apiClient.post<IUpdateSegmentResponse>(endpoint, data);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== 11) Delete a Chunk in a Document ==========
   * DELETE /datasets/{dataset_id}/documents/{document_id}/segments/{segment_id}
   */
  public async deleteDocumentSegment(
    datasetId: string,
    documentId: string,
    segmentId: string
  ): Promise<IDeleteSegmentResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`;
      const response = await this.apiClient.delete<IDeleteSegmentResponse>(endpoint);
      return response.data;
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * ========== 12) Retrieve Chunks from a Knowledge Base ==========
   * POST /datasets/{dataset_id}/retrieve
   */
  public async retrieve(
    datasetId: string,
    requestBody: IRetrieveRequest
  ): Promise<IRetrieveResponse> {
    try {
      const endpoint = `/datasets/${datasetId}/retrieve`;
      const response = await this.apiClient.post<IRetrieveResponse>(endpoint, requestBody);
      return response.data;
    } catch (err) {
      this.handleError(err);
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
      const data = axiosError.response?.data as { code?: string; message?: string; error?: any };

      console.error('[DocumentRepository] Error details:', {
        status: statusCode,
        statusText,
        data: axiosError.response?.data,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          headers: axiosError.config?.headers,
          data: axiosError.config?.data
        }
      });

      const errorMsg = data?.message || data?.error?.message || 'Document APIで不明なエラーが発生しました。';

      throw new DifyError(
        `[DocumentRepository] ${errorMsg} (status: ${statusCode} ${statusText ?? ''})`,
        data?.code || data?.error?.code || 'unknown',
        statusCode
      );
    } else if (err instanceof Error) {
      console.error('[DocumentRepository] Non-Axios error:', err);
      throw new DifyError(`[DocumentRepository] ${err.message}`, 'unknown');
    } else {
      console.error('[DocumentRepository] Unknown error:', err);
      throw new DifyError('[DocumentRepository] 不明なエラーが発生しました。', 'unknown');
    }
  }
}